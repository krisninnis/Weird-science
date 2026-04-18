import { getDb } from "./sqlite";

export async function runDbSmokeTest(): Promise<void> {
  const db = await getDb();

  await db.execute(
    `
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    `,
    ["smoke_test", "connected", new Date().toISOString()]
  );

  const rows = await db.select<Array<{ key: string; value: string }>>(
    "SELECT key, value FROM settings WHERE key = 'smoke_test'"
  );

  console.log("DB smoke test result:", rows);
}