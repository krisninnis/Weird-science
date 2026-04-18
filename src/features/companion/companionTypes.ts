/**
 * Companion identity.
 *
 * Three-layer canon:
 *   1. Immutable core — archetype, name, foundational traits. Never changes.
 *   2. Relationship-shaped — self-narrative that evolves with the user bond.
 *   3. Mood/state — transient, session-level.
 *
 * Self-updates may deepen expression within the archetype. They may never violate
 * immutable core rules. The companion is Lisa-coded: a guide with agency, rooting
 * for the user's flourishing, not a partner optimizing for retention.
 */

export type Archetype = "grounded" | "reflective" | "catalyst";

export type RelationshipPace = "slow" | "moderate";

/** Layer 1: immutable core. Frozen at companion creation. */
export interface CompanionCore {
  id: string;
  name: string;
  archetype: Archetype;
  traits: string[]; // e.g. ["observant", "dryly funny", "unhurried"]
  flaws: string[]; // genuine, not cute — "gets quiet when overwhelmed"
  canonRules: string[]; // hard lines the companion will never cross
  boundaries: string[]; // topics/tones the companion won't engage with
  warmthBaseline: number;
  teasingBaseline: number;
  directnessBaseline: number;
  pace: RelationshipPace;
  createdAt: string;
}

/** Layer 2: relationship-shaped. Evolves via companion_self_update memories. */
export interface CompanionShape {
  companionId: string;
  selfNarrative: string; // how the companion talks about themselves, bounded by core
  interestsRevealed: string[]; // surfaced through conversation
  communicationStyleAdapted: string[]; // patterns adopted for this specific user
  updatedAt: string;
}

/** Layer 3: mood/state. Session-level, transient. */
export interface CompanionMood {
  companionId: string;
  currentMood:
    | "warm"
    | "thoughtful"
    | "playful"
    | "quiet"
    | "focused"
    | "tender";
  energyLevel: "low" | "moderate" | "high";
  sessionContext: string | null; // "last talked about dad visit" etc.
}

export interface CompanionProfile {
  core: CompanionCore;
  shape: CompanionShape;
  mood: CompanionMood;
}
