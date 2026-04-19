import type { RepositoryDatabase } from "../sqlite";
import { milestoneRowSchema, parseTableRow, parseTableRows } from "../rowSchemas";

export interface MilestoneRecord {
  id: string;
  companionId: string;
  title: string;
  description: string;
  occurredAt: string;
  memoryId: string | null;
}

function toMilestoneRecord(row: unknown): MilestoneRecord {
  const parsed = parseTableRow("milestones", milestoneRowSchema, row);

  return {
    id: parsed.id,
    companionId: parsed.companion_id,
    title: parsed.title,
    description: parsed.description,
    occurredAt: parsed.occurred_at,
    memoryId: parsed.memory_id,
  };
}

export function createMilestonesRepo(db: RepositoryDatabase) {
  return {
    async insert(input: {
      companionId: string;
      title: string;
      description: string;
      occurredAt?: string;
      memoryId?: string | null;
    }): Promise<MilestoneRecord> {
      const row = {
        id: crypto.randomUUID(),
        companion_id: input.companionId,
        title: input.title,
        description: input.description,
        occurred_at: input.occurredAt ?? new Date().toISOString(),
        memory_id: input.memoryId ?? null,
      };

      await db.execute(
        `
        INSERT INTO milestones (
          id,
          companion_id,
          title,
          description,
          occurred_at,
          memory_id
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          row.id,
          row.companion_id,
          row.title,
          row.description,
          row.occurred_at,
          row.memory_id,
        ]
      );

      return toMilestoneRecord(row);
    },

    async listByCompanion(
      companionId: string,
      limit: number
    ): Promise<MilestoneRecord[]> {
      const rows = await db.select<unknown[]>(
        `
        SELECT id, companion_id, title, description, occurred_at, memory_id
        FROM milestones
        WHERE companion_id = ?
        ORDER BY occurred_at DESC
        LIMIT ?
        `,
        [companionId, limit]
      );

      return parseTableRows("milestones", milestoneRowSchema, rows).map(
        toMilestoneRecord
      );
    },
  };
}
