import { invoke } from "@tauri-apps/api/core";
import { listen, type Event } from "@tauri-apps/api/event";

export const OLLAMA_CHAT_MODEL = "llama3.2";
export const OLLAMA_EMBED_MODEL = "nomic-embed-text";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface StructuredError {
  code: string;
  message: string;
}

interface ChunkPayload {
  text: string;
}

interface DonePayload {
  ok: boolean;
  error?: StructuredError;
}

export type OllamaErrorCode =
  | "TIMEOUT"
  | "ABORTED"
  | "INVALID_OUTPUT"
  | "TRANSPORT"
  | "UPSTREAM_ERROR"
  | "INVALID_REQUEST_ID"
  | "INTERNAL";

export class OllamaError extends Error {
  constructor(
    public code: OllamaErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "OllamaError";
  }
}

export interface StreamChatOptions {
  model?: string;
  messages: ChatMessage[];
  requestId?: string;
  onChunk?: (text: string) => void;
  signal?: AbortSignal;
  format?: Record<string, unknown>;
}

export interface StreamChatHandle {
  requestId: string;
  completion: Promise<string>;
  cancel: () => Promise<void>;
}

export interface EmbedOptions {
  model?: string;
  input: string | string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStructuredError(value: unknown): value is StructuredError {
  return (
    isObject(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

function parseChunkPayload(payload: unknown): ChunkPayload {
  if (!isObject(payload) || typeof payload.text !== "string") {
    throw new OllamaError("INTERNAL", "invalid chunk payload", payload);
  }

  return { text: payload.text };
}

function parseDonePayload(payload: unknown): DonePayload {
  if (!isObject(payload) || typeof payload.ok !== "boolean") {
    throw new OllamaError("INTERNAL", "invalid completion payload", payload);
  }

  if (
    payload.error !== undefined &&
    payload.error !== null &&
    !isStructuredError(payload.error)
  ) {
    throw new OllamaError("INTERNAL", "invalid completion error payload", payload);
  }

  return {
    ok: payload.ok,
    error: isStructuredError(payload.error) ? payload.error : undefined
  };
}

function mapErrorCode(code: string): OllamaErrorCode {
  switch (code) {
    case "TIMEOUT":
    case "ABORTED":
    case "TRANSPORT":
    case "UPSTREAM_ERROR":
    case "INVALID_REQUEST_ID":
    case "INTERNAL":
      return code;
    default:
      return "INTERNAL";
  }
}

function toOllamaError(error: unknown): OllamaError {
  if (error instanceof OllamaError) {
    return error;
  }

  if (isStructuredError(error)) {
    return new OllamaError(mapErrorCode(error.code), error.message, error);
  }

  if (error instanceof Error) {
    return new OllamaError("TRANSPORT", error.message, error);
  }

  return new OllamaError("INTERNAL", "unexpected ollama bridge failure", error);
}

function createFallbackRequestId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function createRequestId(): string {
  const requestId =
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : createFallbackRequestId();

  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new OllamaError(
      "INVALID_REQUEST_ID",
      "request_id must be 8-128 chars, [A-Za-z0-9_-]",
      requestId
    );
  }

  return requestId;
}

function validateRequestId(requestId: string): string {
  if (!REQUEST_ID_PATTERN.test(requestId)) {
    throw new OllamaError(
      "INVALID_REQUEST_ID",
      "request_id must be 8-128 chars, [A-Za-z0-9_-]",
      requestId
    );
  }

  return requestId;
}

export async function cancelStream(requestId: string): Promise<void> {
  await invoke("cancel_stream", { requestId: validateRequestId(requestId) });
}

export async function streamChat(
  options: StreamChatOptions
): Promise<StreamChatHandle> {
  const requestId = validateRequestId(options.requestId ?? createRequestId());
  const model = options.model ?? OLLAMA_CHAT_MODEL;
  const accumulatedChunks: string[] = [];

  let settled = false;
  let unlistenChunk: (() => void) | null = null;
  let unlistenDone: (() => void) | null = null;
  let removeAbortListener = () => {};

  const cleanup = (): void => {
    if (unlistenChunk) {
      unlistenChunk();
      unlistenChunk = null;
    }

    if (unlistenDone) {
      unlistenDone();
      unlistenDone = null;
    }

    removeAbortListener();
  };

  let resolveCompletion!: (value: string) => void;
  let rejectCompletion!: (error: OllamaError) => void;

  const completion = new Promise<string>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });

  const finish = (result: { ok: true; value: string } | { ok: false; error: OllamaError }) => {
    if (settled) {
      return;
    }

    settled = true;
    cleanup();

    if (result.ok) {
      resolveCompletion(result.value);
    } else {
      rejectCompletion(result.error);
    }
  };

  const onChunkEvent = (event: Event<unknown>): void => {
    try {
      const payload = parseChunkPayload(event.payload);
      accumulatedChunks.push(payload.text);
      options.onChunk?.(payload.text);
    } catch (error) {
      finish({ ok: false, error: toOllamaError(error) });
    }
  };

  const onDoneEvent = (event: Event<unknown>): void => {
    try {
      const payload = parseDonePayload(event.payload);

      if (payload.ok) {
        finish({ ok: true, value: accumulatedChunks.join("") });
        return;
      }

      finish({
        ok: false,
        error: new OllamaError(
          mapErrorCode(payload.error?.code ?? "INTERNAL"),
          payload.error?.message ?? "stream failed without an error payload",
          payload.error
        )
      });
    } catch (error) {
      finish({ ok: false, error: toOllamaError(error) });
    }
  };

  try {
    unlistenChunk = await listen(`ollama:chunk:${requestId}`, onChunkEvent);
    unlistenDone = await listen(`ollama:done:${requestId}`, onDoneEvent);
  } catch (error) {
    cleanup();
    throw new OllamaError("TRANSPORT", "failed to attach stream listeners", error);
  }

  const abortListener = (): void => {
    void cancelStream(requestId).catch(() => {
      // Wait for the done event to surface the normalized terminal state.
    });
  };

  if (options.signal) {
    if (options.signal.aborted) {
      abortListener();
    } else {
      options.signal.addEventListener("abort", abortListener, { once: true });
      removeAbortListener = () => {
        options.signal?.removeEventListener("abort", abortListener);
      };
    }
  }

  try {
    void invoke("ollama_chat", {
      requestId,
      model,
      messages: options.messages,
      format: options.format
    }).catch((error: unknown) => {
      if (!settled) {
        finish({
          ok: false,
          error: new OllamaError("TRANSPORT", "failed to invoke ollama_chat", error)
        });
      }
    });
  } catch (error) {
    finish({
      ok: false,
      error: new OllamaError("TRANSPORT", "failed to invoke ollama_chat", error)
    });
  }

  return {
    requestId,
    completion,
    cancel: () => cancelStream(requestId)
  };
}

async function invokeEmbedSingle(model: string, input: string): Promise<number[]> {
  try {
    const vector = await invoke<number[]>("ollama_embed", {
      model,
      input
    });

    if (!Array.isArray(vector) || !vector.every((value) => typeof value === "number")) {
      throw new OllamaError("INTERNAL", "invalid embedding payload", vector);
    }

    return vector;
  } catch (error) {
    throw toOllamaError(error);
  }
}

export async function embed(options: { model?: string; input: string }): Promise<number[]>;
export async function embed(options: { model?: string; input: string[] }): Promise<number[][]>;
export async function embed(
  options: EmbedOptions
): Promise<number[] | number[][]> {
  const model = options.model ?? OLLAMA_EMBED_MODEL;

  if (typeof options.input === "string") {
    return invokeEmbedSingle(model, options.input);
  }

  return Promise.all(options.input.map((input) => invokeEmbedSingle(model, input)));
}
