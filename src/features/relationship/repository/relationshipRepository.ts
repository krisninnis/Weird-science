import { getDb } from "@/lib/db/sqlite";

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
  phase:
    | "new"
    | "warming"
    | "bonded"
    | "deepening"
    | "strained"
    | "repairing"
    | "fledging"
    | "dormant";
  chapter: string | null;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
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