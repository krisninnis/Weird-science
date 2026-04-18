import { getDb } from "@/lib/db/sqlite";

/**
 * Get a setting by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();

  const rows = await db.select<Array<{ value: string }>>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );

  return rows.length ? rows[0].value : null;
}

/**
 * Set (insert or update) a setting
 */
export async function setSetting(
  key: string,
  value: string
): Promise<void> {
  const db = await getDb();

  await db.execute(
    `
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    `,
    [key, value, new Date().toISOString()]
  );
}