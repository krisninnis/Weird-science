import type { Message, MessageRole } from "@/features/chat/chatTypes";
import type { RepositoryDatabase } from "../sqlite";
import {
  RepositoryError,
  messageRowSchema,
  parseTableRow,
  parseTableRows,
} from "../rowSchemas";

function assertLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RepositoryError(
      "INVALID_INPUT",
      "messages",
      "limit must be a positive integer"
    );
  }

  return limit;
}

function toMessage(row: unknown): Message {
  const parsed = parseTableRow("messages", messageRowSchema, row);

  return {
    id: parsed.id,
    conversationId: parsed.conversation_id,
    role: parsed.role,
    content: parsed.content,
    createdAt: parsed.created_at,
  };
}

export function createMessagesRepo(db: RepositoryDatabase) {
  return {
    async appendMessage(input: {
      conversationId: string;
      role: MessageRole;
      content: string;
    }): Promise<Message> {
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const row = {
        id,
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,
        created_at: createdAt,
      };

      await db.execute(
        `
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        [id, input.conversationId, input.role, input.content, createdAt]
      );

      return toMessage(row);
    },

    async listByConversation(
      conversationId: string,
      limit: number
    ): Promise<Message[]> {
      const rows = await db.select<unknown[]>(
        `
        SELECT id, conversation_id, role, content, created_at
        FROM (
          SELECT id, conversation_id, role, content, created_at, rowid AS sort_index
          FROM messages
          WHERE conversation_id = ?
          ORDER BY created_at DESC, rowid DESC
          LIMIT ?
        ) recent_messages
        ORDER BY created_at ASC, sort_index ASC
        `,
        [conversationId, assertLimit(limit)]
      );

      return parseTableRows("messages", messageRowSchema, rows).map(toMessage);
    },

    async listRecentForCompanion(
      companionId: string,
      limit: number
    ): Promise<Message[]> {
      const rows = await db.select<unknown[]>(
        `
        SELECT
          m.id,
          m.conversation_id,
          m.role,
          m.content,
          m.created_at
        FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        WHERE c.companion_id = ?
        ORDER BY m.created_at DESC, m.rowid DESC
        LIMIT ?
        `,
        [companionId, assertLimit(limit)]
      );

      return parseTableRows("messages", messageRowSchema, rows).map(toMessage);
    },
  };
}
