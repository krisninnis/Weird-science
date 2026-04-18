import { getDb } from "@/lib/db/sqlite";
import type {
  Conversation,
  CreateConversationInput
} from "../chatTypes";

/**
 * Create a new conversation for a companion.
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<Conversation> {
  const db = await getDb();

  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await db.execute(
    `
    INSERT INTO conversations (id, companion_id, started_at, ended_at, title)
    VALUES (?, ?, ?, ?, ?)
  `,
    [id, input.companionId, startedAt, null, input.title ?? null]
  );

  return {
    id,
    companionId: input.companionId,
    startedAt,
    endedAt: null,
    title: input.title ?? null
  };
}

/**
 * Get a conversation by ID.
 */
export async function getConversationById(
  id: string
): Promise<Conversation | null> {
  const db = await getDb();

  const rows = await db.select<any[]>(
    `
    SELECT * FROM conversations WHERE id = ? LIMIT 1
  `,
    [id]
  );

  if (!rows.length) return null;

  const row = rows[0];

  return {
    id: row.id,
    companionId: row.companion_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    title: row.title
  };
}

/**
 * Get all conversations for a companion (latest first).
 */
export async function getConversationsForCompanion(
  companionId: string
): Promise<Conversation[]> {
  const db = await getDb();

  const rows = await db.select<any[]>(
    `
    SELECT * FROM conversations
    WHERE companion_id = ?
    ORDER BY started_at DESC
  `,
    [companionId]
  );

  return rows.map((row) => ({
    id: row.id,
    companionId: row.companion_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    title: row.title
  }));
}
/**
 * Get the most recent conversation for a companion.
 */
export async function getLatestConversationForCompanion(
  companionId: string
): Promise<Conversation | null> {
  const db = await getDb();

  const rows = await db.select<any[]>(
    `
    SELECT * FROM conversations
    WHERE companion_id = ?
    ORDER BY started_at DESC
    LIMIT 1
  `,
    [companionId]
  );

  if (!rows.length) return null;

  const row = rows[0];

  return {
    id: row.id,
    companionId: row.companion_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    title: row.title
  };
}