import { z, type ZodType } from "zod";

const memoryTypeSchema = z.enum([
  "fact",
  "preference",
  "routine",
  "emotional_event",
  "milestone",
  "promise",
  "boundary",
  "unresolved_issue",
  "shared_story",
  "shared_language",
  "companion_self_update",
]);

const memorySubjectSchema = z.enum([
  "user",
  "companion",
  "relationship",
  "external_person",
]);

const memoryValenceSchema = z.enum([
  "positive",
  "negative",
  "mixed",
  "neutral",
]);

const memoryStatusSchema = z.enum([
  "active",
  "archived",
  "superseded",
  "needs_review",
]);

const relationshipPhaseSchema = z.enum([
  "new",
  "warming",
  "bonded",
  "deepening",
  "strained",
  "repairing",
  "fledging",
  "dormant",
]);

const archetypeSchema = z.enum(["grounded", "reflective", "catalyst"]);
const messageRoleSchema = z.enum(["user", "assistant", "system"]);

export const memoryRowSchema = z.object({
  id: z.string(),
  companion_id: z.string(),
  type: memoryTypeSchema,
  summary: z.string(),
  detail: z.string(),
  subject: memorySubjectSchema,
  importance: z.number().int(),
  confidence: z.number(),
  valence: memoryValenceSchema,
  source_message_ids: z.string(),
  tags: z.string(),
  created_at: z.string(),
  last_referenced_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  user_editable: z.number().int(),
  pinned: z.number().int(),
  status: memoryStatusSchema,
  reinforcement_count: z.number().int(),
  fade_factor: z.number(),
  reference_count: z.number().int(),
  embedding: z.instanceof(Uint8Array).nullable().optional(),
  embedding_model: z.string().nullable().optional(),
});

export const messageRowSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  created_at: z.string(),
});

export const conversationRowSchema = z.object({
  id: z.string(),
  companion_id: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  title: z.string().nullable(),
});

export const relationshipStateRowSchema = z.object({
  companion_id: z.string(),
  familiarity: z.number(),
  trust: z.number(),
  affection: z.number(),
  openness: z.number(),
  tension: z.number(),
  playfulness: z.number(),
  romantic_charge: z.number(),
  dependency_risk: z.number(),
  phase: relationshipPhaseSchema,
  chapter: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  last_interaction_at: z.string().nullable(),
});

export const companionRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: archetypeSchema,
  core_json: z.string(),
  shape_json: z.string(),
  mood_json: z.string(),
  created_at: z.string(),
});

export const responseMemoryUseRowSchema = z.object({
  id: z.string(),
  message_id: z.string(),
  memory_id: z.string(),
  usage: z.enum(["used", "considered_unused"]),
  weight: z.number(),
  created_at: z.string(),
});

export const responseStateInfluenceRowSchema = z.object({
  id: z.string(),
  message_id: z.string(),
  variable: z.string(),
  value: z.number(),
  influence: z.string(),
});

export const milestoneRowSchema = z.object({
  id: z.string(),
  companion_id: z.string(),
  title: z.string(),
  description: z.string(),
  occurred_at: z.string(),
  memory_id: z.string().nullable(),
});

export const safetyEventRowSchema = z.object({
  id: z.string(),
  companion_id: z.string(),
  message_id: z.string().nullable(),
  kind: z.string(),
  severity: z.enum(["low", "moderate", "high"]),
  detail: z.string(),
  created_at: z.string(),
  resolved: z.number().int(),
});

export const memoryLinkRowSchema = z.object({
  id: z.string(),
  from_memory_id: z.string(),
  to_memory_id: z.string(),
  relation: z.string(),
  created_at: z.string(),
});

export const settingRowSchema = z.object({
  key: z.string(),
  value: z.string(),
  updated_at: z.string(),
});

export const schemaMetaRowSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export type MemoryRow = z.infer<typeof memoryRowSchema>;
export type MessageRow = z.infer<typeof messageRowSchema>;
export type ConversationRow = z.infer<typeof conversationRowSchema>;
export type RelationshipStateRow = z.infer<typeof relationshipStateRowSchema>;
export type CompanionRow = z.infer<typeof companionRowSchema>;
export type ResponseMemoryUseRow = z.infer<typeof responseMemoryUseRowSchema>;
export type ResponseStateInfluenceRow = z.infer<
  typeof responseStateInfluenceRowSchema
>;
export type MilestoneRow = z.infer<typeof milestoneRowSchema>;
export type SafetyEventRow = z.infer<typeof safetyEventRowSchema>;
export type MemoryLinkRow = z.infer<typeof memoryLinkRowSchema>;
export type SettingRow = z.infer<typeof settingRowSchema>;
export type SchemaMetaRow = z.infer<typeof schemaMetaRowSchema>;

export class RepositoryError extends Error {
  constructor(
    public code:
      | "ROW_SHAPE_INVALID"
      | "IMMUTABLE_CORE_VIOLATION"
      | "NOT_FOUND"
      | "CONSTRAINT"
      | "INVALID_INPUT",
    public table: string | null,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export function parseTableRow<T>(
  table: string,
  schema: ZodType<T>,
  value: unknown
): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new RepositoryError(
      "ROW_SHAPE_INVALID",
      table,
      `Invalid row shape for ${table}`,
      parsed.error
    );
  }

  return parsed.data;
}

export function parseTableRows<T>(
  table: string,
  schema: ZodType<T>,
  values: unknown[]
): T[] {
  return values.map((value) => parseTableRow(table, schema, value));
}
