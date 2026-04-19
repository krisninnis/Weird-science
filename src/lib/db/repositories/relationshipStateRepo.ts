import { z } from "zod";
import type { RelationshipState } from "@/features/relationship/relationshipTypes";
import type { RepositoryDatabase } from "../sqlite";
import {
  RepositoryError,
  parseTableRow,
  relationshipStateRowSchema,
} from "../rowSchemas";

const relationshipStateSchema = z.object({
  companionId: z.string(),
  familiarity: z.number(),
  trust: z.number(),
  affection: z.number(),
  openness: z.number(),
  tension: z.number(),
  playfulness: z.number(),
  romanticCharge: z.number(),
  dependencyRisk: z.number(),
  phase: z.enum([
    "new",
    "warming",
    "bonded",
    "deepening",
    "strained",
    "repairing",
    "fledging",
    "dormant",
  ]),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastInteractionAt: z.string().nullable(),
  chapter: z
    .enum([
      "grief",
      "recovery",
      "caregiving_isolation",
      "expat_relocation",
      "night_shift",
      "postpartum",
      "widowhood",
      "life_transition",
      "unspecified",
    ])
    .nullable(),
});

function toRelationshipState(row: unknown): RelationshipState {
  const parsed = parseTableRow(
    "relationship_states",
    relationshipStateRowSchema,
    row
  );

  return relationshipStateSchema.parse({
    companionId: parsed.companion_id,
    familiarity: parsed.familiarity,
    trust: parsed.trust,
    affection: parsed.affection,
    openness: parsed.openness,
    tension: parsed.tension,
    playfulness: parsed.playfulness,
    romanticCharge: parsed.romantic_charge,
    dependencyRisk: parsed.dependency_risk,
    phase: parsed.phase,
    createdAt: parsed.created_at,
    updatedAt: parsed.updated_at,
    lastInteractionAt: parsed.last_interaction_at,
    chapter: parsed.chapter,
  });
}

export function createRelationshipStateRepo(db: RepositoryDatabase) {
  return {
    async getCurrent(companionId: string): Promise<RelationshipState> {
      const rows = await db.select<unknown[]>(
        `
        SELECT
          companion_id,
          familiarity,
          trust,
          affection,
          openness,
          tension,
          playfulness,
          romantic_charge,
          dependency_risk,
          phase,
          chapter,
          created_at,
          updated_at,
          last_interaction_at
        FROM relationship_states
        WHERE companion_id = ?
        LIMIT 1
        `,
        [companionId]
      );

      if (!rows.length) {
        throw new RepositoryError(
          "NOT_FOUND",
          "relationship_states",
          `No relationship state found for companion ${companionId}`
        );
      }

      return toRelationshipState(rows[0]);
    },

    async update(
      companionId: string,
      patch: Partial<RelationshipState>
    ): Promise<RelationshipState> {
      if ("companionId" in patch || "createdAt" in patch) {
        throw new RepositoryError(
          "INVALID_INPUT",
          "relationship_states",
          "companionId and createdAt cannot be patched"
        );
      }

      if ("updatedAt" in patch || "lastInteractionAt" in patch) {
        throw new RepositoryError(
          "INVALID_INPUT",
          "relationship_states",
          "updatedAt and lastInteractionAt are managed by the repository"
        );
      }

      const current = await this.getCurrent(companionId);
      const now = new Date().toISOString();
      const nextState = relationshipStateSchema.parse({
        ...current,
        ...patch,
        companionId,
        updatedAt: now,
        lastInteractionAt: now,
      });

      await db.execute(
        `
        UPDATE relationship_states
        SET
          familiarity = ?,
          trust = ?,
          affection = ?,
          openness = ?,
          tension = ?,
          playfulness = ?,
          romantic_charge = ?,
          dependency_risk = ?,
          phase = ?,
          chapter = ?,
          updated_at = ?,
          last_interaction_at = ?
        WHERE companion_id = ?
        `,
        [
          nextState.familiarity,
          nextState.trust,
          nextState.affection,
          nextState.openness,
          nextState.tension,
          nextState.playfulness,
          nextState.romanticCharge,
          nextState.dependencyRisk,
          nextState.phase,
          nextState.chapter,
          nextState.updatedAt,
          nextState.lastInteractionAt,
          companionId,
        ]
      );

      return this.getCurrent(companionId);
    },

    async ensureInitialState(
      companionId: string,
      initial: RelationshipState
    ): Promise<RelationshipState> {
      const existing = await db.select<unknown[]>(
        `
        SELECT companion_id
        FROM relationship_states
        WHERE companion_id = ?
        LIMIT 1
        `,
        [companionId]
      );

      if (existing.length) {
        return this.getCurrent(companionId);
      }

      const parsed = relationshipStateSchema.parse({
        ...initial,
        companionId,
      });

      await db.execute(
        `
        INSERT INTO relationship_states (
          companion_id,
          familiarity,
          trust,
          affection,
          openness,
          tension,
          playfulness,
          romantic_charge,
          dependency_risk,
          phase,
          chapter,
          created_at,
          updated_at,
          last_interaction_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          parsed.companionId,
          parsed.familiarity,
          parsed.trust,
          parsed.affection,
          parsed.openness,
          parsed.tension,
          parsed.playfulness,
          parsed.romanticCharge,
          parsed.dependencyRisk,
          parsed.phase,
          parsed.chapter,
          parsed.createdAt,
          parsed.updatedAt,
          parsed.lastInteractionAt,
        ]
      );

      return this.getCurrent(companionId);
    },
  };
}
