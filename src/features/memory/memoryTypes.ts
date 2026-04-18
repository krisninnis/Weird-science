/**
 * Memory types — the canonical schema.
 *
 * Philosophy: memory is inspectable, user-owned, and proportionally forgetful.
 * Low-importance facts fade unless reinforced. Emotional events persist.
 * The companion is allowed to admit it doesn't remember.
 */

export type MemoryType =
  | "fact"
  | "preference"
  | "routine"
  | "emotional_event"
  | "milestone"
  | "promise"
  | "boundary"
  | "unresolved_issue"
  | "shared_story"
  | "shared_language" // Our Language: nicknames, inside jokes, recurring metaphors
  | "companion_self_update"; // companion identity evolution, bounded by canon

export type MemorySubject =
  | "user"
  | "companion"
  | "relationship"
  | "external_person";

export type MemoryValence = "positive" | "negative" | "mixed" | "neutral";

export type MemoryStatus =
  | "active"
  | "archived"
  | "superseded"
  | "needs_review";

export interface MemoryRecord {
  id: string;
  companionId: string;
  type: MemoryType;
  summary: string;
  detail: string;
  subject: MemorySubject;
  importance: 1 | 2 | 3 | 4 | 5;
  confidence: number; // 0..1
  valence: MemoryValence;
  sourceMessageIds: string[];
  tags: string[];
  createdAt: string; // ISO 8601
  lastReferencedAt: string | null;
  expiresAt: string | null; // null = no scheduled fade
  userEditable: boolean;
  pinned: boolean;
  status: MemoryStatus;

  // Proportional forgetting
  reinforcementCount: number; // times reaffirmed in conversation
  fadeFactor: number; // 0..1, approaches 0 as memory decays; 1 = vivid

  // Explainability — which response turns used this memory
  referenceCount: number;
}

/**
 * A minimal link between memories (e.g., "this promise is about that milestone").
 */
export interface MemoryLink {
  id: string;
  fromMemoryId: string;
  toMemoryId: string;
  relation: "about" | "contradicts" | "supersedes" | "supports" | "followup_of";
  createdAt: string;
}

/**
 * Used by the extractor. The local model returns this; the repository turns it into a MemoryRecord.
 */
export interface MemoryExtractionCandidate {
  type: MemoryType;
  summary: string;
  detail: string;
  subject: MemorySubject;
  importance: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  valence: MemoryValence;
  tags: string[];
  sourceMessageIds: string[];
}
