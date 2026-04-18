import { getDb } from "../sqlite";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();

  const rows = await db.select<Array<{ value: string }>>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );

  return rows.length ? rows[0].value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();

  await db.execute(
    `
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
    `,
    [key, value]
  );
}