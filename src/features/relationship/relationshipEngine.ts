export type RelationshipSignals = {
  trustDelta: number;
};

export function analyseMessageForSignals(text: string): RelationshipSignals {
  const lower = text.toLowerCase();

  let trustDelta = 0;

  // vulnerability signals
  if (
    lower.includes("sad") ||
    lower.includes("lonely") ||
    lower.includes("anxious") ||
    lower.includes("scared") ||
    lower.includes("stress")
  ) {
    trustDelta += 0.05;
  }

  // openness signals
  if (
    lower.includes("i feel") ||
    lower.includes("i think") ||
    lower.includes("i'm struggling")
  ) {
    trustDelta += 0.05;
  }

  return {
    trustDelta
  };
}