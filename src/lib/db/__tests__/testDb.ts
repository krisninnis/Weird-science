import BetterSqlite3 from "better-sqlite3";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import type { CompanionProfile } from "@/features/companion/companionTypes";
import { ALL_MIGRATIONS, SCHEMA_VERSION } from "../schema";

type QueryResult = {
  rowsAffected: number;
  lastInsertId?: number;
};

export interface TestDb {
  execute(query: string, bindValues?: unknown[]): Promise<QueryResult>;
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  close(): Promise<boolean>;
  raw: BetterSqliteDatabase;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function normalizeBindValue(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }

  return value;
}

function createNow(): string {
  return new Date().toISOString();
}

export function createTestDb(): TestDb {
  const raw = new BetterSqlite3(":memory:");
  raw.pragma("foreign_keys = ON");

  try {
    raw.pragma("journal_mode = WAL");
  } catch {
    // WAL is not required for in-memory tests.
  }

  for (const migration of ALL_MIGRATIONS) {
    for (const statement of splitStatements(migration.sql)) {
      raw.prepare(statement).run();
    }
  }

  const versionRow = raw
    .prepare("SELECT value FROM schema_meta WHERE key = 'version'")
    .get() as { value?: string } | undefined;

  if (Number(versionRow?.value ?? "0") !== SCHEMA_VERSION) {
    throw new Error(
      `Expected schema version ${SCHEMA_VERSION}, got ${versionRow?.value ?? "0"}`
    );
  }

  return {
    raw,
    async execute(query: string, bindValues: unknown[] = []): Promise<QueryResult> {
      const result = raw
        .prepare(query)
        .run(...bindValues.map(normalizeBindValue));

      return {
        rowsAffected: result.changes,
        lastInsertId:
          typeof result.lastInsertRowid === "bigint"
            ? Number(result.lastInsertRowid)
            : result.lastInsertRowid,
      };
    },
    async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
      return raw
        .prepare(query)
        .all(...bindValues.map(normalizeBindValue)) as T;
    },
    async close(): Promise<boolean> {
      raw.close();
      return true;
    },
  };
}

export async function seedCompanion(
  testDb: TestDb,
  overrides?: Partial<CompanionProfile["core"]> & { id?: string; name?: string }
): Promise<CompanionProfile> {
  const id = overrides?.id ?? "rowan";
  const createdAt = overrides?.createdAt ?? createNow();
  const profile: CompanionProfile = {
    core: {
      id,
      name: overrides?.name ?? "Rowan",
      archetype: overrides?.archetype ?? "catalyst",
      traits: overrides?.traits ?? ["dry", "observant"],
      flaws: overrides?.flaws ?? ["withdraws when overwhelmed"],
      canonRules: overrides?.canonRules ?? ["never manipulates dependency"],
      boundaries: overrides?.boundaries ?? ["no coercion"],
      warmthBaseline: overrides?.warmthBaseline ?? 0.6,
      teasingBaseline: overrides?.teasingBaseline ?? 0.4,
      directnessBaseline: overrides?.directnessBaseline ?? 0.5,
      pace: overrides?.pace ?? "slow",
      createdAt,
    },
    shape: {
      companionId: id,
      selfNarrative: "A grounded companion learning this relationship.",
      interestsRevealed: ["tea"],
      communicationStyleAdapted: ["gentle pauses"],
      updatedAt: createNow(),
    },
    mood: {
      companionId: id,
      currentMood: "thoughtful",
      energyLevel: "moderate",
      sessionContext: null,
    },
  };

  await testDb.execute(
    `
    INSERT INTO companions (
      id,
      name,
      archetype,
      core_json,
      shape_json,
      mood_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      profile.core.id,
      profile.core.name,
      profile.core.archetype,
      JSON.stringify(profile.core),
      JSON.stringify(profile.shape),
      JSON.stringify(profile.mood),
      profile.core.createdAt,
    ]
  );

  return profile;
}

export async function seedConversation(
  testDb: TestDb,
  companionId: string,
  overrides?: { id?: string; startedAt?: string; endedAt?: string | null; title?: string | null }
): Promise<{ id: string }> {
  const id = overrides?.id ?? crypto.randomUUID();

  await testDb.execute(
    `
    INSERT INTO conversations (id, companion_id, started_at, ended_at, title)
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      id,
      companionId,
      overrides?.startedAt ?? createNow(),
      overrides?.endedAt ?? null,
      overrides?.title ?? null,
    ]
  );

  return { id };
}
