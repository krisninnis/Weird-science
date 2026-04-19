import Database from "@tauri-apps/plugin-sql";
import { ALL_MIGRATIONS } from "./schema";

let dbInstance: Database | null = null;
export type RepositoryDatabase = Pick<Database, "execute" | "select">;

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

export function encodeEmbedding(vec: number[]): Uint8Array {
  const buffer = new ArrayBuffer(vec.length * Float32Array.BYTES_PER_ELEMENT);
  const view = new DataView(buffer);

  vec.forEach((value, index) => {
    view.setFloat32(index * Float32Array.BYTES_PER_ELEMENT, value, true);
  });

  return new Uint8Array(buffer);
}

export function decodeEmbedding(bytes: Uint8Array): number[] {
  const view = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength
  );
  const values: number[] = [];

  for (let offset = 0; offset < view.byteLength; offset += Float32Array.BYTES_PER_ELEMENT) {
    values.push(view.getFloat32(offset, true));
  }

  return values;
}

export async function withTransaction<T>(
  db: RepositoryDatabase,
  fn: () => Promise<T>
): Promise<T> {
  await db.execute("BEGIN");

  try {
    const result = await fn();
    await db.execute("COMMIT");
    return result;
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
