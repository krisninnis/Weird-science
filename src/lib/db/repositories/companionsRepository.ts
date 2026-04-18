import { getDb } from "../sqlite";

export interface CompanionRecord {
  id: string;
  name: string;
  archetype: "grounded" | "reflective" | "catalyst";
  core_json: string;
  shape_json: string;
  mood_json: string;
  created_at: string;
}

export async function createCompanion(companion: CompanionRecord) {
  const db = await getDb();

  await db.execute(
    `
    INSERT INTO companions (
      id, name, archetype,
      core_json, shape_json, mood_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      companion.id,
      companion.name,
      companion.archetype,
      companion.core_json,
      companion.shape_json,
      companion.mood_json,
      companion.created_at,
    ]
  );
}

export async function getCompanionById(id: string) {
  const db = await getDb();

  const rows = await db.select<CompanionRecord[]>(
    "SELECT * FROM companions WHERE id = ?",
    [id]
  );

  return rows[0] ?? null;
}

export async function listCompanions() {
  const db = await getDb();

  return db.select<CompanionRecord[]>(
    "SELECT * FROM companions ORDER BY created_at DESC"
  );
}