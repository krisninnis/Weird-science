import type { Message } from "@/features/chat/chatTypes";
import type { CompanionProfile } from "@/features/companion/companionTypes";
import type { MemoryRecord } from "@/features/memory/memoryTypes";
import type {
  ChapterContext,
  RelationshipPhase,
  RelationshipState
} from "@/features/relationship/relationshipTypes";
import type { ChatMessage } from "./ollamaClient";

const DEFAULT_APPROX_TOKEN_BUDGET = 2400;
const APPROX_CHARS_PER_TOKEN = 4;

export interface PromptMemory {
  id: string;
  type: MemoryRecord["type"];
  summary: string;
  detail?: string;
  importance: number;
  confidence: number;
  tags?: string[];
}

export interface PromptBuilderInput {
  companion: CompanionProfile;
  relationshipState: RelationshipState;
  retrievedMemories: PromptMemory[];
  recentTurns: Array<Pick<Message, "role" | "content" | "createdAt">>;
  approximateTokenBudget?: number;
  maxMemories?: number;
  maxRecentTurns?: number;
  dialoguePath?: "local" | "hosted";
}

export interface PromptBuilderMeta {
  approximateTokenBudget: number;
  approximateTokensUsed: number;
  memoriesIncluded: number;
  turnsIncluded: number;
  memoriesTrimmed: number;
  turnsTrimmed: number;
  trimmingApplied: boolean;
  omittedSections: string[];
}

export interface PromptBuilderOutput {
  messages: ChatMessage[];
  meta: PromptBuilderMeta;
}

interface PromptSection {
  name:
    | "systemCanon"
    | "companionCanon"
    | "stateSummary"
    | "retrievedMemories"
    | "recentTurns";
  role: ChatMessage["role"];
  content: string;
  approxTokens: number;
}

function approximateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / APPROX_CHARS_PER_TOKEN));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatScalar(value: number): string {
  return clamp01(value).toFixed(2);
}

function chapterLabel(chapter: ChapterContext | null): string {
  if (!chapter) {
    return "unspecified";
  }

  return chapter.replaceAll("_", " ");
}

function buildSystemCanonSection(dialoguePath?: "local" | "hosted"): PromptSection {
  const pathLine =
    dialoguePath === "local"
      ? "This is the local dialogue path; stay concise and grounded."
      : dialoguePath === "hosted"
        ? "This is the hosted dialogue path; stay grounded and do not dramatize."
        : "Stay grounded and do not dramatize.";

  const content = [
    "SYSTEM CANON",
    "You are Weird Science, a private desktop companion rather than a generic assistant.",
    "The relationship evolves slowly and credibly.",
    "Do not rush intimacy, imply exclusivity, or encourage dependence.",
    "Dignity over retention: support the user flourishing beyond the app.",
    "Let memory influence continuity, but do not mention internal implementation details unless product UX explicitly surfaces them.",
    "Tone must remain phase-appropriate, emotionally safe, and non-manipulative.",
    pathLine
  ].join("\n");

  return {
    name: "systemCanon",
    role: "system",
    content,
    approxTokens: approximateTokens(content)
  };
}

function buildCompanionCanonSection(companion: CompanionProfile): PromptSection {
  const { core, shape, mood } = companion;
  const content = [
    "COMPANION CANON",
    `Name: ${core.name}`,
    `Archetype: ${core.archetype}`,
    `Stable traits: ${core.traits.join(", ") || "none recorded"}`,
    `Known flaws: ${core.flaws.join(", ") || "none recorded"}`,
    `Hard rules: ${core.canonRules.join("; ") || "none recorded"}`,
    `Boundaries: ${core.boundaries.join("; ") || "none recorded"}`,
    `Baselines: warmth ${formatScalar(core.warmthBaseline)}, teasing ${formatScalar(core.teasingBaseline)}, directness ${formatScalar(core.directnessBaseline)}, pace ${core.pace}.`,
    `Relationship-shaped narrative: ${shape.selfNarrative}`,
    `Adapted communication: ${shape.communicationStyleAdapted.join(", ") || "none yet"}`,
    `Interests revealed: ${shape.interestsRevealed.join(", ") || "none yet"}`,
    `Current mood: ${mood.currentMood}, energy ${mood.energyLevel}${mood.sessionContext ? `, context ${mood.sessionContext}` : ""}.`
  ].join("\n");

  return {
    name: "companionCanon",
    role: "system",
    content,
    approxTokens: approximateTokens(content)
  };
}

function phaseDirective(phase: RelationshipPhase): string {
  switch (phase) {
    case "new":
      return "Keep introductions light, attentive, and bounded. Do not imply deep familiarity.";
    case "warming":
      return "Allow warmth and recognition to grow, but keep disclosure measured and earned.";
    case "bonded":
      return "Shared rhythm can feel established, but stay grounded and avoid possessiveness.";
    case "deepening":
      return "Permit more emotional range and depth, while remaining careful and non-clingy.";
    case "strained":
      return "Acknowledge friction plainly. Reduce playfulness and avoid false reassurance.";
    case "repairing":
      return "Lean toward clarity, accountability, and gentle steadiness while repair is ongoing.";
    case "fledging":
      return "Root for the user's independence. Encourage wider life beyond the companion.";
    case "dormant":
      return "Be quiet, respectful, and non-demanding. No guilt, pressure, or implied waiting.";
    default:
      return "Stay phase-appropriate and grounded.";
  }
}

function dependencyDirective(dependencyRisk: number): string {
  if (dependencyRisk >= 0.75) {
    return "Dependency risk is high. Suppress intimate drift, reduce emotional exclusivity, avoid romantic escalation, and gently orient the user back toward offline supports and real-world life.";
  }

  if (dependencyRisk >= 0.45) {
    return "Dependency risk is elevated. Keep closeness bounded, avoid language that centers the companion as primary or irreplaceable, and favor grounding over attachment reinforcement.";
  }

  return "Dependency risk is contained. Warmth is allowed, but do not slide into manipulative intimacy or exclusivity.";
}

function buildStateSummarySection(
  relationshipState: RelationshipState
): PromptSection {
  const content = [
    "STATE SUMMARY",
    `Phase: ${relationshipState.phase}`,
    `Chapter: ${chapterLabel(relationshipState.chapter)}`,
    `State values: trust ${formatScalar(relationshipState.trust)}, familiarity ${formatScalar(relationshipState.familiarity)}, openness ${formatScalar(relationshipState.openness)}, tension ${formatScalar(relationshipState.tension)}, playfulness ${formatScalar(relationshipState.playfulness)}, romanticCharge ${formatScalar(relationshipState.romanticCharge)}, dependencyRisk ${formatScalar(relationshipState.dependencyRisk)}.`,
    phaseDirective(relationshipState.phase),
    dependencyDirective(relationshipState.dependencyRisk),
    relationshipState.tension >= 0.55
      ? "Tension is materially present. Prefer steadiness, precision, and repair-minded wording."
      : "Keep the tone emotionally steady and proportionate to the user's actual message.",
    relationshipState.playfulness >= 0.6 && relationshipState.tension < 0.45
      ? "Light playfulness is allowed if it feels natural and not deflective."
      : "Do not force playfulness."
  ].join("\n");

  return {
    name: "stateSummary",
    role: "system",
    content,
    approxTokens: approximateTokens(content)
  };
}

function formatMemory(memory: PromptMemory): string {
  const details: string[] = [
    `${memory.type}: ${memory.summary}`,
    `importance ${memory.importance}`,
    `confidence ${memory.confidence.toFixed(2)}`
  ];

  if (memory.detail) {
    details.push(`detail ${memory.detail}`);
  }

  if (memory.tags?.length) {
    details.push(`tags ${memory.tags.join(", ")}`);
  }

  return `- ${details.join(" | ")}`;
}

function buildMemorySection(memories: PromptMemory[]): PromptSection | null {
  if (memories.length === 0) {
    return null;
  }

  const content = [
    "RETRIEVED MEMORIES",
    "Use these only if relevant. They may be incomplete; do not force them into the reply.",
    ...memories.map(formatMemory)
  ].join("\n");

  return {
    name: "retrievedMemories",
    role: "system",
    content,
    approxTokens: approximateTokens(content)
  };
}

function normalizeRecentTurns(
  recentTurns: Array<Pick<Message, "role" | "content" | "createdAt">>,
  maxRecentTurns?: number
): ChatMessage[] {
  const sorted = [...recentTurns].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
  const trimmed =
    typeof maxRecentTurns === "number" && maxRecentTurns > 0
      ? sorted.slice(-maxRecentTurns)
      : sorted;

  return trimmed.map((turn) => ({
    role: turn.role,
    content: turn.content
  }));
}

function recentTurnTokenCount(turns: ChatMessage[]): number {
  return turns.reduce(
    (total, turn) => total + approximateTokens(`${turn.role}\n${turn.content}`),
    0
  );
}

function trimTurnsToBudget(
  turns: ChatMessage[],
  allowedTokens: number
): { turns: ChatMessage[]; trimmedCount: number } {
  const kept = [...turns];
  let trimmedCount = 0;

  while (kept.length > 0 && recentTurnTokenCount(kept) > allowedTokens) {
    kept.shift();
    trimmedCount += 1;
  }

  return { turns: kept, trimmedCount };
}

function trimMemoriesToBudget(
  memories: PromptMemory[],
  baseSections: PromptSection[],
  turns: ChatMessage[],
  budget: number
): { memories: PromptMemory[]; trimmedCount: number } {
  const kept = [...memories];
  let trimmedCount = 0;

  while (kept.length > 0) {
    const memorySection = buildMemorySection(kept);
    const usedTokens =
      baseSections.reduce((total, section) => total + section.approxTokens, 0) +
      (memorySection?.approxTokens ?? 0) +
      recentTurnTokenCount(turns);

    if (usedTokens <= budget) {
      break;
    }

    kept.pop();
    trimmedCount += 1;
  }

  return { memories: kept, trimmedCount };
}

function reserveNewestTurnIfPossible(
  memories: PromptMemory[],
  baseSections: PromptSection[],
  newestTurn: ChatMessage | null,
  budget: number
): { memories: PromptMemory[]; trimmedCount: number } {
  if (!newestTurn) {
    return { memories, trimmedCount: 0 };
  }

  const kept = [...memories];
  let trimmedCount = 0;
  const newestTurnTokens = recentTurnTokenCount([newestTurn]);

  while (kept.length > 0) {
    const memorySection = buildMemorySection(kept);
    const usedTokens =
      baseSections.reduce((total, section) => total + section.approxTokens, 0) +
      (memorySection?.approxTokens ?? 0) +
      newestTurnTokens;

    if (usedTokens <= budget) {
      break;
    }

    kept.pop();
    trimmedCount += 1;
  }

  return { memories: kept, trimmedCount };
}

export function buildPrompt(input: PromptBuilderInput): PromptBuilderOutput {
  const approximateTokenBudget =
    input.approximateTokenBudget ?? DEFAULT_APPROX_TOKEN_BUDGET;

  const systemCanon = buildSystemCanonSection(input.dialoguePath);
  const companionCanon = buildCompanionCanonSection(input.companion);
  const stateSummary = buildStateSummarySection(input.relationshipState);
  const baseSections = [systemCanon, companionCanon, stateSummary];

  const recentTurns = normalizeRecentTurns(input.recentTurns, input.maxRecentTurns);

  const limitedMemories =
    typeof input.maxMemories === "number" && input.maxMemories >= 0
      ? input.retrievedMemories.slice(0, input.maxMemories)
      : [...input.retrievedMemories];

  const initialMemorySection = buildMemorySection(limitedMemories);
  const baseTokenCount =
    baseSections.reduce((total, section) => total + section.approxTokens, 0) +
    (initialMemorySection?.approxTokens ?? 0);

  const turnBudget = Math.max(0, approximateTokenBudget - baseTokenCount);
  let trimmedTurns = trimTurnsToBudget(recentTurns, turnBudget);
  let trimmedMemories = trimMemoriesToBudget(
    limitedMemories,
    baseSections,
    trimmedTurns.turns,
    approximateTokenBudget
  );

  if (recentTurns.length > 0 && trimmedTurns.turns.length === 0) {
    const reservedTurns = reserveNewestTurnIfPossible(
      trimmedMemories.memories,
      baseSections,
      recentTurns[recentTurns.length - 1] ?? null,
      approximateTokenBudget
    );

    trimmedMemories = {
      memories: reservedTurns.memories,
      trimmedCount: trimmedMemories.trimmedCount + reservedTurns.trimmedCount
    };

    const recalculatedMemorySection = buildMemorySection(trimmedMemories.memories);
    const recalculatedTurnBudget = Math.max(
      0,
      approximateTokenBudget -
        baseSections.reduce((total, section) => total + section.approxTokens, 0) -
        (recalculatedMemorySection?.approxTokens ?? 0)
    );

    trimmedTurns = trimTurnsToBudget(recentTurns, recalculatedTurnBudget);
  }

  const memorySection = buildMemorySection(trimmedMemories.memories);

  const sections: PromptSection[] = [...baseSections];

  if (memorySection) {
    sections.push(memorySection);
  }

  const messages: ChatMessage[] = [
    ...sections.map((section) => ({
      role: section.role,
      content: section.content
    })),
    ...trimmedTurns.turns
  ];

  const approximateTokensUsed =
    sections.reduce((total, section) => total + section.approxTokens, 0) +
    recentTurnTokenCount(trimmedTurns.turns);

  const omittedSections: string[] = [];

  if (!memorySection) {
    omittedSections.push("retrievedMemories");
  }

  if (trimmedTurns.turns.length === 0 && recentTurns.length > 0) {
    omittedSections.push("recentTurns");
  }

  return {
    messages,
    meta: {
      approximateTokenBudget,
      approximateTokensUsed,
      memoriesIncluded: trimmedMemories.memories.length,
      turnsIncluded: trimmedTurns.turns.length,
      memoriesTrimmed:
        input.retrievedMemories.length - trimmedMemories.memories.length,
      turnsTrimmed: recentTurns.length - trimmedTurns.turns.length,
      trimmingApplied:
        trimmedMemories.trimmedCount > 0 || trimmedTurns.trimmedCount > 0,
      omittedSections
    }
  };
}
