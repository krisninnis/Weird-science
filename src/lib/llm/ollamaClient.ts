/**
 * Ollama client — the local "memory brain".
 *
 * Handles:
 *  - Structured memory extraction (JSON schema enforced)
 *  - Embeddings for semantic retrieval
 *  - Summarisation
 *
 * Never speaks to the user directly. That's the hosted model's job.
 */

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2';
const DEFAULT_EMBED_MODEL = 'nomic-embed-text';

export interface OllamaConfig {
  baseUrl?: string;
  extractionModel?: string;
  embeddingModel?: string;
}

export interface OllamaStructuredRequest<T> {
  prompt: string;
  system?: string;
  schema: Record<string, unknown>; // JSON schema
  validate: (raw: unknown) => T; // throws on invalid
  model?: string;
}

export class OllamaClient {
  private baseUrl: string;
  private extractionModel: string;
  private embeddingModel: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.extractionModel = config.extractionModel ?? DEFAULT_MODEL;
    this.embeddingModel = config.embeddingModel ?? DEFAULT_EMBED_MODEL;
  }

  /**
   * Ask the local model for a structured JSON response and validate it.
   * Uses Ollama's `format` field for JSON-schema-constrained output.
   */
  async structured<T>(req: OllamaStructuredRequest<T>): Promise<T> {
    const body = {
      model: req.model ?? this.extractionModel,
      prompt: req.prompt,
      system: req.system,
      stream: false,
      format: req.schema,
    };

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Ollama generate failed: ${res.status} ${res.statusText}`);
    }

    const payload = (await res.json()) as { response: string };
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.response);
    } catch (err) {
      throw new Error(`Ollama returned non-JSON response: ${payload.response}`);
    }
    return req.validate(parsed);
  }

  /**
   * Get an embedding vector for semantic retrieval.
   */
  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text,
      }),
    });
    if (!res.ok) throw new Error(`Ollama embed failed: ${res.status}`);
    const payload = (await res.json()) as { embedding: number[] };
    return payload.embedding;
  }

  /**
   * Check whether the local Ollama server is reachable.
   * Used to gate features gracefully when the user hasn't set it up yet.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const ollama = new OllamaClient();
