import Database from '@tauri-apps/plugin-sql';
import { ALL_MIGRATIONS } from './schema';

let dbInstance: Database | null = null;

/**
 * Lazy-loaded SQLite connection.
 * The DB file lives in the Tauri app data directory by default.
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  dbInstance = await Database.load('sqlite:weird-science.db');
  await runMigrations(dbInstance);
  return dbInstance;
}

async function runMigrations(db: Database): Promise<void> {
  // Ensure schema_meta exists before we check version.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const rows = (await db.select<Array<{ value: string }>>(
    "SELECT value FROM schema_meta WHERE key = 'version'"
  )) ?? [];
  const current = rows.length ? parseInt(rows[0].value, 10) : 0;

  for (const migration of ALL_MIGRATIONS) {
    if (migration.version > current) {
      // Tauri's plugin-sql executes one statement per call for execute();
      // but `load` variants accept multi-statement. We split conservatively.
      const statements = migration.sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await db.execute(stmt);
      }
    }
  }
}
