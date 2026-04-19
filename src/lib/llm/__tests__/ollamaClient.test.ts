import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const callOrder: string[] = [];
const eventHandlers = new Map<string, (event: { payload: unknown }) => void>();
const unlistenSpies: Array<ReturnType<typeof vi.fn>> = [];
const invokeMock = vi.fn<
  (command: string, args?: Record<string, unknown>) => Promise<unknown>
>();
const listenMock = vi.fn(
  async (
    eventName: string,
    handler: (event: { payload: unknown }) => void
  ): Promise<() => void> => {
    callOrder.push(`listen:${eventName}`);
    eventHandlers.set(eventName, handler);
    const unlisten = vi.fn();
    unlistenSpies.push(unlisten);
    return unlisten;
  }
);

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, args?: Record<string, unknown>) => {
    callOrder.push(`invoke:${command}`);
    return invokeMock(command, args);
  }
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (
    eventName: string,
    handler: (event: { payload: unknown }) => void
  ) => listenMock(eventName, handler)
}));

import {
  OLLAMA_CHAT_MODEL,
  OLLAMA_EMBED_MODEL,
  cancelStream,
  embed,
  streamChat
} from "../ollamaClient";

function emit(eventName: string, payload: unknown): void {
  const handler = eventHandlers.get(eventName);

  if (!handler) {
    throw new Error(`missing event handler for ${eventName}`);
  }

  handler({ payload });
}

describe("ollamaClient", () => {
  beforeEach(() => {
    callOrder.length = 0;
    eventHandlers.clear();
    unlistenSpies.length = 0;
    invokeMock.mockReset();
    listenMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches listeners before invoking ollama_chat", async () => {
    invokeMock.mockResolvedValue(undefined);

    const handle = await streamChat({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(handle.requestId).toBeTruthy();
    expect(callOrder.slice(0, 3)).toEqual([
      `listen:ollama:chunk:${handle.requestId}`,
      `listen:ollama:done:${handle.requestId}`,
      "invoke:ollama_chat"
    ]);
  });

  it("streams chunks, aggregates them, and cleans up listeners on success", async () => {
    invokeMock.mockResolvedValue(undefined);
    const onChunk = vi.fn();

    const handle = await streamChat({
      messages: [{ role: "user", content: "hello" }],
      onChunk
    });

    emit(`ollama:chunk:${handle.requestId}`, { text: "Hel" });
    emit(`ollama:chunk:${handle.requestId}`, { text: "lo " });
    emit(`ollama:chunk:${handle.requestId}`, { text: "world" });
    emit(`ollama:done:${handle.requestId}`, { ok: true });

    await expect(handle.completion).resolves.toBe("Hello world");
    expect(onChunk.mock.calls.map(([chunk]) => chunk)).toEqual([
      "Hel",
      "lo ",
      "world"
    ]);
    expect(unlistenSpies).toHaveLength(2);
    expect(unlistenSpies[0]).toHaveBeenCalledTimes(1);
    expect(unlistenSpies[1]).toHaveBeenCalledTimes(1);
  });

  it("maps done event failures into OllamaError", async () => {
    invokeMock.mockResolvedValue(undefined);

    const handle = await streamChat({
      messages: [{ role: "user", content: "hello" }]
    });

    emit(`ollama:done:${handle.requestId}`, {
      ok: false,
      error: { code: "TRANSPORT", message: "upstream" }
    });

    await expect(handle.completion).rejects.toMatchObject({
      name: "OllamaError",
      code: "TRANSPORT",
      message: "upstream"
    });
    expect(unlistenSpies[0]).toHaveBeenCalledTimes(1);
    expect(unlistenSpies[1]).toHaveBeenCalledTimes(1);
  });

  it("requests cancellation through cancel_stream and waits for the done event", async () => {
    invokeMock.mockImplementation(async (command) => {
      if (command === "cancel_stream") {
        return undefined;
      }

      return undefined;
    });

    const controller = new AbortController();
    const handle = await streamChat({
      messages: [{ role: "user", content: "hello" }],
      signal: controller.signal
    });

    controller.abort();
    await Promise.resolve();

    expect(invokeMock).toHaveBeenCalledWith("cancel_stream", {
      requestId: handle.requestId
    });

    emit(`ollama:done:${handle.requestId}`, {
      ok: false,
      error: { code: "ABORTED", message: "aborted" }
    });

    await expect(handle.completion).rejects.toMatchObject({
      code: "ABORTED",
      message: "aborted"
    });
    expect(unlistenSpies[0]).toHaveBeenCalledTimes(1);
    expect(unlistenSpies[1]).toHaveBeenCalledTimes(1);
  });

  it("maps invoke-level failures into transport errors", async () => {
    invokeMock.mockRejectedValue(new Error("bridge down"));

    const handle = await streamChat({
      messages: [{ role: "user", content: "hello" }]
    });

    await expect(handle.completion).rejects.toMatchObject({
      code: "TRANSPORT",
      message: "failed to invoke ollama_chat"
    });
  });

  it("uses the bridge for embeddings with the default model", async () => {
    invokeMock.mockResolvedValue([0.1, 0.2, 0.3]);

    await expect(embed({ input: "memory text" })).resolves.toEqual([
      0.1,
      0.2,
      0.3
    ]);

    expect(invokeMock).toHaveBeenCalledWith("ollama_embed", {
      model: OLLAMA_EMBED_MODEL,
      input: "memory text"
    });
  });

  it("maps embedding bridge failures into OllamaError", async () => {
    invokeMock.mockRejectedValue({
      code: "TRANSPORT",
      message: "network transport error"
    });

    await expect(embed({ input: "memory text" })).rejects.toMatchObject({
      name: "OllamaError",
      code: "TRANSPORT",
      message: "network transport error"
    });
  });

  it("rejects invalid generated request ids", async () => {
    invokeMock.mockResolvedValue(undefined);

    await expect(
      streamChat({
        requestId: "",
        messages: [{ role: "user", content: "hello" }]
      })
    ).rejects.toMatchObject({
      name: "OllamaError",
      code: "INVALID_REQUEST_ID"
    });
  });

  it("supports explicit cancellation by request id", async () => {
    invokeMock.mockResolvedValue(undefined);

    await cancelStream("valid_req_123");

    expect(invokeMock).toHaveBeenCalledWith("cancel_stream", {
      requestId: "valid_req_123"
    });
  });

  it("uses the default chat model when none is provided", async () => {
    invokeMock.mockResolvedValue(undefined);

    const handle = await streamChat({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(invokeMock).toHaveBeenCalledWith(
      "ollama_chat",
      expect.objectContaining({
        model: OLLAMA_CHAT_MODEL
      })
    );

    emit(`ollama:done:${handle.requestId}`, { ok: true });
    await handle.completion;
  });
});
