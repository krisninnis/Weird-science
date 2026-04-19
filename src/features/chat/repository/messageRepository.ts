import { getDb } from "@/lib/db/sqlite";
import { messageRowSchema, parseTableRows } from "@/lib/db/rowSchemas";
import type { CreateMessageInput, Message } from "../chatTypes";

function mapMessageRow(row: unknown): Message {
  const parsed = messageRowSchema.parse(row);

  return {
    id: parsed.id,
    conversationId: parsed.conversation_id,
    role: parsed.role,
    content: parsed.content,
    createdAt: parsed.created_at
  };
}

/**
 * Create and persist a message in a conversation.
 */
export async function createMessage(
  input: CreateMessageInput
): Promise<Message> {
  const db = await getDb();

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.execute(
    `
    INSERT INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `,
    [id, input.conversationId, input.role, input.content, createdAt]
  );

  return {
    id,
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    createdAt
  };
}

/**
 * Get all messages for a conversation in chronological order.
 */
export async function getMessagesForConversation(
  conversationId: string
): Promise<Message[]> {
  const db = await getDb();

  const rows = await db.select<unknown[]>(
    `
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `,
    [conversationId]
  );

  return parseTableRows("messages", messageRowSchema, rows).map(mapMessageRow);
}

/**
 * Get the latest N messages for a conversation.
 */
export async function getRecentMessagesForConversation(
  conversationId: string,
  limit: number
): Promise<Message[]> {
  const db = await getDb();

  const rows = await db.select<unknown[]>(
    `
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `,
    [conversationId, limit]
  );

  return parseTableRows("messages", messageRowSchema, rows)
    .map(mapMessageRow)
    .reverse();
}
