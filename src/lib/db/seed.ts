import {
  createCompanion,
  getCompanionById
} from "@/features/companion/repository/companionRepository";

import {
  createRelationshipState,
  getRelationshipState
} from "@/features/relationship/repository/relationshipRepository";

export async function seedInitialData(): Promise<void> {
  const existing = await getCompanionById("rowan");

  if (!existing) {
    await createCompanion({
      id: "rowan",
      name: "Rowan",
      archetype: "catalyst",
      core_json: JSON.stringify({
        role: "catalyst",
        traits: ["steady", "dry", "gently challenging", "emotionally safe"],
        tone: "calm, lightly irreverent, grounded",
        relationshipPace: "slow"
      }),
      shape_json: JSON.stringify({
        learnedPreferences: [],
        sharedReferences: [],
        adaptiveToneBias: "neutral"
      }),
      mood_json: JSON.stringify({
        currentMood: "calm",
        energy: 0.5,
        warmth: 0.6
      }),
      created_at: new Date().toISOString()
    });
  }

  const relationship = await getRelationshipState("rowan");

  if (!relationship) {
    await createRelationshipState("rowan", "general_loneliness");
  }

  const seededCompanion = await getCompanionById("rowan");
  const seededRelationship = await getRelationshipState("rowan");

  console.log("SEEDED COMPANION:", seededCompanion);
  console.log("SEEDED RELATIONSHIP:", seededRelationship);
}
