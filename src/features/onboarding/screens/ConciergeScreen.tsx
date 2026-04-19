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
  createOnboardingSelection,
  saveOnboardingSelection,
  type ChapterType,
  type PresenceType
} from "../onboardingStorage";

type CompanionId = "mara" | "iris" | "rowan";

const chapterLabels: Record<ChapterType, string> = {
  caregiving_isolation: "Caregiving isolation",
  night_shift: "Night shift",
  postpartum: "Postpartum",
  expat_relocation: "Expat relocation"
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

export default function ConciergeScreen(): JSX.Element {
  const navigate = useNavigate();
  const [presence, setPresence] = useState<PresenceType | null>(null);
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recommendedCompanion = useMemo(() => {
    if (!presence) return null;
    return companionForPresence(presence);
  }, [presence]);

  async function handleContinue(): Promise<void> {
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

      saveOnboardingSelection(
        createOnboardingSelection({
          companionId: recommendedCompanion,
          chapter,
          presence,
          clientApplication: {
            displayName: "",
            age: 30,
            country: "",
            chapter,
            supportStyle: "companionship",
            presence,
            memoryPreference: "balanced",
            romancePreference: "platonic_only",
            genderIdentity: "",
            pronouns: "",
            relationshipPreference: "",
            languages: "",
            boundaries: "",
            repairStyle: "gentle_and_plain",
            spaceStyle: "quiet_room"
          },
          companionStudio: {
            creationMode: "recommended",
            baseCompanionId: recommendedCompanion,
            genderFeel: recommendedCompanion === "rowan" ? "ungendered" : "androgynous",
            ageVibe: "peer",
            heightVibe: "medium",
            hairColor: "unspecified",
            hairStyle: "unspecified",
            eyeColor: "unspecified",
            buildVibe: "unspecified",
            styleVibe: "minimal",
            guidanceBalance: "balanced",
            regionalInspiration: "",
            futureVoiceVibe: "",
            doNotWant: ""
          },
          privatePreferences: {
            shareSensitivePreferences: false,
            ethnicityPreference: "",
            culturalBackgroundPreference: "",
            orientationOrRelationshipPreference: "",
            openToMatchedWith: []
          }
        })
      );

      navigate("/chat");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="screen-shell">
      <header className="screen-header">
        <div className="screen-copy-stack">
          <p className="eyebrow">Concierge</p>
          <h1>Companion setup console</h1>
          <p className="screen-copy">
            Choose the kind of presence that fits where you are right now. This
            route still seeds the early shell, but it now belongs to the same calm
            workstation language as the rest of onboarding.
          </p>
        </div>
      </header>

      <section className="onboarding-panel">
        <article className="spotlight-card">
          <p className="system-label">Presence calibration</p>
          <h3>What kind of presence do you need?</h3>
          <div className="choice-grid">
            {(["steady", "reflective", "catalytic"] as PresenceType[]).map(
              (option) => (
                <button
                  key={option}
                  className={`choice-card${presence === option ? " is-selected" : ""}`}
                  onClick={() => setPresence(option)}
                >
                  <strong>{presenceLabels[option]}</strong>
                  <span>
                    {option === "steady"
                      ? "Low-pressure, dependable, and quietly stabilizing."
                      : option === "reflective"
                        ? "Thoughtful, perceptive, and comfortable with nuance."
                        : "Gently activating, dry, and useful when you are stuck."}
                  </span>
                </button>
              )
            )}
          </div>
        </article>

        <article className="spotlight-card">
          <p className="system-label">Context mapping</p>
          <h3>What chapter are you in?</h3>
          <div className="choice-grid">
            {(
              [
                "caregiving_isolation",
                "night_shift",
                "postpartum",
                "expat_relocation"
              ] as ChapterType[]
            ).map((option) => (
              <button
                key={option}
                className={`choice-card${chapter === option ? " is-selected" : ""}`}
                onClick={() => setChapter(option)}
              >
                <strong>{chapterLabels[option]}</strong>
                <span>
                  Use this chapter to ground the opening conversation in real
                  conditions.
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="review-card">
          <p className="system-label">Recommendation</p>
          <h3>Suggested companion</h3>
          {recommendedCompanion ? (
            <p>
              Based on your selection, I&apos;d start you with{" "}
              <strong>
                {recommendedCompanion.charAt(0).toUpperCase() +
                  recommendedCompanion.slice(1)}
              </strong>
              .
            </p>
          ) : (
            <p>Choose a presence first to see a recommendation.</p>
          )}
        </article>

        <div className="panel-actions">
          <button
            className="primary-button"
            onClick={() => {
              void handleContinue();
            }}
            disabled={!presence || !chapter || isSaving}
          >
            {isSaving ? "Preparing..." : "Continue"}
          </button>
        </div>
      </section>
    </main>
  );
}
