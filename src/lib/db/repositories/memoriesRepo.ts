import { z } from "zod";
import type {
  MemoryRecord,
  MemoryStatus,
  MemorySubject,
  MemoryType,
  MemoryValence,
} from "@/features/memory/memoryTypes";
import {
  clamp01,
  decodeEmbedding,
  encodeEmbedding,
  type RepositoryDatabase,
} from "../sqlite";
import {
  RepositoryError,
  memoryRowSchema,
  parseTableRow,
  parseTableRows,
} from "../rowSchemas";

const stringArraySchema = z.array(z.string());

const memoryInputSchema = z.object({
  companionId: z.string(),
  type: z.enum([
    "fact",
    "preference",
    "routine",
    "emotional_event",
    "milestone",
    "promise",
    "boundary",
    "unresolved_issue",
    "shared_story",
    "shared_language",
    "companion_self_update",
  ]),
  summary: z.string().min(1),
  detail: z.string().min(1),
  subject: z.enum(["user", "companion", "relationship", "external_person"]),
  importance: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
  valence: z.enum(["positive", "negative", "mixed", "neutral"]),
  sourceMessageIds: stringArraySchema,
  tags: stringArraySchema,
  expiresAt: z.string().nullable().optional(),
  userEditable: z.boolean(),
  pinned: z.boolean(),
  status: z.enum(["active", "archived", "superseded", "needs_review"]),
  embedding: z.array(z.number()).optional(),
  embeddingModel: z.string().optional(),
});

export type NewMemoryInput = {
  companionId: string;
  type: MemoryType;
  summary: string;
  detail: string;
  subject: MemorySubject;
  importance: number;
  confidence: number;
  valence: MemoryValence;
  sourceMessageIds: string[];
  tags: string[];
  expiresAt?: string | null;
  userEditable: boolean;
  pinned: boolean;
  status: MemoryStatus;
  embedding?: number[];
  embeddingModel?: string;
};

function parseJsonStringArray(value: string, field: string): string[] {
  const parsed = stringArraySchema.safeParse(JSON.parse(value));

  if (!parsed.success) {
    throw new RepositoryError(
      "ROW_SHAPE_INVALID",
      "memories",
      `Invalid JSON array in memories.${field}`,
      parsed.error
    );
  }

  return parsed.data;
}

function toMemoryRecord(row: unknown): MemoryRecord {
  const parsed = parseTableRow("memories", memoryRowSchema, row);

  return {
    id: parsed.id,
    companionId: parsed.companion_id,
    type: parsed.type,
    summary: parsed.summary,
    detail: parsed.detail,
    subject: parsed.subject,
    importance: parsed.importance as MemoryRecord["importance"],
    confidence: parsed.confidence,
    valence: parsed.valence,
    sourceMessageIds: parseJsonStringArray(
      parsed.source_message_ids,
      "source_message_ids"
    ),
    tags: parseJsonStringArray(parsed.tags, "tags"),
    createdAt: parsed.created_at,
    lastReferencedAt: parsed.last_referenced_at,
    expiresAt: parsed.expires_at,
    userEditable: parsed.user_editable === 1,
    pinned: parsed.pinned === 1,
    status: parsed.status,
    reinforcementCount: parsed.reinforcement_count,
    fadeFactor: parsed.fade_factor,
    referenceCount: parsed.reference_count,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return -1;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return -1;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function buildFilterClause(
  filters?: { types?: MemoryType[]; companionId?: string },
  requireEmbedding = false
): { whereClause: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (requireEmbedding) {
    clauses.push("embedding IS NOT NULL");
  }

  if (filters?.companionId) {
    clauses.push("companion_id = ?");
    params.push(filters.companionId);
  }

  if (filters?.types?.length) {
    clauses.push(`type IN (${filters.types.map(() => "?").join(", ")})`);
    params.push(...filters.types);
  }

  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function assertPositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RepositoryError(
      "INVALID_INPUT",
      "memories",
      `${field} must be a positive integer`
    );
  }

  return value;
}

export function createMemoriesRepo(db: RepositoryDatabase) {
  return {
    async insert(input: NewMemoryInput): Promise<MemoryRecord> {
      const parsedInput = memoryInputSchema.safeParse(input);

      if (!parsedInput.success) {
        throw new RepositoryError(
          "INVALID_INPUT",
          "memories",
          "Invalid memory input",
          parsedInput.error
        );
      }

      const now = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(),
        companion_id: parsedInput.data.companionId,
        type: parsedInput.data.type,
        summary: parsedInput.data.summary,
        detail: parsedInput.data.detail,
        subject: parsedInput.data.subject,
        importance: parsedInput.data.importance,
        confidence: parsedInput.data.confidence,
        valence: parsedInput.data.valence,
        source_message_ids: JSON.stringify(parsedInput.data.sourceMessageIds),
        tags: JSON.stringify(parsedInput.data.tags),
        created_at: now,
        last_referenced_at: null,
        expires_at: parsedInput.data.expiresAt ?? null,
        user_editable: parsedInput.data.userEditable ? 1 : 0,
        pinned: parsedInput.data.pinned ? 1 : 0,
        status: parsedInput.data.status,
        reinforcement_count: 0,
        fade_factor: 1,
        reference_count: 0,
        embedding: parsedInput.data.embedding
          ? encodeEmbedding(parsedInput.data.embedding)
          : null,
        embedding_model: parsedInput.data.embeddingModel ?? null,
      };

      await db.execute(
        `
        INSERT INTO memories (
          id,
          companion_id,
          type,
          summary,
          detail,
          subject,
          importance,
          confidence,
          valence,
          source_message_ids,
          tags,
          created_at,
          last_referenced_at,
          expires_at,
          user_editable,
          pinned,
          status,
          reinforcement_count,
          fade_factor,
          reference_count,
          embedding,
          embedding_model
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          row.id,
          row.companion_id,
          row.type,
          row.summary,
          row.detail,
          row.subject,
          row.importance,
          row.confidence,
          row.valence,
          row.source_message_ids,
          row.tags,
          row.created_at,
          row.last_referenced_at,
          row.expires_at,
          row.user_editable,
          row.pinned,
          row.status,
          row.reinforcement_count,
          row.fade_factor,
          row.reference_count,
          row.embedding,
          row.embedding_model,
        ]
      );

      return toMemoryRecord(row);
    },

    async getById(id: string): Promise<MemoryRecord | null> {
      const rows = await db.select<unknown[]>(
        `
        SELECT
          id,
          companion_id,
          type,
          summary,
          detail,
          subject,
          importance,
          confidence,
          valence,
          source_message_ids,
          tags,
          created_at,
          last_referenced_at,
          expires_at,
          user_editable,
          pinned,
          status,
          reinforcement_count,
          fade_factor,
          reference_count,
          embedding,
          embedding_model
        FROM memories
        WHERE id = ?
        LIMIT 1
        `,
        [id]
      );

      return rows.length ? toMemoryRecord(rows[0]) : null;
    },

    async searchByText(
      query: string,
      limit: number,
      companionId?: string
    ): Promise<MemoryRecord[]> {
      const safeLimit = assertPositiveInteger(limit, "limit");
      const clauses = ["(summary LIKE ? OR detail LIKE ?)"];
      const params: unknown[] = [`%${query}%`, `%${query}%`];

      if (companionId) {
        clauses.push("companion_id = ?");
        params.push(companionId);
      }

      const rows = await db.select<unknown[]>(
        `
        SELECT
          id,
          companion_id,
          type,
          summary,
          detail,
          subject,
          importance,
          confidence,
          valence,
          source_message_ids,
          tags,
          created_at,
          last_referenced_at,
          expires_at,
          user_editable,
          pinned,
          status,
          reinforcement_count,
          fade_factor,
          reference_count,
          embedding,
          embedding_model
        FROM memories
        WHERE ${clauses.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT ?
        `,
        [...params, safeLimit]
      );

      return parseTableRows("memories", memoryRowSchema, rows).map(toMemoryRecord);
    },

    async topKByEmbedding(
      vec: number[],
      k: number,
      filters?: { types?: MemoryType[]; companionId?: string }
    ): Promise<Array<MemoryRecord & { similarity: number }>> {
      const safeLimit = assertPositiveInteger(k, "k");
      const { whereClause, params } = buildFilterClause(filters, true);

      const rows = await db.select<unknown[]>(
        `
        SELECT
          id,
          companion_id,
          type,
          summary,
          detail,
          subject,
          importance,
          confidence,
          valence,
          source_message_ids,
          tags,
          created_at,
          last_referenced_at,
          expires_at,
          user_editable,
          pinned,
          status,
          reinforcement_count,
          fade_factor,
          reference_count,
          embedding,
          embedding_model
        FROM memories
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 2000
        `,
        params
      );

      const parsedRows = parseTableRows("memories", memoryRowSchema, rows);

      // TODO: migrate to sqlite-vec when plugin support lands.
      return parsedRows
        .map((row) => ({
          ...toMemoryRecord(row),
          similarity:
            row.embedding instanceof Uint8Array
              ? cosineSimilarity(vec, decodeEmbedding(row.embedding))
              : -1,
        }))
        .filter((memory) => memory.similarity >= 0)
        .sort((left, right) => right.similarity - left.similarity)
        .slice(0, safeLimit);
    },

    async updateEmbedding(id: string, vec: number[], model: string): Promise<void> {
      if (!vec.length) {
        throw new RepositoryError(
          "INVALID_INPUT",
          "memories",
          "embedding vector must not be empty"
        );
      }

      await db.execute(
        `
        UPDATE memories
        SET embedding = ?, embedding_model = ?
        WHERE id = ?
        `,
        [encodeEmbedding(vec), model, id]
      );
    },

    async incrementReinforcement(id: string): Promise<void> {
      await db.execute(
        `
        UPDATE memories
        SET reinforcement_count = reinforcement_count + 1
        WHERE id = ?
        `,
        [id]
      );
    },

    async updateFadeFactor(id: string, fadeFactor: number): Promise<void> {
      await db.execute(
        `
        UPDATE memories
        SET fade_factor = ?
        WHERE id = ?
        `,
        [clamp01(fadeFactor), id]
      );
    },

    async listByType(
      type: MemoryType,
      limit: number,
      companionId?: string
    ): Promise<MemoryRecord[]> {
      const safeLimit = assertPositiveInteger(limit, "limit");
      const clauses = ["type = ?"];
      const params: unknown[] = [type];

      if (companionId) {
        clauses.push("companion_id = ?");
        params.push(companionId);
      }

      const rows = await db.select<unknown[]>(
        `
        SELECT
          id,
          companion_id,
          type,
          summary,
          detail,
          subject,
          importance,
          confidence,
          valence,
          source_message_ids,
          tags,
          created_at,
          last_referenced_at,
          expires_at,
          user_editable,
          pinned,
          status,
          reinforcement_count,
          fade_factor,
          reference_count,
          embedding,
          embedding_model
        FROM memories
        WHERE ${clauses.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT ?
        `,
        [...params, safeLimit]
      );

      return parseTableRows("memories", memoryRowSchema, rows).map(toMemoryRecord);
    },
  };
}
