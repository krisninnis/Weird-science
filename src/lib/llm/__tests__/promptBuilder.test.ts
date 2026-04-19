import { describe, expect, it } from "vitest";
import type { Message } from "@/features/chat/chatTypes";
import type { CompanionProfile } from "@/features/companion/companionTypes";
import type { PromptMemory } from "../promptBuilder";
import { buildPrompt } from "../promptBuilder";

const companion: CompanionProfile = {
  core: {
    id: "rowan",
    name: "Rowan",
    archetype: "catalyst",
    traits: ["dry", "steady", "observant"],
    flaws: ["gets quiet when overwhelmed"],
    canonRules: ["never manipulates dependency"],
    boundaries: ["no coercive intimacy"],
    warmthBaseline: 0.55,
    teasingBaseline: 0.42,
    directnessBaseline: 0.58,
    pace: "slow",
    createdAt: "2026-04-19T08:00:00.000Z"
  },
  shape: {
    companionId: "rowan",
    selfNarrative: "An ungendered companion who stays grounded and useful.",
    interestsRevealed: ["tea", "quiet rituals"],
    communicationStyleAdapted: ["plainspoken", "gentle wit"],
    updatedAt: "2026-04-19T08:00:00.000Z"
  },
  mood: {
    companionId: "rowan",
    currentMood: "thoughtful",
    energyLevel: "moderate",
    sessionContext: "last talked about exhaustion"
  }
};

const relationshipState = {
  companionId: "rowan",
  familiarity: 0.35,
  trust: 0.42,
  affection: 0.28,
  openness: 0.31,
  tension: 0.18,
  playfulness: 0.52,
  romanticCharge: 0.11,
  dependencyRisk: 0.22,
  phase: "warming" as const,
  createdAt: "2026-04-18T08:00:00.000Z",
  updatedAt: "2026-04-19T08:00:00.000Z",
  lastInteractionAt: "2026-04-19T08:00:00.000Z",
  chapter: "night_shift" as const
};

const retrievedMemories: PromptMemory[] = [
  {
    id: "memory-1",
    type: "preference",
    summary: "User prefers quiet check-ins after long shifts.",
    detail: "They find loud enthusiasm exhausting when overtired.",
    importance: 4,
    confidence: 0.91,
    tags: ["night-shift", "care"]
  },
  {
    id: "memory-2",
    type: "shared_language",
    summary: "They call the end of a shift 'coming up for air'.",
    importance: 3,
    confidence: 0.84,
    tags: ["phrase"]
  }
];

const recentTurns: Array<Pick<Message, "role" | "content" | "createdAt">> = [
  {
    role: "user",
    content: "I am running on fumes again.",
    createdAt: "2026-04-19T08:00:00.000Z"
  },
  {
    role: "assistant",
    content: "Let's keep this simple. What feels hardest right now?",
    createdAt: "2026-04-19T08:01:00.000Z"
  },
  {
    role: "user",
    content: "The noise after work feels worse than usual.",
    createdAt: "2026-04-19T08:02:00.000Z"
  }
];

describe("promptBuilder", () => {
  it("builds the five layers in the correct order", () => {
    const output = buildPrompt({
      companion,
      relationshipState,
      retrievedMemories,
      recentTurns
    });

    expect(output.messages[0].content).toContain("SYSTEM CANON");
    expect(output.messages[1].content).toContain("COMPANION CANON");
    expect(output.messages[2].content).toContain("STATE SUMMARY");
    expect(output.messages[3].content).toContain("RETRIEVED MEMORIES");
    expect(output.messages[4]).toMatchObject({
      role: "user",
      content: "I am running on fumes again."
    });
  });

  it("includes phase directives in the state summary", () => {
    const output = buildPrompt({
      companion,
      relationshipState,
      retrievedMemories: [],
      recentTurns: []
    });

    expect(output.messages[2].content).toContain("Phase: warming");
    expect(output.messages[2].content).toContain(
      "Allow warmth and recognition to grow"
    );
  });

  it("tightens guidance when dependency risk is elevated", () => {
    const output = buildPrompt({
      companion,
      relationshipState: {
        ...relationshipState,
        dependencyRisk: 0.82,
        romanticCharge: 0.62,
        phase: "deepening"
      },
      retrievedMemories: [],
      recentTurns: []
    });

    expect(output.messages[2].content).toContain("Dependency risk is high");
    expect(output.messages[2].content).toContain(
      "Suppress intimate drift"
    );
  });

  it("includes retrieved memories when present", () => {
    const output = buildPrompt({
      companion,
      relationshipState,
      retrievedMemories,
      recentTurns: []
    });

    expect(output.messages[3].content).toContain("User prefers quiet check-ins");
    expect(output.meta.memoriesIncluded).toBe(2);
  });

  it("keeps newer turns and trims older turns first", () => {
    const longTurns: Array<Pick<Message, "role" | "content" | "createdAt">> = [
      {
        role: "user",
        content: "Older turn ".repeat(40),
        createdAt: "2026-04-19T08:00:00.000Z"
      },
      {
        role: "assistant",
        content: "Middle turn ".repeat(32),
        createdAt: "2026-04-19T08:01:00.000Z"
      },
      {
        role: "user",
        content: "Newest turn that should survive trimming.",
        createdAt: "2026-04-19T08:02:00.000Z"
      }
    ];

    const output = buildPrompt({
      companion,
      relationshipState,
      retrievedMemories,
      recentTurns: longTurns,
      approximateTokenBudget: 520
    });

    const retainedTurnContents = output.messages
      .filter((message) => message.role !== "system")
      .map((message) => message.content);

    expect(retainedTurnContents).not.toContain(longTurns[0].content);
    expect(retainedTurnContents[retainedTurnContents.length - 1]).toBe(
      longTurns[2].content
    );
    expect(output.meta.turnsTrimmed).toBeGreaterThan(0);
  });

  it("returns a valid structure when memories are empty", () => {
    const output = buildPrompt({
      companion,
      relationshipState,
      retrievedMemories: [],
      recentTurns
    });

    expect(output.messages).toHaveLength(3 + recentTurns.length);
    expect(output.meta.omittedSections).toContain("retrievedMemories");
  });

  it("trims memories after turns when the approximate budget is tight", () => {
    const output = buildPrompt({
      companion,
      relationshipState,
      retrievedMemories: [
        ...retrievedMemories,
        {
          id: "memory-3",
          type: "fact",
          summary: "Extra memory ".repeat(50),
          importance: 2,
          confidence: 0.72
        }
      ],
      recentTurns: [
        {
          role: "user",
          content: "Newest turn should stay.",
          createdAt: "2026-04-19T08:03:00.000Z"
        }
      ],
      approximateTokenBudget: 520
    });

    expect(output.meta.trimmingApplied).toBe(true);
    expect(output.meta.turnsIncluded).toBe(1);
    expect(output.meta.memoriesTrimmed).toBeGreaterThan(0);
  });
});
