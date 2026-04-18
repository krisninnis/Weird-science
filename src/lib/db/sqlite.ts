import Database from "@tauri-apps/plugin-sql";
import { ALL_MIGRATIONS } from "./schema";

let dbInstance: Database | null = null;

/**
 * Lazy-loaded SQLite connection.
 * The DB file lives in the Tauri app data directory by default.
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  dbInstance = await Database.load("sqlite:weird-science.db");
  await runMigrations(dbInstance);

  return dbInstance;
}

async function runMigrations(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const rows =
    (await db.select<Array<{ value: string }>>(
      "SELECT value FROM schema_meta WHERE key = 'version'"
    )) ?? [];

  const currentVersion = rows.length > 0 ? parseInt(rows[0].value, 10) : 0;

  for (const migration of ALL_MIGRATIONS) {
    if (migration.version > currentVersion) {
      const statements = migration.sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await db.execute(statement);
      }

      await db.execute(
        "INSERT OR REPLACE INTO schema_meta (key, value) VALUES ('version', ?)",
        [String(migration.version)]
      );
    }
  }
}