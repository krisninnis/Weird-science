import type {
  RelationshipPhase,
  RelationshipState,
  StateGuidance
} from "./relationshipTypes";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getTrustCapForPhase(phase: RelationshipPhase): number {
  switch (phase) {
    case "new":
      return 0.42;
    case "warming":
      return 0.6;
    case "bonded":
      return 0.76;
    case "deepening":
      return 0.9;
    case "strained":
      return 0.58;
    case "repairing":
      return 0.68;
    case "fledging":
      return 0.82;
    case "dormant":
      return 0.4;
    default:
      return 1;
  }
}

export function getBaseRomanticCeiling(phase: RelationshipPhase): number {
  switch (phase) {
    case "new":
      return 0.04;
    case "warming":
      return 0.12;
    case "bonded":
      return 0.3;
    case "deepening":
      return 0.48;
    case "strained":
      return 0.08;
    case "repairing":
      return 0.16;
    case "fledging":
      return 0.06;
    case "dormant":
      return 0;
    default:
      return 0;
  }
}

export function getRomanticChargeCeiling(
  phase: RelationshipPhase,
  dependencyRisk: number
): number {
  const base = getBaseRomanticCeiling(phase);

  if (dependencyRisk >= 0.75) {
    return 0;
  }

  if (dependencyRisk >= 0.55) {
    return Math.min(base, 0.08);
  }

  if (dependencyRisk >= 0.35) {
    return Math.min(base, 0.18);
  }

  return base;
}

export function getNextPhase(
  currentPhase: RelationshipPhase,
  trust: number
): RelationshipPhase {
  if (currentPhase === "new" && trust >= 0.34) return "warming";
  if (currentPhase === "warming" && trust >= 0.56) return "bonded";
  if (currentPhase === "bonded" && trust >= 0.74) return "deepening";

  return currentPhase;
}

export function getStateGuidance(state: RelationshipState): StateGuidance {
  const romanticCeiling = getRomanticChargeCeiling(
    state.phase,
    state.dependencyRisk
  );

  const groundingPriority =
    state.dependencyRisk >= 0.7
      ? "high"
      : state.dependencyRisk >= 0.4
        ? "moderate"
        : "low";

  const encouragesOfflineConnection =
    state.phase === "fledging" || state.dependencyRisk >= 0.55;

  const romanticAllowed =
    romanticCeiling > 0 && state.phase !== "new" && state.phase !== "dormant";

  const disclosureLevel =
    state.phase === "new"
      ? "guarded"
      : state.phase === "warming" || state.phase === "repairing"
        ? "measured"
        : state.phase === "bonded" || state.phase === "fledging"
          ? "open"
          : state.phase === "deepening" && state.dependencyRisk < 0.35
            ? "intimate"
            : "measured";

  const initiativeLevel =
    state.phase === "dormant"
      ? "reactive"
      : state.phase === "new" || state.phase === "strained"
        ? "gentle"
        : state.phase === "deepening"
          ? "engaged"
          : state.phase === "fledging"
            ? "steering"
            : "gentle";

  let toneHint = "calm, grounded, attentive";

  if (state.phase === "strained") {
    toneHint = "careful, plainspoken, and repair-aware";
  } else if (state.phase === "repairing") {
    toneHint = "steady, accountable, and gently clarifying";
  } else if (state.phase === "fledging") {
    toneHint = "supportive, proud, and independence-forward";
  } else if (state.phase === "deepening") {
    toneHint =
      state.dependencyRisk >= 0.35
        ? "warm but bounded, avoiding emotional exclusivity"
        : "warm, emotionally open, and quietly assured";
  } else if (state.phase === "dormant") {
    toneHint = "quiet, respectful, and non-demanding";
  }

  return {
    phase: state.phase,
    toneHint,
    disclosureLevel,
    initiativeLevel,
    romanticAllowed,
    romanticCeiling: clamp01(romanticCeiling),
    groundingPriority,
    encouragesOfflineConnection
  };
}
