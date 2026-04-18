import { getDb } from "@/lib/db/sqlite";
import type { CreateMessageInput, Message } from "../chatTypes";

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

  const rows = await db.select<any[]>(
    `
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `,
    [conversationId]
  );

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  }));
}

/**
 * Get the latest N messages for a conversation.
 */
export async function getRecentMessagesForConversation(
  conversationId: string,
  limit: number
): Promise<Message[]> {
  const db = await getDb();

  const rows = await db.select<any[]>(
    `
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `,
    [conversationId, limit]
  );

  return rows
    .map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at
    }))
    .reverse();
}