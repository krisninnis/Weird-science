import { getDb } from "@/lib/db/sqlite";
import { conversationRowSchema, parseTableRows } from "@/lib/db/rowSchemas";
import type {
  Conversation,
  CreateConversationInput
} from "../chatTypes";

function mapConversationRow(row: unknown): Conversation {
  const parsed = conversationRowSchema.parse(row);

  return {
    id: parsed.id,
    companionId: parsed.companion_id,
    startedAt: parsed.started_at,
    endedAt: parsed.ended_at,
    title: parsed.title
  };
}

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

  const rows = await db.select<unknown[]>(
    `
    SELECT * FROM conversations WHERE id = ? LIMIT 1
  `,
    [id]
  );

  if (!rows.length) return null;

  return mapConversationRow(rows[0]);
}

/**
 * Get all conversations for a companion (latest first).
 */
export async function getConversationsForCompanion(
  companionId: string
): Promise<Conversation[]> {
  const db = await getDb();

  const rows = await db.select<unknown[]>(
    `
    SELECT * FROM conversations
    WHERE companion_id = ?
    ORDER BY started_at DESC
  `,
    [companionId]
  );

  return parseTableRows("conversations", conversationRowSchema, rows).map(
    mapConversationRow
  );
}
/**
 * Get the most recent conversation for a companion.
 */
export async function getLatestConversationForCompanion(
  companionId: string
): Promise<Conversation | null> {
  const db = await getDb();

  const rows = await db.select<unknown[]>(
    `
    SELECT * FROM conversations
    WHERE companion_id = ?
    ORDER BY started_at DESC
    LIMIT 1
  `,
    [companionId]
  );

  if (!rows.length) return null;

  return mapConversationRow(rows[0]);
}
