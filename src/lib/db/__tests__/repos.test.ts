import { describe, expect, it } from "vitest";
import { createRepositories } from "../repositories";
import { RepositoryError } from "../rowSchemas";
import { createTestDb, seedCompanion, seedConversation } from "./testDb";

describe("repositories", () => {
  it("messages append, listByConversation, and listRecentForCompanion respect ordering and limits", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    const companion = await seedCompanion(db, { id: "mara", name: "Mara" });
    const conversation = await seedConversation(db, companion.core.id);

    await repositories.messages.appendMessage({
      conversationId: conversation.id,
      role: "user",
      content: "first",
    });
    await repositories.messages.appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "second",
    });
    await repositories.messages.appendMessage({
      conversationId: conversation.id,
      role: "user",
      content: "third",
    });

    const byConversation = await repositories.messages.listByConversation(
      conversation.id,
      2
    );
    const recent = await repositories.messages.listRecentForCompanion(
      companion.core.id,
      2
    );

    expect(byConversation.map((message) => message.content)).toEqual([
      "second",
      "third",
    ]);
    expect(recent.map((message) => message.content)).toEqual(["third", "second"]);

    await db.close();
  });

  it("memories roundtrip, embedding ranking, fade clamp, and reinforcement increment work", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    await seedCompanion(db, { id: "iris", name: "Iris", archetype: "reflective" });

    const first = await repositories.memories.insert({
      companionId: "iris",
      type: "fact",
      summary: "User likes tea",
      detail: "User likes jasmine tea.",
      subject: "user",
      importance: 3,
      confidence: 0.8,
      valence: "positive",
      sourceMessageIds: ["m1"],
      tags: ["tea"],
      userEditable: true,
      pinned: false,
      status: "active",
      embedding: [1, 0],
      embeddingModel: "test-embed",
    });
    const second = await repositories.memories.insert({
      companionId: "iris",
      type: "preference",
      summary: "User hates rain",
      detail: "User hates the commute in rain.",
      subject: "user",
      importance: 2,
      confidence: 0.7,
      valence: "negative",
      sourceMessageIds: ["m2"],
      tags: ["rain"],
      userEditable: true,
      pinned: false,
      status: "active",
      embedding: [0.5, 0.5],
      embeddingModel: "test-embed",
    });
    const third = await repositories.memories.insert({
      companionId: "iris",
      type: "routine",
      summary: "User runs mornings",
      detail: "User runs every morning.",
      subject: "user",
      importance: 4,
      confidence: 0.9,
      valence: "neutral",
      sourceMessageIds: ["m3"],
      tags: ["running"],
      userEditable: true,
      pinned: true,
      status: "active",
      embedding: [0, 1],
      embeddingModel: "test-embed",
    });

    const fetched = await repositories.memories.getById(first.id);
    await repositories.memories.updateEmbedding(second.id, [0.9, 0.1], "test-embed-v2");
    await repositories.memories.updateFadeFactor(first.id, 3);
    await repositories.memories.incrementReinforcement(first.id);
    const ranked = await repositories.memories.topKByEmbedding([1, 0], 3, {
      companionId: "iris",
    });
    const updated = await repositories.memories.getById(first.id);

    expect(fetched?.summary).toBe("User likes tea");
    expect(updated?.fadeFactor).toBe(1);
    expect(updated?.reinforcementCount).toBe(1);
    expect(ranked.map((memory) => memory.id)).toEqual([first.id, second.id, third.id]);

    await db.close();
  });

  it("relationship state ensureInitialState is idempotent and update merges patches", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    await seedCompanion(db, { id: "rowan", name: "Rowan" });

    const initial = {
      companionId: "rowan",
      familiarity: 0.1,
      trust: 0.2,
      affection: 0.2,
      openness: 0.15,
      tension: 0,
      playfulness: 0.3,
      romanticCharge: 0,
      dependencyRisk: 0,
      phase: "new" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastInteractionAt: null,
      chapter: null,
    };

    const current = await repositories.relationshipState.ensureInitialState(
      "rowan",
      initial
    );
    const repeated = await repositories.relationshipState.ensureInitialState(
      "rowan",
      { ...initial, trust: 0.9 }
    );
    const updated = await repositories.relationshipState.update("rowan", {
      trust: 0.5,
      phase: "warming",
    });

    expect(current.trust).toBe(0.2);
    expect(repeated.trust).toBe(0.2);
    expect(updated.trust).toBe(0.5);
    expect(updated.phase).toBe("warming");

    await expect(
      repositories.relationshipState.update("rowan", {
        companionId: "other",
      })
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });

    await db.close();
  });

  it("response influences writeBatch rolls back on error and reads rows back", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    const companion = await seedCompanion(db, { id: "mara", name: "Mara" });
    const conversation = await seedConversation(db, companion.core.id);
    const memory = await repositories.memories.insert({
      companionId: companion.core.id,
      type: "fact",
      summary: "User prefers quiet cafes",
      detail: "User prefers quiet cafes for reading.",
      subject: "user",
      importance: 3,
      confidence: 0.7,
      valence: "neutral",
      sourceMessageIds: ["user-msg"],
      tags: ["cafes"],
      userEditable: true,
      pinned: false,
      status: "active",
    });
    const message = await repositories.messages.appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "Noted.",
    });

    const originalExecute = db.execute;
    let callCount = 0;
    db.execute = async (query, params) => {
      callCount += 1;
      if (query.includes("INSERT INTO response_state_influences")) {
        throw new Error("boom");
      }
      return originalExecute(query, params);
    };

    await expect(
      repositories.responseInfluences.writeBatch(
        message.id,
        [{ memoryId: memory.id, usage: "used", weight: 0.8 }],
        [{ variable: "trust", value: 0.5, influence: "steady tone" }]
      )
    ).rejects.toThrow("boom");

    db.execute = originalExecute;

    const rolledBackMemoryRows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM response_memory_uses WHERE message_id = ?",
      [message.id]
    );
    expect(rolledBackMemoryRows[0].count).toBe(0);

    await repositories.responseInfluences.writeBatch(
      message.id,
      [{ memoryId: memory.id, usage: "used", weight: 0.8 }],
      [{ variable: "trust", value: 0.5, influence: "steady tone" }]
    );

    const influences = await repositories.responseInfluences.getForMessage(
      message.id
    );
    expect(influences.memoryUses).toEqual([
      { memoryId: memory.id, usage: "used", weight: 0.8 },
    ]);
    expect(influences.stateInfluences).toEqual([
      { variable: "trust", value: 0.5, influence: "steady tone" },
    ]);
    expect(callCount).toBeGreaterThan(0);

    await db.close();
  });

  it("companions insert, updateShape, updateMood, and immutable core guard behave correctly", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);

    const inserted = await repositories.companions.insert({
      id: "companion-1",
      name: "Mara",
      archetype: "grounded",
      core: {
        id: "mismatch",
        name: "Wrong",
        archetype: "grounded",
        traits: ["steady"],
        flaws: ["quiet when tired"],
        canonRules: ["never guilt-trips the user"],
        boundaries: ["no shaming"],
        warmthBaseline: 0.8,
        teasingBaseline: 0.2,
        directnessBaseline: 0.6,
        pace: "slow",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      shape: {
        companionId: "mismatch",
        selfNarrative: "Protective and grounded.",
        interestsRevealed: ["gardening"],
        communicationStyleAdapted: ["warmly direct"],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      mood: {
        companionId: "mismatch",
        currentMood: "warm",
        energyLevel: "moderate",
        sessionContext: null,
      },
    });

    const reshaped = await repositories.companions.updateShape("companion-1", {
      selfNarrative: "Protective and patient.",
    });
    const remooded = await repositories.companions.updateMood("companion-1", {
      currentMood: "focused",
    });

    expect(inserted.core.id).toBe("companion-1");
    expect(reshaped.shape.selfNarrative).toBe("Protective and patient.");
    expect(reshaped.core.name).toBe("Mara");
    expect(remooded.mood.currentMood).toBe("focused");
    expect(remooded.shape.selfNarrative).toBe("Protective and patient.");

    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    await expect(
      repositories.companions.__debugForceCoreOverwrite("companion-1", {
        ...inserted.core,
        traits: ["changed"],
      })
    ).rejects.toMatchObject({
      code: "IMMUTABLE_CORE_VIOLATION",
    });

    process.env.NODE_ENV = originalNodeEnv;
    await db.close();
  });

  it("milestones insert and listByCompanion order newest first", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    await seedCompanion(db, { id: "iris", name: "Iris", archetype: "reflective" });

    await repositories.milestones.insert({
      companionId: "iris",
      title: "First disclosure",
      description: "Shared something tender.",
      occurredAt: "2026-01-01T00:00:00.000Z",
    });
    await repositories.milestones.insert({
      companionId: "iris",
      title: "Repair conversation",
      description: "Named a rupture and repaired it.",
      occurredAt: "2026-02-01T00:00:00.000Z",
    });

    const milestones = await repositories.milestones.listByCompanion("iris", 10);
    expect(milestones.map((milestone) => milestone.title)).toEqual([
      "Repair conversation",
      "First disclosure",
    ]);

    await db.close();
  });

  it("withTransaction rolls back on throw", async () => {
    const db = createTestDb();
    const repositories = createRepositories(db);
    const companion = await seedCompanion(db, { id: "txn", name: "Txn" });
    const conversation = await seedConversation(db, companion.core.id);
    const message = await repositories.messages.appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "Testing",
    });

    const originalExecute = db.execute;
    db.execute = async (query, params) => {
      if (query.includes("INSERT INTO response_state_influences")) {
        throw new Error("forced rollback");
      }
      return originalExecute(query, params);
    };

    await expect(
      repositories.responseInfluences.writeBatch(
        message.id,
        [],
        [{ variable: "trust", value: 0.2, influence: "test" }]
      )
    ).rejects.toThrow("forced rollback");

    db.execute = originalExecute;
    const rows = await db.select<Array<{ count: number }>>(
      "SELECT COUNT(*) as count FROM response_state_influences WHERE message_id = ?",
      [message.id]
    );
    expect(rows[0].count).toBe(0);

    await db.close();
  });

  it("repository errors expose the expected name", () => {
    const error = new RepositoryError(
      "INVALID_INPUT",
      "memories",
      "bad input"
    );

    expect(error.name).toBe("RepositoryError");
  });
});
