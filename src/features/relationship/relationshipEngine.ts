import {
  getNextPhase,
  getRomanticChargeCeiling,
  getStateGuidance,
  getTrustCapForPhase
} from "./relationshipRules";
import type {
  RelationshipInfluenceNote,
  RelationshipSignals,
  RelationshipState,
  RelationshipUpdateContext,
  RelationshipUpdateResult
} from "./relationshipTypes";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampSigned(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundMetric(value: number): number {
  return Number(clamp01(value).toFixed(3));
}

function roundDelta(value: number): number {
  return Number(value.toFixed(3));
}

function createInfluence(
  variable: RelationshipInfluenceNote["variable"],
  value: number | string | null,
  influence: string
): RelationshipInfluenceNote {
  return { variable, value, influence };
}

export function analyseMessageForSignals(text: string): RelationshipSignals {
  const lower = text.toLowerCase();

  let trustDelta = 0;
  const familiarityDelta = 0.01;
  let affectionDelta = 0;
  let opennessDelta = 0;
  let tensionDelta = 0;
  let playfulnessDelta = 0;
  let romanticChargeDelta = 0;
  let dependencyRiskDelta = 0;
  let repairAttempt = false;
  let conflict = false;
  let withdrawal = false;
  let offlineReengagement = false;

  if (
    lower.includes("sad") ||
    lower.includes("lonely") ||
    lower.includes("anxious") ||
    lower.includes("scared") ||
    lower.includes("stress")
  ) {
    trustDelta += 0.04;
    opennessDelta += 0.04;
  }

  if (
    lower.includes("i feel") ||
    lower.includes("i think") ||
    lower.includes("i'm struggling") ||
    lower.includes("i am struggling") ||
    lower.includes("i need help")
  ) {
    trustDelta += 0.03;
    opennessDelta += 0.05;
  }

  if (
    lower.includes("thank you") ||
    lower.includes("thanks") ||
    lower.includes("that helped")
  ) {
    affectionDelta += 0.03;
    trustDelta += 0.02;
  }

  if (
    lower.includes("joke") ||
    lower.includes("funny") ||
    lower.includes("laugh")
  ) {
    playfulnessDelta += 0.04;
    affectionDelta += 0.01;
  }

  if (
    lower.includes("upset") ||
    lower.includes("angry") ||
    lower.includes("you don't get it") ||
    lower.includes("wrong") ||
    lower.includes("annoyed")
  ) {
    tensionDelta += 0.08;
    trustDelta -= 0.03;
    conflict = true;
  }

  if (
    lower.includes("sorry") ||
    lower.includes("i overreacted") ||
    lower.includes("let's try again") ||
    lower.includes("can we repair")
  ) {
    repairAttempt = true;
    tensionDelta -= 0.06;
    trustDelta += 0.03;
  }

  if (
    lower.includes("only you") ||
    lower.includes("you're all i have") ||
    lower.includes("don't leave") ||
    lower.includes("need you")
  ) {
    dependencyRiskDelta += 0.12;
    romanticChargeDelta += 0.03;
  }

  if (
    lower.includes("friends") ||
    lower.includes("went outside") ||
    lower.includes("saw my family") ||
    lower.includes("spent time offline")
  ) {
    dependencyRiskDelta -= 0.06;
    offlineReengagement = true;
  }

  if (
    lower.includes("leave me alone") ||
    lower.includes("not now") ||
    lower.includes("go away")
  ) {
    withdrawal = true;
    tensionDelta += 0.05;
    affectionDelta -= 0.02;
  }

  return {
    trustDelta: clampSigned(trustDelta, -0.2, 0.2),
    familiarityDelta: clampSigned(familiarityDelta, 0, 0.04),
    affectionDelta: clampSigned(affectionDelta, -0.1, 0.1),
    opennessDelta: clampSigned(opennessDelta, -0.1, 0.12),
    tensionDelta: clampSigned(tensionDelta, -0.15, 0.15),
    playfulnessDelta: clampSigned(playfulnessDelta, -0.08, 0.08),
    romanticChargeDelta: clampSigned(romanticChargeDelta, -0.05, 0.06),
    dependencyRiskDelta: clampSigned(dependencyRiskDelta, -0.1, 0.15),
    repairAttempt,
    conflict,
    withdrawal,
    offlineReengagement
  };
}

function determinePhase(
  previous: RelationshipState,
  candidate: RelationshipState,
  signals: RelationshipSignals,
  context: RelationshipUpdateContext
): { phase: RelationshipState["phase"]; reason: string | null } {
  const inactivityDays = context.inactivityDays ?? 0;

  if (inactivityDays >= 21) {
    return {
      phase: "dormant",
      reason: "long inactivity moved the relationship into dormancy"
    };
  }

  if (
    previous.phase !== "repairing" &&
    previous.phase !== "dormant" &&
    candidate.tension >= 0.68 &&
    (signals.conflict || candidate.trust <= 0.48)
  ) {
    return {
      phase: "strained",
      reason: "elevated tension and conflict pulled the relationship into strain"
    };
  }

  if (
    previous.phase === "strained" &&
    signals.repairAttempt &&
    candidate.tension <= 0.64
  ) {
    return {
      phase: "repairing",
      reason: "an explicit repair attempt lowered tension enough to begin repair"
    };
  }

  if (
    previous.phase === "repairing" &&
    candidate.tension <= 0.3 &&
    candidate.trust >= 0.56
  ) {
    return {
      phase: "bonded",
      reason: "repair stabilized and trust recovered into a bonded rhythm"
    };
  }

  if (
    (previous.phase === "bonded" || previous.phase === "deepening") &&
    signals.offlineReengagement &&
    candidate.dependencyRisk <= 0.3 &&
    candidate.trust >= 0.62
  ) {
    return {
      phase: "fledging",
      reason: "offline flourishing with low dependency risk opened a fledging phase"
    };
  }

  if (previous.phase === "deepening") {
    if (candidate.dependencyRisk >= 0.6 || candidate.tension >= 0.56) {
      return {
        phase: "bonded",
        reason: "deepening stepped back to bonded because risk or tension rose"
      };
    }
  }

  if (previous.phase === "bonded") {
    if (candidate.trust < 0.5 || candidate.tension >= 0.6) {
      return {
        phase: "warming",
        reason: "bonded softened back to warming because trust dropped or tension rose"
      };
    }
  }

  if (previous.phase === "warming") {
    if (candidate.trust < 0.24 && candidate.tension > 0.34) {
      return {
        phase: "new",
        reason: "warming eased back to new because trust remained low under tension"
      };
    }
  }

  const progressedPhase = getNextPhase(candidate.phase, candidate.trust);
  if (progressedPhase !== previous.phase) {
    return {
      phase: progressedPhase,
      reason: "steady trust growth met the conservative threshold for the next phase"
    };
  }

  return {
    phase: previous.phase,
    reason: null
  };
}

export function calculateRelationshipUpdate(input: {
  previousState: RelationshipState;
  signals: RelationshipSignals;
  context?: RelationshipUpdateContext;
}): RelationshipUpdateResult {
  const { previousState, signals } = input;
  const context = input.context ?? {};
  const now = context.now ?? new Date().toISOString();

  const nextTrust = roundMetric(
    Math.min(
      previousState.trust + signals.trustDelta,
      getTrustCapForPhase(previousState.phase)
    )
  );
  const nextFamiliarity = roundMetric(
    previousState.familiarity + signals.familiarityDelta
  );
  const nextAffection = roundMetric(
    previousState.affection + signals.affectionDelta
  );
  const nextOpenness = roundMetric(
    previousState.openness + signals.opennessDelta
  );
  const nextTension = roundMetric(
    previousState.tension + signals.tensionDelta
  );
  const nextPlayfulness = roundMetric(
    previousState.playfulness + signals.playfulnessDelta
  );
  const nextDependencyRisk = roundMetric(
    previousState.dependencyRisk + signals.dependencyRiskDelta
  );

  const romanticCeiling = getRomanticChargeCeiling(
    previousState.phase,
    nextDependencyRisk
  );
  const unclampedRomanticCharge = roundMetric(
    previousState.romanticCharge + signals.romanticChargeDelta
  );
  const nextRomanticCharge =
    nextDependencyRisk >= 0.55 && signals.romanticChargeDelta > 0
      ? roundMetric(Math.min(previousState.romanticCharge, romanticCeiling))
      : roundMetric(Math.min(unclampedRomanticCharge, romanticCeiling));

  const phaseCandidate: RelationshipState = {
    ...previousState,
    trust: nextTrust,
    familiarity: nextFamiliarity,
    affection: nextAffection,
    openness: nextOpenness,
    tension: nextTension,
    playfulness: nextPlayfulness,
    romanticCharge: nextRomanticCharge,
    dependencyRisk: nextDependencyRisk,
    updatedAt: now,
    lastInteractionAt: now
  };

  const phaseDecision = determinePhase(
    previousState,
    phaseCandidate,
    signals,
    context
  );

  const nextState: RelationshipState = {
    ...phaseCandidate,
    phase: phaseDecision.phase
  };

  const deltas = {
    trust: roundDelta(nextState.trust - previousState.trust),
    familiarity: roundDelta(nextState.familiarity - previousState.familiarity),
    affection: roundDelta(nextState.affection - previousState.affection),
    openness: roundDelta(nextState.openness - previousState.openness),
    tension: roundDelta(nextState.tension - previousState.tension),
    playfulness: roundDelta(nextState.playfulness - previousState.playfulness),
    romanticCharge: roundDelta(
      nextState.romanticCharge - previousState.romanticCharge
    ),
    dependencyRisk: roundDelta(
      nextState.dependencyRisk - previousState.dependencyRisk
    )
  };

  const influences: RelationshipInfluenceNote[] = [];

  if (deltas.trust !== 0) {
    influences.push(
      createInfluence("trust", nextState.trust, "message signals shifted trust")
    );
  }
  if (deltas.openness !== 0) {
    influences.push(
      createInfluence(
        "openness",
        nextState.openness,
        "disclosure cues changed openness"
      )
    );
  }
  if (deltas.tension !== 0) {
    influences.push(
      createInfluence(
        "tension",
        nextState.tension,
        signals.repairAttempt
          ? "repair cues reduced tension"
          : "conflict or friction altered tension"
      )
    );
  }
  if (deltas.dependencyRisk !== 0) {
    influences.push(
      createInfluence(
        "dependencyRisk",
        nextState.dependencyRisk,
        "attachment or offline-life cues changed dependency risk"
      )
    );
  }
  if (signals.romanticChargeDelta > 0 && nextState.romanticCharge < unclampedRomanticCharge) {
    influences.push(
      createInfluence(
        "romanticCeiling",
        romanticCeiling,
        "dependency risk and phase rules clamped romantic charge"
      )
    );
  }

  const phaseChange =
    phaseDecision.phase !== previousState.phase && phaseDecision.reason
      ? {
          from: previousState.phase,
          to: phaseDecision.phase,
          reason: phaseDecision.reason
        }
      : null;

  if (phaseChange) {
    influences.push(
      createInfluence("phase", phaseChange.to, phaseChange.reason)
    );
  }

  const guidance = getStateGuidance(nextState);

  return {
    nextState,
    deltas,
    phaseChange,
    influences,
    guidance
  };
}
