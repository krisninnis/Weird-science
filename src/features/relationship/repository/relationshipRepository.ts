import { getDb } from "@/lib/db/sqlite";
import type {
  ChapterContext,
  RelationshipPhase,
  RelationshipState
} from "../relationshipTypes";

export interface RelationshipStateRecord {
  companion_id: string;
  familiarity: number;
  trust: number;
  affection: number;
  openness: number;
  tension: number;
  playfulness: number;
  romantic_charge: number;
  dependency_risk: number;
  phase: RelationshipPhase;
  chapter: string | null;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
}

export function mapRelationshipRecordToState(
  record: RelationshipStateRecord
): RelationshipState {
  return {
    companionId: record.companion_id,
    familiarity: record.familiarity,
    trust: record.trust,
    affection: record.affection,
    openness: record.openness,
    tension: record.tension,
    playfulness: record.playfulness,
    romanticCharge: record.romantic_charge,
    dependencyRisk: record.dependency_risk,
    phase: record.phase,
    chapter: record.chapter as ChapterContext | null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    lastInteractionAt: record.last_interaction_at
  };
}

export async function createRelationshipState(
  companionId: string,
  chapter: string | null = null
): Promise<void> {
  const db = await getDb();

  await db.execute(
    `
    INSERT OR IGNORE INTO relationship_states (
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
      companionId,
      0.1,
      0.2,
      0.2,
      0.15,
      0.0,
      0.3,
      0.0,
      0.0,
      "new",
      chapter,
      new Date().toISOString(),
      new Date().toISOString(),
      null
    ]
  );
}

export async function getRelationshipState(
  companionId: string
): Promise<RelationshipStateRecord | null> {
  const db = await getDb();

  const rows = await db.select<RelationshipStateRecord[]>(
    "SELECT * FROM relationship_states WHERE companion_id = ? LIMIT 1",
    [companionId]
  );

  return rows[0] ?? null;
}

export async function updateTrust(
  companionId: string,
  trust: number
): Promise<void> {
  const db = await getDb();

  await db.execute(
    `
    UPDATE relationship_states
    SET trust = ?, updated_at = ?
    WHERE companion_id = ?
    `,
    [trust, new Date().toISOString(), companionId]
  );
}

export async function updateRelationshipPhase(
  companionId: string,
  phase: RelationshipPhase
): Promise<void> {
  const db = await getDb();

  await db.execute(
    `
    UPDATE relationship_states
    SET phase = ?, updated_at = ?
    WHERE companion_id = ?
    `,
    [phase, new Date().toISOString(), companionId]
  );
}

export async function saveRelationshipState(
  state: RelationshipState
): Promise<void> {
  const db = await getDb();

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
      state.familiarity,
      state.trust,
      state.affection,
      state.openness,
      state.tension,
      state.playfulness,
      state.romanticCharge,
      state.dependencyRisk,
      state.phase,
      state.chapter,
      state.updatedAt,
      state.lastInteractionAt,
      state.companionId
    ]
  );
}
