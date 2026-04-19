import type { RelationshipPhase } from "./relationshipTypes";

export function getTrustCapForPhase(phase: RelationshipPhase): number {
  switch (phase) {
    case "new":
      return 0.4;
    case "warming":
      return 0.6;
    case "bonded":
      return 0.75;
    case "deepening":
      return 0.9;
    default:
      return 1.0;
  }
}

export function getNextPhase(
  currentPhase: RelationshipPhase,
  trust: number
): RelationshipPhase {
  if (currentPhase === "new" && trust >= 0.4) return "warming";
  if (currentPhase === "warming" && trust >= 0.6) return "bonded";
  if (currentPhase === "bonded" && trust >= 0.75) return "deepening";

  return currentPhase;
}
