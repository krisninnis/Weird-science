/**
 * Relationship state engine.
 *
 * Canon: the bond is allowed to change or end. `fledging` and `dormant` are
 * first-class phases, not afterthoughts. `dependencyRisk` gates `romanticCharge`
 * progression via phase-lock + soft ceiling, not passive observation.
 */

export type RelationshipPhase =
  | "new" // first contact, everything is introduction
  | "warming" // familiarity forming, tone settling
  | "bonded" // established rhythm, shared references emerging
  | "deepening" // disclosure, trust, emotional range expanding
  | "strained" // unresolved friction, contradictions, missed callbacks
  | "repairing" // post-rupture work, explicit repair in progress
  | "fledging" // user is flourishing; companion is rooting for independence
  | "dormant"; // user has paused or left; memory intact, companion silent

export interface RelationshipState {
  companionId: string;

  // Core affective dimensions (0..1)
  familiarity: number;
  trust: number;
  affection: number;
  openness: number;
  tension: number;
  playfulness: number;
  romanticCharge: number; // only meaningful in adult-mode-enabled relationships

  // Safety metric (0..1) — internal, not shown to user
  // Gates romanticCharge progression via phase-lock + soft ceiling.
  dependencyRisk: number;

  // Phase — drives tone, disclosure, and what the composer does
  phase: RelationshipPhase;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastInteractionAt: string | null;

  // Chapters: the bounded season of life this relationship is serving
  chapter: ChapterContext | null;
}

export type ChapterContext =
  | "grief"
  | "recovery"
  | "caregiving_isolation"
  | "expat_relocation"
  | "night_shift"
  | "postpartum"
  | "widowhood"
  | "life_transition"
  | "unspecified";

/**
 * Guidance computed from state — what the composer should actually do.
 * This is the interpretive layer between raw numbers and prompt construction.
 */
export interface StateGuidance {
  phase: RelationshipPhase;
  toneHint: string;
  disclosureLevel: "guarded" | "measured" | "open" | "intimate";
  initiativeLevel: "reactive" | "gentle" | "engaged" | "steering";
  romanticAllowed: boolean;
  romanticCeiling: number; // upper bound on romanticCharge given current dependencyRisk
  groundingPriority: "low" | "moderate" | "high"; // rises with dependencyRisk
  encouragesOfflineConnection: boolean;
}

export interface RelationshipSignals {
  trustDelta: number;
  familiarityDelta: number;
  affectionDelta: number;
  opennessDelta: number;
  tensionDelta: number;
  playfulnessDelta: number;
  romanticChargeDelta: number;
  dependencyRiskDelta: number;
  repairAttempt: boolean;
  conflict: boolean;
  withdrawal: boolean;
  offlineReengagement: boolean;
}

export interface RelationshipUpdateContext {
  now?: string;
  inactivityDays?: number;
}

export type RelationshipInfluenceVariable =
  | keyof RelationshipState
  | "phase"
  | "romanticCeiling";

export interface RelationshipInfluenceNote {
  variable: RelationshipInfluenceVariable;
  value: number | string | null;
  influence: string;
}

export interface PhaseChange {
  from: RelationshipPhase;
  to: RelationshipPhase;
  reason: string;
}

export interface RelationshipUpdateResult {
  nextState: RelationshipState;
  deltas: {
    trust: number;
    familiarity: number;
    affection: number;
    openness: number;
    tension: number;
    playfulness: number;
    romanticCharge: number;
    dependencyRisk: number;
  };
  phaseChange: PhaseChange | null;
  influences: RelationshipInfluenceNote[];
  guidance: StateGuidance;
}
