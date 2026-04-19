import { z } from "zod";
import type {
  CompanionCore,
  CompanionMood,
  CompanionProfile,
  CompanionShape,
} from "@/features/companion/companionTypes";
import type { RepositoryDatabase } from "../sqlite";
import {
  RepositoryError,
  companionRowSchema,
  parseTableRow,
  parseTableRows,
} from "../rowSchemas";

const companionCoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.enum(["grounded", "reflective", "catalyst"]),
  traits: z.array(z.string()),
  flaws: z.array(z.string()),
  canonRules: z.array(z.string()),
  boundaries: z.array(z.string()),
  warmthBaseline: z.number(),
  teasingBaseline: z.number(),
  directnessBaseline: z.number(),
  pace: z.enum(["slow", "moderate"]),
  createdAt: z.string(),
});

const companionShapeSchema = z.object({
  companionId: z.string(),
  selfNarrative: z.string(),
  interestsRevealed: z.array(z.string()),
  communicationStyleAdapted: z.array(z.string()),
  updatedAt: z.string(),
});

const companionMoodSchema = z.object({
  companionId: z.string(),
  currentMood: z.enum([
    "warm",
    "thoughtful",
    "playful",
    "quiet",
    "focused",
    "tender",
  ]),
  energyLevel: z.enum(["low", "moderate", "high"]),
  sessionContext: z.string().nullable(),
});

function parseJsonSchema<T>(
  table: string,
  field: string,
  schema: z.ZodType<T>,
  value: string
): T {
  const parsed = schema.safeParse(JSON.parse(value));

  if (!parsed.success) {
    throw new RepositoryError(
      "ROW_SHAPE_INVALID",
      table,
      `Invalid JSON in ${table}.${field}`,
      parsed.error
    );
  }

  return parsed.data;
}

function toCompanionProfile(row: unknown): CompanionProfile {
  const parsed = parseTableRow("companions", companionRowSchema, row);

  return {
    core: parseJsonSchema(
      "companions",
      "core_json",
      companionCoreSchema,
      parsed.core_json
    ),
    shape: parseJsonSchema(
      "companions",
      "shape_json",
      companionShapeSchema,
      parsed.shape_json
    ),
    mood: parseJsonSchema(
      "companions",
      "mood_json",
      companionMoodSchema,
      parsed.mood_json
    ),
  };
}

export type NewCompanionInput = {
  id?: string;
  name: string;
  archetype: string;
  core: CompanionCore;
  shape: CompanionShape;
  mood: CompanionMood;
};

export function createCompanionsRepo(db: RepositoryDatabase) {
  const selectById = async (id: string): Promise<CompanionProfile | null> => {
    const rows = await db.select<unknown[]>(
      `
      SELECT id, name, archetype, core_json, shape_json, mood_json, created_at
      FROM companions
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    return rows.length ? toCompanionProfile(rows[0]) : null;
  };

  const updateJsonColumn = async <T>(
    id: string,
    column: "shape_json" | "mood_json",
    nextValue: T
  ): Promise<CompanionProfile> => {
    await db.execute(
      `
      UPDATE companions
      SET ${column} = ?
      WHERE id = ?
      `,
      [JSON.stringify(nextValue), id]
    );

    const updated = await selectById(id);

    if (!updated) {
      throw new RepositoryError(
        "NOT_FOUND",
        "companions",
        `No companion found for id ${id}`
      );
    }

    return updated;
  };

  const debugForceCoreOverwrite = async (
    id: string,
    core: CompanionCore
  ): Promise<CompanionProfile> => {
    if (process.env.NODE_ENV === "production") {
      throw new RepositoryError(
        "IMMUTABLE_CORE_VIOLATION",
        "companions",
        "core_json is immutable in production"
      );
    }

    const parsedCore = companionCoreSchema.parse(core);

    await db.execute(
      `
      UPDATE companions
      SET core_json = ?
      WHERE id = ?
      `,
      [JSON.stringify(parsedCore), id]
    );

    const updated = await selectById(id);

    if (!updated) {
      throw new RepositoryError(
        "NOT_FOUND",
        "companions",
        `No companion found for id ${id}`
      );
    }

    return updated;
  };

  return {
    async getById(id: string): Promise<CompanionProfile | null> {
      return selectById(id);
    },

    async list(): Promise<CompanionProfile[]> {
      const rows = await db.select<unknown[]>(
        `
        SELECT id, name, archetype, core_json, shape_json, mood_json, created_at
        FROM companions
        ORDER BY created_at ASC
        `
      );

      return parseTableRows("companions", companionRowSchema, rows).map(
        toCompanionProfile
      );
    },

    async insert(input: NewCompanionInput): Promise<CompanionProfile> {
      const id = input.id ?? crypto.randomUUID();
      const createdAt = input.core.createdAt || new Date().toISOString();
      const core = companionCoreSchema.parse({
        ...input.core,
        id,
        name: input.name,
        archetype: input.archetype,
        createdAt,
      });
      const shape = companionShapeSchema.parse({
        ...input.shape,
        companionId: id,
      });
      const mood = companionMoodSchema.parse({
        ...input.mood,
        companionId: id,
      });

      await db.execute(
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
          id,
          input.name,
          input.archetype,
          JSON.stringify(core),
          JSON.stringify(shape),
          JSON.stringify(mood),
          createdAt,
        ]
      );

      const inserted = await selectById(id);

      if (!inserted) {
        throw new RepositoryError(
          "NOT_FOUND",
          "companions",
          `Failed to load inserted companion ${id}`
        );
      }

      return inserted;
    },

    async updateShape(
      id: string,
      patch: Partial<CompanionShape>
    ): Promise<CompanionProfile> {
      const current = await selectById(id);

      if (!current) {
        throw new RepositoryError(
          "NOT_FOUND",
          "companions",
          `No companion found for id ${id}`
        );
      }

      const nextShape = companionShapeSchema.parse({
        ...current.shape,
        ...patch,
        companionId: current.shape.companionId,
      });

      return updateJsonColumn(id, "shape_json", nextShape);
    },

    async updateMood(
      id: string,
      patch: Partial<CompanionMood>
    ): Promise<CompanionProfile> {
      const current = await selectById(id);

      if (!current) {
        throw new RepositoryError(
          "NOT_FOUND",
          "companions",
          `No companion found for id ${id}`
        );
      }

      const nextMood = companionMoodSchema.parse({
        ...current.mood,
        ...patch,
        companionId: current.mood.companionId,
      });

      return updateJsonColumn(id, "mood_json", nextMood);
    },

    __debugForceCoreOverwrite: debugForceCoreOverwrite,
  };
}
