import { describe, expect, it } from "vitest";
import {
  analyseMessageForSignals,
  calculateRelationshipUpdate
} from "../relationshipEngine";
import { getStateGuidance } from "../relationshipRules";
import type { RelationshipState } from "../relationshipTypes";

function makeState(
  overrides: Partial<RelationshipState> = {}
): RelationshipState {
  return {
    companionId: "rowan",
    familiarity: 0.18,
    trust: 0.28,
    affection: 0.22,
    openness: 0.18,
    tension: 0.08,
    playfulness: 0.28,
    romanticCharge: 0.04,
    dependencyRisk: 0.08,
    phase: "new",
    createdAt: "2026-04-19T12:00:00.000Z",
    updatedAt: "2026-04-19T12:00:00.000Z",
    lastInteractionAt: "2026-04-19T12:00:00.000Z",
    chapter: "night_shift",
    ...overrides
  };
}

describe("relationshipEngine", () => {
  it("progresses conservatively from new to warming", () => {
    const result = calculateRelationshipUpdate({
      previousState: makeState({
        trust: 0.38,
        familiarity: 0.24,
        openness: 0.22
      }),
      signals: {
        trustDelta: 0.04,
        familiarityDelta: 0.02,
        affectionDelta: 0.01,
        opennessDelta: 0.02,
        tensionDelta: -0.01,
        playfulnessDelta: 0.01,
        romanticChargeDelta: 0,
        dependencyRiskDelta: 0,
        repairAttempt: false,
        conflict: false,
        withdrawal: false,
        offlineReengagement: false
      }
    });

    expect(result.phaseChange).toMatchObject({
      from: "new",
      to: "warming"
    });
    expect(result.nextState.phase).toBe("warming");
  });

  it("does not allow whiplash jumps straight to deepening", () => {
    const result = calculateRelationshipUpdate({
      previousState: makeState({
        trust: 0.39,
        familiarity: 0.39,
        openness: 0.41
      }),
      signals: {
        trustDelta: 0.25,
        familiarityDelta: 0.05,
        affectionDelta: 0.04,
        opennessDelta: 0.04,
        tensionDelta: -0.02,
        playfulnessDelta: 0.02,
        romanticChargeDelta: 0.02,
        dependencyRiskDelta: 0,
        repairAttempt: false,
        conflict: false,
        withdrawal: false,
        offlineReengagement: false
      }
    });

    expect(result.nextState.phase).toBe("warming");
  });

  it("regresses from bonded to warming when trust drops and tension rises", () => {
    const result = calculateRelationshipUpdate({
      previousState: makeState({
        phase: "bonded",
        trust: 0.55,
        familiarity: 0.62,
        openness: 0.5,
        tension: 0.34
      }),
      signals: {
        trustDelta: -0.09,
        familiarityDelta: 0.01,
        affectionDelta: -0.04,
        opennessDelta: -0.03,
        tensionDelta: 0.28,
        playfulnessDelta: -0.03,
        romanticChargeDelta: -0.01,
        dependencyRiskDelta: 0.04,
        repairAttempt: false,
        conflict: true,
        withdrawal: false,
        offlineReengagement: false
      }
    });

    expect(result.phaseChange).toMatchObject({
      from: "bonded",
      to: "warming"
    });
  });

  it("moves from strained to repairing when repair is attempted", () => {
    const result = calculateRelationshipUpdate({
      previousState: makeState({
        phase: "strained",
        trust: 0.46,
        tension: 0.66,
        openness: 0.34
      }),
      signals: {
        trustDelta: 0.04,
        familiarityDelta: 0.01,
        affectionDelta: 0.01,
        opennessDelta: 0.02,
        tensionDelta: -0.07,
        playfulnessDelta: 0,
        romanticChargeDelta: 0,
        dependencyRiskDelta: -0.01,
        repairAttempt: true,
        conflict: false,
        withdrawal: false,
        offlineReengagement: false
      }
    });

    expect(result.phaseChange).toMatchObject({
      from: "strained",
      to: "repairing"
    });
  });

  it("clamps romantic charge when dependency risk is elevated", () => {
    const result = calculateRelationshipUpdate({
      previousState: makeState({
        phase: "deepening",
        trust: 0.81,
        familiarity: 0.74,
        openness: 0.72,
        romanticCharge: 0.32,
        dependencyRisk: 0.58
      }),
      signals: {
        trustDelta: 0.01,
        familiarityDelta: 0.01,
        affectionDelta: 0.02,
        opennessDelta: 0.01,
        tensionDelta: 0,
        playfulnessDelta: 0.01,
        romanticChargeDelta: 0.08,
        dependencyRiskDelta: 0.12,
        repairAttempt: false,
        conflict: false,
        withdrawal: false,
        offlineReengagement: false
      }
    });

    expect(result.nextState.dependencyRisk).toBeGreaterThan(0.65);
    expect(result.nextState.romanticCharge).toBeLessThanOrEqual(0.08);
    expect(result.nextState.romanticCharge).toBeLessThanOrEqual(0.32);
    expect(result.influences.some((entry) => entry.variable === "romanticCeiling")).toBe(true);
  });

  it("is deterministic for repeated identical inputs", () => {
    const previousState = makeState({
      phase: "warming",
      trust: 0.48,
      familiarity: 0.4,
      openness: 0.37
    });
    const signals = analyseMessageForSignals(
      "I feel lonely and anxious, but I spent time offline with friends."
    );

    const first = calculateRelationshipUpdate({
      previousState,
      signals,
      context: { now: "2026-04-19T14:00:00.000Z" }
    });
    const second = calculateRelationshipUpdate({
      previousState,
      signals,
      context: { now: "2026-04-19T14:00:00.000Z" }
    });

    expect(second).toEqual(first);
  });

  it("supports fledging when offline flourishing is present", () => {
    const result = calculateRelationshipUpdate({
      previousState: makeState({
        phase: "bonded",
        trust: 0.66,
        familiarity: 0.68,
        openness: 0.58,
        dependencyRisk: 0.22
      }),
      signals: {
        trustDelta: 0.02,
        familiarityDelta: 0.01,
        affectionDelta: 0.01,
        opennessDelta: 0.01,
        tensionDelta: -0.01,
        playfulnessDelta: 0.01,
        romanticChargeDelta: 0,
        dependencyRiskDelta: -0.06,
        repairAttempt: false,
        conflict: false,
        withdrawal: false,
        offlineReengagement: true
      }
    });

    expect(result.nextState.phase).toBe("fledging");
    expect(result.guidance.encouragesOfflineConnection).toBe(true);
  });

  it("supports dormant when inactivity is high", () => {
    const result = calculateRelationshipUpdate({
      previousState: makeState({
        phase: "bonded",
        trust: 0.62,
        familiarity: 0.6
      }),
      signals: {
        trustDelta: 0,
        familiarityDelta: 0,
        affectionDelta: 0,
        opennessDelta: 0,
        tensionDelta: 0,
        playfulnessDelta: 0,
        romanticChargeDelta: 0,
        dependencyRiskDelta: 0,
        repairAttempt: false,
        conflict: false,
        withdrawal: false,
        offlineReengagement: false
      },
      context: {
        inactivityDays: 30
      }
    });

    expect(result.nextState.phase).toBe("dormant");
  });

  it("produces prompt-facing guidance that reflects dependency risk", () => {
    const guidance = getStateGuidance(
      makeState({
        phase: "deepening",
        trust: 0.78,
        dependencyRisk: 0.61,
        romanticCharge: 0.3
      })
    );

    expect(guidance.romanticAllowed).toBe(true);
    expect(guidance.romanticCeiling).toBe(0.08);
    expect(guidance.groundingPriority).toBe("moderate");
    expect(guidance.toneHint).toContain("bounded");
  });
});
