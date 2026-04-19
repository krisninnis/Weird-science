import type { RelationshipState } from "@/features/relationship/relationshipTypes";
import { withTransaction, type RepositoryDatabase } from "../sqlite";
import {
  parseTableRows,
  responseMemoryUseRowSchema,
  responseStateInfluenceRowSchema,
} from "../rowSchemas";

export type MemoryUseRow = {
  memoryId: string;
  usage: "used" | "considered_unused";
  weight: number;
};

export type StateInfluenceRow = {
  variable: keyof RelationshipState | string;
  value: number;
  influence: string;
};

export function createResponseInfluencesRepo(db: RepositoryDatabase) {
  return {
    async writeBatch(
      messageId: string,
      memoryUses: MemoryUseRow[],
      stateInfluences: StateInfluenceRow[]
    ): Promise<void> {
      await withTransaction(db, async () => {
        for (const memoryUse of memoryUses) {
          await db.execute(
            `
            INSERT INTO response_memory_uses (
              id,
              message_id,
              memory_id,
              usage,
              weight,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
              crypto.randomUUID(),
              messageId,
              memoryUse.memoryId,
              memoryUse.usage,
              memoryUse.weight,
              new Date().toISOString(),
            ]
          );
        }

        for (const stateInfluence of stateInfluences) {
          await db.execute(
            `
            INSERT INTO response_state_influences (
              id,
              message_id,
              variable,
              value,
              influence
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
              crypto.randomUUID(),
              messageId,
              stateInfluence.variable,
              stateInfluence.value,
              stateInfluence.influence,
            ]
          );
        }
      });
    },

    async getForMessage(messageId: string): Promise<{
      memoryUses: MemoryUseRow[];
      stateInfluences: StateInfluenceRow[];
    }> {
      const [memoryUseRows, stateInfluenceRows] = await Promise.all([
        db.select<unknown[]>(
          `
          SELECT id, message_id, memory_id, usage, weight, created_at
          FROM response_memory_uses
          WHERE message_id = ?
          ORDER BY created_at ASC
          `,
          [messageId]
        ),
        db.select<unknown[]>(
          `
          SELECT id, message_id, variable, value, influence
          FROM response_state_influences
          WHERE message_id = ?
          ORDER BY id ASC
          `,
          [messageId]
        ),
      ]);

      return {
        memoryUses: parseTableRows(
          "response_memory_uses",
          responseMemoryUseRowSchema,
          memoryUseRows
        ).map((row) => ({
          memoryId: row.memory_id,
          usage: row.usage,
          weight: row.weight,
        })),
        stateInfluences: parseTableRows(
          "response_state_influences",
          responseStateInfluenceRowSchema,
          stateInfluenceRows
        ).map((row) => ({
          variable: row.variable,
          value: row.value,
          influence: row.influence,
        })),
      };
    },
  };
}
