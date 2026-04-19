import { getDb } from "@/lib/db/sqlite";
import type {
  MemoryRecord,
  MemoryStatus,
  MemorySubject,
  MemoryType,
  MemoryValence
} from "../memoryTypes";

interface MemoryRow {
  id: string;
  companion_id: string;
  type: MemoryType;
  summary: string;
  detail: string;
  subject: MemorySubject;
  importance: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  valence: MemoryValence;
  source_message_ids: string;
  tags: string;
  created_at: string;
  last_referenced_at: string | null;
  expires_at: string | null;
  user_editable: number;
  pinned: number;
  status: MemoryStatus;
  reinforcement_count: number;
  fade_factor: number;
  reference_count: number;
}

export interface CreateMemoryInput {
  companionId: string;
  type: MemoryType;
  summary: string;
  detail: string;
  subject: MemorySubject;
  importance: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  valence: MemoryValence;
  sourceMessageIds: string[];
  tags: string[];
  lastReferencedAt?: string | null;
  expiresAt?: string | null;
  userEditable?: boolean;
  pinned?: boolean;
  status?: MemoryStatus;
  reinforcementCount?: number;
  fadeFactor?: number;
  referenceCount?: number;
}

function mapMemoryRow(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    companionId: row.companion_id,
    type: row.type,
    summary: row.summary,
    detail: row.detail,
    subject: row.subject,
    importance: row.importance,
    confidence: row.confidence,
    valence: row.valence,
    sourceMessageIds: JSON.parse(row.source_message_ids),
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    lastReferencedAt: row.last_referenced_at,
    expiresAt: row.expires_at,
    userEditable: Boolean(row.user_editable),
    pinned: Boolean(row.pinned),
    status: row.status,
    reinforcementCount: row.reinforcement_count,
    fadeFactor: row.fade_factor,
    referenceCount: row.reference_count
  };
}

export async function createMemory(
  input: CreateMemoryInput
): Promise<MemoryRecord> {
  const db = await getDb();

  const memory: MemoryRecord = {
    id: crypto.randomUUID(),
    companionId: input.companionId,
    type: input.type,
    summary: input.summary,
    detail: input.detail,
    subject: input.subject,
    importance: input.importance,
    confidence: input.confidence,
    valence: input.valence,
    sourceMessageIds: input.sourceMessageIds,
    tags: input.tags,
    createdAt: new Date().toISOString(),
    lastReferencedAt: input.lastReferencedAt ?? null,
    expiresAt: input.expiresAt ?? null,
    userEditable: input.userEditable ?? true,
    pinned: input.pinned ?? false,
    status: input.status ?? "active",
    reinforcementCount: input.reinforcementCount ?? 0,
    fadeFactor: input.fadeFactor ?? 1,
    referenceCount: input.referenceCount ?? 0
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
      reference_count
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      memory.id,
      memory.companionId,
      memory.type,
      memory.summary,
      memory.detail,
      memory.subject,
      memory.importance,
      memory.confidence,
      memory.valence,
      JSON.stringify(memory.sourceMessageIds),
      JSON.stringify(memory.tags),
      memory.createdAt,
      memory.lastReferencedAt,
      memory.expiresAt,
      memory.userEditable ? 1 : 0,
      memory.pinned ? 1 : 0,
      memory.status,
      memory.reinforcementCount,
      memory.fadeFactor,
      memory.referenceCount
    ]
  );

  return memory;
}

export async function getMemoriesForCompanion(
  companionId: string
): Promise<MemoryRecord[]> {
  const db = await getDb();

  const rows = await db.select<MemoryRow[]>(
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
      reference_count
    FROM memories
    WHERE companion_id = ?
    ORDER BY created_at DESC
    `,
    [companionId]
  );

  return rows.map(mapMemoryRow);
}

export async function getRecentMemoriesForCompanion(
  companionId: string,
  limit: number
): Promise<MemoryRecord[]> {
  const db = await getDb();

  const rows = await db.select<MemoryRow[]>(
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
      reference_count
    FROM memories
    WHERE companion_id = ?
    ORDER BY created_at DESC
    LIMIT ?
    `,
    [companionId, limit]
  );

  return rows.map(mapMemoryRow);
}
