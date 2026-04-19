import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createOnboardingSelection,
  saveOnboardingSelection,
  type AgeVibe,
  type BuildVibe,
  type ChapterType,
  type CompanionFeel,
  type CompanionId,
  type CreationMode,
  type EyeColor,
  type GuidanceBalance,
  type HairColor,
  type HairStyle,
  type HeightVibe,
  type MatchFeelPreference,
  type MemoryPreference,
  type PresenceType,
  type RepairStyle,
  type RomancePreference,
  type SpaceStyle,
  type StyleVibe,
  type SupportStyle
} from "../onboardingStorage";

type StepId =
  | "welcome"
  | "client"
  | "chapter"
  | "support"
  | "identity"
  | "boundaries"
  | "creation"
  | "template"
  | "appearance"
  | "private"
  | "confirm";

type PartLabel = "Client application" | "Creation studio";

const steps: Array<{ id: StepId; label: string; eyebrow: string; part: PartLabel }> = [
  { id: "welcome", label: "Welcome", eyebrow: "Step 1", part: "Client application" },
  { id: "client", label: "Client application", eyebrow: "Step 2", part: "Client application" },
  { id: "chapter", label: "Current chapter", eyebrow: "Step 3", part: "Client application" },
  { id: "support", label: "Support profile", eyebrow: "Step 4", part: "Client application" },
  { id: "identity", label: "Optional identity notes", eyebrow: "Step 5", part: "Client application" },
  { id: "boundaries", label: "Boundaries and repair", eyebrow: "Step 6", part: "Client application" },
  { id: "creation", label: "Creation mode", eyebrow: "Step 7", part: "Creation studio" },
  { id: "template", label: "Template and feel", eyebrow: "Step 8", part: "Creation studio" },
  { id: "appearance", label: "Appearance and vibe", eyebrow: "Step 9", part: "Creation studio" },
  { id: "private", label: "Private preferences", eyebrow: "Step 10", part: "Creation studio" },
  { id: "confirm", label: "Confirm", eyebrow: "Step 11", part: "Creation studio" }
];

const chapters: Array<{ id: ChapterType; title: string; description: string }> = [
  { id: "caregiving_isolation", title: "Caregiving isolation", description: "When care takes over and your own life has gone quiet." },
  { id: "night_shift", title: "Night shift", description: "When ordinary connection gets harder because your hours are inverted." },
  { id: "postpartum", title: "Postpartum", description: "When everything is tender, altered, and more demanding than words cover." },
  { id: "expat_relocation", title: "Expat relocation", description: "When home is elsewhere and the familiar must be rebuilt." }
];

const supports: Array<{ id: SupportStyle; title: string; description: string }> = [
  { id: "steadiness", title: "Steadiness", description: "Calm, grounding, and quietly reliable." },
  { id: "reflection", title: "Perspective", description: "Help thinking more clearly without being rushed." },
  { id: "momentum", title: "Momentum", description: "A useful nudge when you stall." },
  { id: "repair", title: "Repair", description: "A companion who can handle rupture and repair with care." },
  { id: "companionship", title: "Companionship", description: "A reliable private presence for ordinary life." }
];

const presences: Array<{ id: PresenceType; title: string; description: string }> = [
  { id: "steady", title: "Steady", description: "Low-pressure, grounded, and quietly consistent." },
  { id: "reflective", title: "Reflective", description: "Thoughtful, nuanced, and good at sitting with complexity." },
  { id: "catalytic", title: "Catalytic", description: "Dry, lightly challenging, and helpful when you are stuck." }
];

const memories: Array<{ id: MemoryPreference; title: string; description: string }> = [
  { id: "light", title: "Light memory", description: "Carry the essentials and let most details pass." },
  { id: "balanced", title: "Balanced memory", description: "Remember meaningful details without turning everything into a record." },
  { id: "deep", title: "Deep memory", description: "Hold more continuity and shared language over time." }
];

const romances: Array<{ id: RomancePreference; title: string; description: string }> = [
  { id: "platonic_only", title: "Platonic only", description: "Keep the bond clearly non-romantic." },
  { id: "open_later", title: "Open later", description: "Stay platonic now, with the possibility of romance only if it develops slowly and safely later." }
];

const repairStyles: Array<{ id: RepairStyle; title: string; description: string }> = [
  { id: "gentle_and_plain", title: "Gentle and plain", description: "Acknowledge the rupture, then speak clearly." },
  { id: "careful_step_by_step", title: "Careful step by step", description: "Move slowly and explain what is being repaired." },
  { id: "brief_then_settle", title: "Brief, then settle", description: "Name the issue without overworking it." }
];

const spaceStyles: Array<{ id: SpaceStyle; title: string; description: string }> = [
  { id: "quiet_room", title: "Quiet room", description: "More space, fewer nudges, less pressure." },
  { id: "soft_check_ins", title: "Soft check-ins", description: "A little warmth and periodic contact without hovering." },
  { id: "light_structure", title: "Light structure", description: "A bit more shape when you need traction." }
];

const creationModes: Array<{ id: CreationMode; title: string; description: string }> = [
  { id: "recommended", title: "Recommended match", description: "Let the studio suggest the strongest launch template, then tune the details." },
  { id: "manual", title: "Manual creation", description: "Choose the launch template yourself and shape the companion more directly." }
];

const companions: Array<{ id: CompanionId; title: string; subtitle: string; summary: string }> = [
  { id: "mara", title: "Mara", subtitle: "Grounded protector", summary: "Warm, observant, and unhurried. Steadies the room without trying to own it." },
  { id: "iris", title: "Iris", subtitle: "Reflective mentor", summary: "Thoughtful, careful, and emotionally precise." },
  { id: "rowan", title: "Rowan", subtitle: "Ungendered catalyst", summary: "Dry humor, steady presence, and a useful nudge when you are circling the thing." }
];

const feels: Array<{ id: CompanionFeel; title: string; description: string }> = [
  { id: "feminine", title: "Feminine feel", description: "Softer cues without reducing the companion to stereotype." },
  { id: "masculine", title: "Masculine feel", description: "A more masculine-coded presence, still grounded and non-performative." },
  { id: "androgynous", title: "Androgynous feel", description: "Blur the obvious cues and keep the design more open." },
  { id: "ungendered", title: "Ungendered feel", description: "Explicitly outside conventional gender coding." }
];

const balances: Array<{ id: GuidanceBalance; title: string; description: string }> = [
  { id: "warmth_forward", title: "Warmth-forward", description: "More soothing, holding, and emotionally soft." },
  { id: "balanced", title: "Balanced", description: "Warm, thoughtful, and occasionally challenging in equal measure." },
  { id: "reflection_forward", title: "Reflection-forward", description: "More clarity, observation, and thoughtful mirroring." },
  { id: "challenge_forward", title: "Challenge-forward", description: "Still safe, but more comfortable nudging assumptions." }
];

const matchFeels: Array<{ id: MatchFeelPreference; title: string }> = [
  { id: "feminine_feel", title: "Feminine feel" },
  { id: "masculine_feel", title: "Masculine feel" },
  { id: "androgynous_feel", title: "Androgynous feel" },
  { id: "ungendered_feel", title: "Ungendered feel" },
  { id: "open_to_any", title: "Open to any" }
];

function nextStep(step: StepId): StepId | null {
  const index = steps.findIndex((entry) => entry.id === step);
  return steps[index + 1]?.id ?? null;
}

function previousStep(step: StepId): StepId | null {
  const index = steps.findIndex((entry) => entry.id === step);
  return steps[index - 1]?.id ?? null;
}

function titleCase(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function recommendCompanion(
  presence: PresenceType,
  support: SupportStyle,
  balance: GuidanceBalance
): CompanionId {
  if (presence === "steady" || support === "steadiness") return "mara";
  if (presence === "reflective" || support === "reflection" || support === "repair" || balance === "reflection_forward") return "iris";
  return "rowan";
}

function toggleMatchFeel(current: MatchFeelPreference[], value: MatchFeelPreference): MatchFeelPreference[] {
  if (value === "open_to_any") return current.includes("open_to_any") ? [] : ["open_to_any"];
  const filtered = current.filter((entry) => entry !== "open_to_any");
  return filtered.includes(value) ? filtered.filter((entry) => entry !== value) : [...filtered, value];
}

function renderChoiceCards<T extends string>(
  items: Array<{ id: T; title: string; description: string }>,
  selected: T | null,
  onSelect: (value: T) => void,
  extraClass = ""
): JSX.Element {
  return (
    <div className={`choice-grid${extraClass ? ` ${extraClass}` : ""}`}>
      {items.map((item) => (
        <button
          key={item.id}
          className={`choice-card${selected === item.id ? " is-selected" : ""}`}
          onClick={() => onSelect(item.id)}
        >
          <strong>{item.title}</strong>
          <span>{item.description}</span>
        </button>
      ))}
    </div>
  );
}

export default function OnboardingScreen(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>("welcome");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("30");
  const [country, setCountry] = useState("");
  const [chapter, setChapter] = useState<ChapterType | null>(null);
  const [supportStyle, setSupportStyle] = useState<SupportStyle | null>(null);
  const [presence, setPresence] = useState<PresenceType | null>(null);
  const [memoryPreference, setMemoryPreference] = useState<MemoryPreference | null>(null);
  const [romancePreference, setRomancePreference] = useState<RomancePreference | null>(null);
  const [genderIdentity, setGenderIdentity] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [relationshipPreference, setRelationshipPreference] = useState("");
  const [languages, setLanguages] = useState("");
  const [boundaries, setBoundaries] = useState("");
  const [repairStyle, setRepairStyle] = useState<RepairStyle | null>(null);
  const [spaceStyle, setSpaceStyle] = useState<SpaceStyle | null>(null);
  const [creationMode, setCreationMode] = useState<CreationMode>("recommended");
  const [guidanceBalance, setGuidanceBalance] = useState<GuidanceBalance>("balanced");
  const [companionId, setCompanionId] = useState<CompanionId>("rowan");
  const [genderFeel, setGenderFeel] = useState<CompanionFeel>("androgynous");
  const [ageVibe, setAgeVibe] = useState<AgeVibe>("peer");
  const [heightVibe, setHeightVibe] = useState<HeightVibe>("medium");
  const [hairColor, setHairColor] = useState<HairColor>("unspecified");
  const [hairStyle, setHairStyle] = useState<HairStyle>("unspecified");
  const [eyeColor, setEyeColor] = useState<EyeColor>("unspecified");
  const [buildVibe, setBuildVibe] = useState<BuildVibe>("unspecified");
  const [styleVibe, setStyleVibe] = useState<StyleVibe>("minimal");
  const [regionalInspiration, setRegionalInspiration] = useState("");
  const [futureVoiceVibe, setFutureVoiceVibe] = useState("");
  const [doNotWant, setDoNotWant] = useState("");
  const [ethnicityPreference, setEthnicityPreference] = useState("");
  const [culturalBackgroundPreference, setCulturalBackgroundPreference] = useState("");
  const [orientationPreference, setOrientationPreference] = useState("");
  const [openToMatchedWith, setOpenToMatchedWith] = useState<MatchFeelPreference[]>([]);

  const currentStepIndex = steps.findIndex((entry) => entry.id === step);
  const currentStep = steps[currentStepIndex];
  const recommendedCompanion = useMemo(
    () => (presence && supportStyle ? recommendCompanion(presence, supportStyle, guidanceBalance) : null),
    [guidanceBalance, presence, supportStyle]
  );

  function canAdvance(current: StepId): boolean {
    switch (current) {
      case "welcome":
      case "identity":
      case "appearance":
      case "private":
      case "creation":
      case "template":
        return true;
      case "client":
        return displayName.trim().length > 0 && Number(age) > 0 && country.trim().length > 0;
      case "chapter":
        return chapter !== null;
      case "support":
        return supportStyle !== null && presence !== null && memoryPreference !== null && romancePreference !== null;
      case "boundaries":
        return repairStyle !== null && spaceStyle !== null;
      case "confirm":
        return chapter !== null && supportStyle !== null && presence !== null && memoryPreference !== null && romancePreference !== null && repairStyle !== null && spaceStyle !== null;
      default:
        return false;
    }
  }

  function handleNext(): void {
    if (!canAdvance(step)) return;
    const next = nextStep(step);
    if (!next) return;
    if (step === "creation" && creationMode === "recommended" && recommendedCompanion) {
      setCompanionId(recommendedCompanion);
    }
    setStep(next);
  }

  function handleBack(): void {
    const previous = previousStep(step);
    if (previous) setStep(previous);
  }

  function handleConfirm(): void {
    if (!canAdvance("confirm") || !chapter || !supportStyle || !presence || !memoryPreference || !romancePreference || !repairStyle || !spaceStyle) {
      return;
    }

    saveOnboardingSelection(
      createOnboardingSelection({
        companionId: creationMode === "recommended" && recommendedCompanion ? recommendedCompanion : companionId,
        chapter,
        presence,
        clientApplication: {
          displayName: displayName.trim(),
          age: Number(age),
          country: country.trim(),
          chapter,
          supportStyle,
          presence,
          memoryPreference,
          romancePreference,
          genderIdentity: genderIdentity.trim(),
          pronouns: pronouns.trim(),
          relationshipPreference: relationshipPreference.trim(),
          languages: languages.trim(),
          boundaries: boundaries.trim(),
          repairStyle,
          spaceStyle
        },
        companionStudio: {
          creationMode,
          baseCompanionId: creationMode === "recommended" && recommendedCompanion ? recommendedCompanion : companionId,
          genderFeel,
          ageVibe,
          heightVibe,
          hairColor,
          hairStyle,
          eyeColor,
          buildVibe,
          styleVibe,
          guidanceBalance,
          regionalInspiration: regionalInspiration.trim(),
          futureVoiceVibe: futureVoiceVibe.trim(),
          doNotWant: doNotWant.trim()
        },
        privatePreferences: {
          shareSensitivePreferences:
            ethnicityPreference.trim().length > 0 ||
            culturalBackgroundPreference.trim().length > 0 ||
            orientationPreference.trim().length > 0 ||
            openToMatchedWith.length > 0,
          ethnicityPreference: ethnicityPreference.trim(),
          culturalBackgroundPreference: culturalBackgroundPreference.trim(),
          orientationOrRelationshipPreference: orientationPreference.trim(),
          openToMatchedWith
        }
      })
    );

    navigate("/chat");
  }

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Weird Science</p>
          <div className="hero-status">
            <span className="status-dot" aria-hidden="true" />
            <span className="system-value">Private intake console online</span>
          </div>
          <h1 className="hero-title">A private application first, then a companion creation studio.</h1>
          <p className="hero-subtitle">
            Familiar enough to feel usable, but designed as a dignified intake and matching flow rather than a dating signup.
          </p>
          <p className="hero-note">Sensitive preferences stay optional. Private answers stay local.</p>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <p className="system-label">Client application</p>
            <h2>What we ask first</h2>
            <div className="boot-list">
              <div className="boot-item"><span className="boot-index">01</span><span>Who you are, what chapter you are in, and what kind of support you want.</span></div>
              <div className="boot-item"><span className="boot-index">02</span><span>How present the companion should feel, how much it should remember, and where the boundaries are.</span></div>
              <div className="boot-item"><span className="boot-index">03</span><span>Optional private preferences are clearly marked and fully skippable.</span></div>
            </div>
          </article>
          <article className="feature-card">
            <p className="system-label">Creation studio</p>
            <h2>What comes after</h2>
            <div className="boot-list">
              <div className="boot-item"><span className="boot-index">04</span><span>Choose recommended matching or manual creation.</span></div>
              <div className="boot-item"><span className="boot-index">05</span><span>Shape companion feel, appearance cues, and warmth versus challenge balance.</span></div>
              <div className="boot-item"><span className="boot-index">06</span><span>Initialize one of the launch-safe templates without sleazy or swipe-like framing.</span></div>
            </div>
          </article>
        </div>
      </section>

      <section className="onboarding-panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">{currentStep.part}</p>
            <h2>{currentStep.label}</h2>
          </div>
          <p className="subtle-pill">{currentStepIndex + 1} / {steps.length}</p>
        </header>

        <div className="panel-stack">
          <div className="progress-header">
            <p className="progress-caption">{currentStep.eyebrow}  READY FOR {currentStep.label.toUpperCase()}</p>
            <p className="system-value">{currentStep.part}</p>
          </div>
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        {step === "welcome" ? (
          <div className="panel-stack">
            <article className="spotlight-card">
              <p className="system-label">Initialization note</p>
              <h3>This is not a swipe flow.</h3>
              <p>
                It borrows the clarity of modern profile intake, but the purpose is different: a thoughtful client application and companion studio built for safety, memory, pacing, and real continuity.
              </p>
            </article>
            <div className="diagnostic-grid">
              <article className="dossier-card"><p className="system-label">Part one</p><h3>Client application</h3><p>Tell Lisa what chapter you are in, what kind of support you want, and what should stay private.</p></article>
              <article className="dossier-card"><p className="system-label">Part two</p><h3>Creation studio</h3><p>Shape the companion with matching, design intent, and clear preferences instead of shallow swiping.</p></article>
            </div>
            <div className="panel-actions">
              <button className="primary-button" onClick={handleNext}>Begin application</button>
              <Link className="secondary-button" to="/chat">Continue to chat shell</Link>
            </div>
          </div>
        ) : null}

        {step === "client" ? (
          <div className="panel-stack">
            <p className="system-label">Core client details</p>
            <div className="field-grid">
              <label className="field-block"><span className="field-label">What should I call you?</span><input className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name or the name you want used here" /></label>
              <label className="field-block"><span className="field-label">How old are you?</span><input className="text-input" type="number" min="1" value={age} onChange={(event) => setAge(event.target.value)} /></label>
              <label className="field-block field-block--wide"><span className="field-label">Which country are you in?</span><input className="text-input" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="United Kingdom" /></label>
            </div>
          </div>
        ) : null}

        {step === "chapter" ? (
          <div className="panel-stack">
            <p className="system-label">Chapter mapping</p>
            <p className="section-copy">Chapters ground the first conversations in real conditions rather than a generic mood.</p>
            {renderChoiceCards(chapters, chapter, setChapter)}
          </div>
        ) : null}

        {step === "support" ? (
          <div className="panel-stack">
            <p className="system-label">Support profile</p>
            <div className="field-stack">
              <div><p className="field-label">What kind of support are you hoping for?</p>{renderChoiceCards(supports, supportStyle, setSupportStyle)}</div>
              <div><p className="field-label">How present should your companion feel?</p>{renderChoiceCards(presences, presence, setPresence)}</div>
              <div><p className="field-label">How much should your companion remember?</p>{renderChoiceCards(memories, memoryPreference, setMemoryPreference)}</div>
              <div><p className="field-label">Do you want a platonic companion only, or are you open to romance later?</p>{renderChoiceCards(romances, romancePreference, setRomancePreference)}</div>
            </div>
          </div>
        ) : null}

        {step === "identity" ? (
          <div className="panel-stack">
            <p className="system-label">Optional identity notes</p>
            <p className="section-copy">These are optional. They help tone and matching feel better shaped, but the application still works if you leave them blank.</p>
            <div className="field-grid">
              <label className="field-block"><span className="field-label">Gender identity</span><input className="text-input" value={genderIdentity} onChange={(event) => setGenderIdentity(event.target.value)} placeholder="Optional" /></label>
              <label className="field-block"><span className="field-label">Pronouns</span><input className="text-input" value={pronouns} onChange={(event) => setPronouns(event.target.value)} placeholder="Optional" /></label>
              <label className="field-block"><span className="field-label">Relationship preference</span><input className="text-input" value={relationshipPreference} onChange={(event) => setRelationshipPreference(event.target.value)} placeholder="Optional" /></label>
              <label className="field-block field-block--wide"><span className="field-label">Languages</span><input className="text-input" value={languages} onChange={(event) => setLanguages(event.target.value)} placeholder="English, Spanish" /></label>
            </div>
          </div>
        ) : null}

        {step === "boundaries" ? (
          <div className="panel-stack">
            <p className="system-label">Boundaries and repair</p>
            <label className="field-block field-block--wide"><span className="field-label">What should your companion avoid?</span><textarea className="text-area" value={boundaries} onChange={(event) => setBoundaries(event.target.value)} rows={4} placeholder="Topics, tones, or habits that would feel wrong for you." /></label>
            <div><p className="field-label">How should repair feel if something lands wrong?</p>{renderChoiceCards(repairStyles, repairStyle, setRepairStyle)}</div>
            <div><p className="field-label">How should the companion make space for you?</p>{renderChoiceCards(spaceStyles, spaceStyle, setSpaceStyle)}</div>
          </div>
        ) : null}

        {step === "creation" ? (
          <div className="panel-stack">
            <p className="system-label">Studio entry</p>
            <p className="section-copy">Choose recommended matching or manual creation. Either way, this stays a companion design flow rather than a dating signup.</p>
            {renderChoiceCards(creationModes, creationMode, setCreationMode)}
            {recommendedCompanion ? (
              <article className="review-card">
                <p className="system-label">Current recommendation</p>
                <h3>{companions.find((option) => option.id === recommendedCompanion)?.title}</h3>
                <p>Based on your chapter, support style, and desired presence, this is the strongest launch template for the current build.</p>
              </article>
            ) : null}
          </div>
        ) : null}

        {step === "template" ? (
          <div className="panel-stack">
            <p className="system-label">Template and feel</p>
            <div><p className="field-label">Warmth, reflection, and challenge balance</p>{renderChoiceCards(balances, guidanceBalance, setGuidanceBalance)}</div>
            <div><p className="field-label">Companion feel</p>{renderChoiceCards(feels, genderFeel, setGenderFeel, "is-four")}</div>
            <div>
              <p className="field-label">Launch template</p>
              <p className="section-copy">This build still initializes one of the three launch companions under the hood, even when you shape the studio preferences more manually.</p>
              <div className="choice-grid">
                {companions.map((option) => (
                  <button key={option.id} className={`choice-card${companionId === option.id ? " is-selected" : ""}`} onClick={() => setCompanionId(option.id)}>
                    <div className="card-topline">
                      <strong>{option.title}</strong>
                      {recommendedCompanion === option.id ? <span className="recommendation-pill">Recommended</span> : null}
                    </div>
                    <span className="card-subtitle">{option.subtitle}</span>
                    <span>{option.summary}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === "appearance" ? (
          <div className="panel-stack">
            <p className="system-label">Appearance and vibe</p>
            <div className="field-grid">
              <label className="field-block"><span className="field-label">Age vibe</span><select className="text-input" value={ageVibe} onChange={(event) => setAgeVibe(event.target.value as AgeVibe)}><option value="peer">Peer</option><option value="slightly_older">Slightly older</option><option value="ageless">Ageless</option></select></label>
              <label className="field-block"><span className="field-label">Height</span><select className="text-input" value={heightVibe} onChange={(event) => setHeightVibe(event.target.value as HeightVibe)}><option value="compact">Compact</option><option value="medium">Medium</option><option value="tall">Tall</option></select></label>
              <label className="field-block"><span className="field-label">Hair colour</span><select className="text-input" value={hairColor} onChange={(event) => setHairColor(event.target.value as HairColor)}>{["dark","brown","blonde","auburn","silver","black","unspecified"].map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>
              <label className="field-block"><span className="field-label">Hair style / length</span><select className="text-input" value={hairStyle} onChange={(event) => setHairStyle(event.target.value as HairStyle)}>{["short","shoulder_length","long","cropped","wavy","unspecified"].map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>
              <label className="field-block"><span className="field-label">Eye colour</span><select className="text-input" value={eyeColor} onChange={(event) => setEyeColor(event.target.value as EyeColor)}>{["brown","hazel","blue","green","grey","dark","unspecified"].map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>
              <label className="field-block"><span className="field-label">Build / body vibe</span><select className="text-input" value={buildVibe} onChange={(event) => setBuildVibe(event.target.value as BuildVibe)}>{["slight","balanced","broad","soft","athletic","unspecified"].map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>
              <label className="field-block"><span className="field-label">Clothing / style vibe</span><select className="text-input" value={styleVibe} onChange={(event) => setStyleVibe(event.target.value as StyleVibe)}>{["classic","minimal","bookish","workwear","soft_tailored","casual"].map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>
              <label className="field-block"><span className="field-label">Future voice vibe</span><input className="text-input" value={futureVoiceVibe} onChange={(event) => setFutureVoiceVibe(event.target.value)} placeholder="Low, warm, clear, quiet..." /></label>
              <label className="field-block field-block--wide"><span className="field-label">Country / regional inspiration</span><input className="text-input" value={regionalInspiration} onChange={(event) => setRegionalInspiration(event.target.value)} placeholder="Optional regional grounding or cultural vibe" /></label>
              <label className="field-block field-block--wide"><span className="field-label">Things you definitely do not want</span><textarea className="text-area" value={doNotWant} onChange={(event) => setDoNotWant(event.target.value)} rows={4} placeholder="Examples: overly flirty tone, evasiveness, forced cheerfulness." /></label>
            </div>
          </div>
        ) : null}

        {step === "private" ? (
          <div className="panel-stack">
            <article className="review-card">
              <p className="system-label">Optional and private</p>
              <h3>Sensitive preferences</h3>
              <p>Everything here is skippable. These answers are private and only used to improve matching or customization inside this local setup.</p>
            </article>
            <div className="field-grid">
              <label className="field-block"><span className="field-label">Ethnicity preference</span><input className="text-input" value={ethnicityPreference} onChange={(event) => setEthnicityPreference(event.target.value)} placeholder="Optional" /></label>
              <label className="field-block"><span className="field-label">Cultural background preference</span><input className="text-input" value={culturalBackgroundPreference} onChange={(event) => setCulturalBackgroundPreference(event.target.value)} placeholder="Optional" /></label>
              <label className="field-block field-block--wide"><span className="field-label">Sexual orientation / relationship preference</span><input className="text-input" value={orientationPreference} onChange={(event) => setOrientationPreference(event.target.value)} placeholder="Optional" /></label>
            </div>
            <div>
              <p className="field-label">Who are you open to being matched with?</p>
              <div className="choice-grid is-three">
                {matchFeels.map((option) => (
                  <button key={option.id} className={`choice-card${openToMatchedWith.includes(option.id) ? " is-selected" : ""}`} onClick={() => setOpenToMatchedWith((current) => toggleMatchFeel(current, option.id))}>
                    <strong>{option.title}</strong>
                    <span>Optional matching preference</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="panel-stack">
            <article className="review-card">
              <p className="system-label">Application summary</p>
              <h3>Ready to initialize</h3>
              <dl className="review-grid">
                <div><dt>Name</dt><dd>{displayName || "Not set"}</dd></div>
                <div><dt>Country</dt><dd>{country || "Not set"}</dd></div>
                <div><dt>Chapter</dt><dd>{chapters.find((option) => option.id === chapter)?.title ?? "Not set"}</dd></div>
                <div><dt>Support</dt><dd>{supports.find((option) => option.id === supportStyle)?.title ?? "Not set"}</dd></div>
                <div><dt>Presence</dt><dd>{presences.find((option) => option.id === presence)?.title ?? "Not set"}</dd></div>
                <div><dt>Memory</dt><dd>{memoryPreference ? titleCase(memoryPreference) : "Not set"}</dd></div>
                <div><dt>Launch template</dt><dd>{companions.find((option) => option.id === (creationMode === "recommended" && recommendedCompanion ? recommendedCompanion : companionId))?.title ?? "Not set"}</dd></div>
                <div><dt>Creation mode</dt><dd>{creationMode === "recommended" ? "Recommended match" : "Manual creation"}</dd></div>
              </dl>
            </article>
            <article className="dossier-card">
              <p className="system-label">Studio profile</p>
              <h3>Companion design snapshot</h3>
              <p>{genderFeel === "ungendered" ? "Explicitly ungendered" : `${titleCase(genderFeel)}-coded`} with a {titleCase(ageVibe)} age vibe, {titleCase(styleVibe)} styling, and a {titleCase(guidanceBalance)} guidance balance.</p>
            </article>
            <div className="panel-actions">
              <button className="primary-button" onClick={handleConfirm}>Initialize companion</button>
              <Link className="secondary-button" to="/chat">Continue to chat shell</Link>
            </div>
            <p className="muted-copy">Current build note: the intake and studio selections are now stored locally, while deeper matching logic still lands in later tasks.</p>
          </div>
        ) : null}

        {step !== "welcome" ? (
          <footer className="wizard-footer">
            <button className="ghost-button" onClick={handleBack}>Back</button>
            {step !== "confirm" ? <button className="primary-button" onClick={handleNext} disabled={!canAdvance(step)}>Next</button> : null}
          </footer>
        ) : null}
      </section>
    </main>
  );
}
