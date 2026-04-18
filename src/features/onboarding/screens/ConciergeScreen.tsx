import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCompanion,
  getCompanionById
} from "@/features/companion/repository/companionRepository";
import {
  createRelationshipState,
  getRelationshipState
} from "@/features/relationship/repository/relationshipRepository";
import {
  saveOnboardingSelection,
  type ChapterType,
  type PresenceType
} from "../onboardingStorage";

type CompanionId = "mara" | "iris" | "rowan";

const chapterLabels: Record<ChapterType, string> = {
  general_loneliness: "General loneliness",
  grief: "Grief",
  recovery: "Recovery",
  caregiving_isolation: "Caregiving isolation",
  relocation: "Relocation",
  night_shift: "Night shift"
};

const presenceLabels: Record<PresenceType, string> = {
  steady: "Steady",
  reflective: "Reflective",
  catalytic: "Catalytic"
};

function companionForPresence(presence: PresenceType): CompanionId {
  if (presence === "steady") return "mara";
  if (presence === "reflective") return "iris";
  return "rowan";
}

function buildSeedCompanion(companionId: CompanionId) {
  if (companionId === "mara") {
    return {
      id: "mara",
      name: "Mara",
      archetype: "grounded" as const,
      core_json: JSON.stringify({
        role: "protector",
        traits: ["steady", "warm", "observant", "grounding"],
        tone: "calm, warm, reassuring",
        relationshipPace: "slow"
      }),
      shape_json: JSON.stringify({
        learnedPreferences: [],
        sharedReferences: [],
        adaptiveToneBias: "gentle"
      }),
      mood_json: JSON.stringify({
        currentMood: "calm",
        energy: 0.45,
        warmth: 0.75
      }),
      created_at: new Date().toISOString()
    };
  }

  if (companionId === "iris") {
    return {
      id: "iris",
      name: "Iris",
      archetype: "reflective" as const,
      core_json: JSON.stringify({
        role: "mentor",
        traits: [
          "thoughtful",
          "reflective",
          "careful",
          "emotionally intelligent"
        ],
        tone: "calm, reflective, clear",
        relationshipPace: "slow"
      }),
      shape_json: JSON.stringify({
        learnedPreferences: [],
        sharedReferences: [],
        adaptiveToneBias: "reflective"
      }),
      mood_json: JSON.stringify({
        currentMood: "attentive",
        energy: 0.4,
        warmth: 0.65
      }),
      created_at: new Date().toISOString()
    };
  }

  return {
    id: "rowan",
    name: "Rowan",
    archetype: "catalyst" as const,
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
  };
}

export default function ConciergeScreen() {
  const navigate = useNavigate();
  const [presence, setPresence] = useState<PresenceType | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recommendedCompanion = useMemo(() => {
    if (!presence) return null;
    return companionForPresence(presence);
  }, [presence]);

  async function handleContinue() {
    if (!presence || !chapter || !recommendedCompanion) return;

    setIsSaving(true);

    try {
      const existingCompanion = await getCompanionById(recommendedCompanion);

      if (!existingCompanion) {
        await createCompanion(buildSeedCompanion(recommendedCompanion));
      }

      const existingRelationship =
        await getRelationshipState(recommendedCompanion);

      if (!existingRelationship) {
        await createRelationshipState(recommendedCompanion, chapter);
      }

      saveOnboardingSelection({
        companionId: recommendedCompanion,
        chapter,
        presence
      });

      navigate("/chat");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section>
      <h1>Concierge</h1>
      <p>
        Let’s choose the kind of companion presence that fits where you are
        right now.
      </p>

      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          border: "1px solid #333",
          borderRadius: "12px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>What kind of presence do you need?</h2>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "12px"
          }}
        >
          {(["steady", "reflective", "catalytic"] as PresenceType[]).map(
            (option) => (
              <button
                key={option}
                onClick={() => setPresence(option)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "1px solid #444",
                  background: presence === option ? "#2f2f2f" : "#1a1a1a",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                {presenceLabels[option]}
              </button>
            )
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "16px",
          border: "1px solid #333",
          borderRadius: "12px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>What chapter are you in?</h2>
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "12px"
          }}
        >
          {(
            [
              "general_loneliness",
              "grief",
              "recovery",
              "caregiving_isolation",
              "relocation",
              "night_shift"
            ] as ChapterType[]
          ).map((option) => (
            <button
              key={option}
              onClick={() => setChapter(option)}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid #444",
                background: chapter === option ? "#2f2f2f" : "#1a1a1a",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              {chapterLabels[option]}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "16px",
          border: "1px solid #333",
          borderRadius: "12px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Recommendation</h2>
        {recommendedCompanion ? (
          <p>
            Based on your selection, I’d start you with{" "}
            <strong>
              {recommendedCompanion.charAt(0).toUpperCase() +
                recommendedCompanion.slice(1)}
            </strong>
            .
          </p>
        ) : (
          <p>Choose a presence first to see a recommendation.</p>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => {
            void handleContinue();
          }}
          disabled={!presence || !chapter || isSaving}
          style={{
            padding: "12px 18px",
            borderRadius: "10px",
            border: "1px solid #444",
            background:
              !presence || !chapter || isSaving ? "#1a1a1a" : "#2a2a2a",
            color: "#fff",
            cursor:
              !presence || !chapter || isSaving ? "not-allowed" : "pointer",
            opacity: !presence || !chapter || isSaving ? 0.6 : 1
          }}
        >
          {isSaving ? "Saving..." : "Continue"}
        </button>
      </div>
    </section>
  );
}