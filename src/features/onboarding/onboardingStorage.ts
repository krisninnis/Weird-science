export type CompanionId = "mara" | "iris" | "rowan";

export type PresenceType = "steady" | "reflective" | "catalytic";

export type ChapterType =
  | "caregiving_isolation"
  | "night_shift"
  | "postpartum"
  | "expat_relocation";

export type SupportStyle =
  | "steadiness"
  | "reflection"
  | "momentum"
  | "repair"
  | "companionship";

export type MemoryPreference = "light" | "balanced" | "deep";

export type RomancePreference = "platonic_only" | "open_later";

export type RepairStyle =
  | "gentle_and_plain"
  | "careful_step_by_step"
  | "brief_then_settle";

export type SpaceStyle =
  | "quiet_room"
  | "soft_check_ins"
  | "light_structure";

export type CreationMode = "recommended" | "manual";

export type CompanionFeel = "masculine" | "feminine" | "androgynous" | "ungendered";

export type MatchFeelPreference =
  | "feminine_feel"
  | "masculine_feel"
  | "androgynous_feel"
  | "ungendered_feel"
  | "open_to_any";

export type AgeVibe = "peer" | "slightly_older" | "ageless";

export type HeightVibe = "compact" | "medium" | "tall";

export type HairColor =
  | "dark"
  | "brown"
  | "blonde"
  | "auburn"
  | "silver"
  | "black"
  | "unspecified";

export type HairStyle =
  | "short"
  | "shoulder_length"
  | "long"
  | "cropped"
  | "wavy"
  | "unspecified";

export type EyeColor =
  | "brown"
  | "hazel"
  | "blue"
  | "green"
  | "grey"
  | "dark"
  | "unspecified";

export type BuildVibe =
  | "slight"
  | "balanced"
  | "broad"
  | "soft"
  | "athletic"
  | "unspecified";

export type StyleVibe =
  | "classic"
  | "minimal"
  | "bookish"
  | "workwear"
  | "soft_tailored"
  | "casual";

export type GuidanceBalance =
  | "warmth_forward"
  | "balanced"
  | "reflection_forward"
  | "challenge_forward";

export interface ClientApplication {
  displayName: string;
  age: number;
  country: string;
  chapter: ChapterType;
  supportStyle: SupportStyle;
  presence: PresenceType;
  memoryPreference: MemoryPreference;
  romancePreference: RomancePreference;
  genderIdentity: string;
  pronouns: string;
  relationshipPreference: string;
  languages: string;
  boundaries: string;
  repairStyle: RepairStyle;
  spaceStyle: SpaceStyle;
}

export interface CompanionStudioSelection {
  creationMode: CreationMode;
  baseCompanionId: CompanionId;
  genderFeel: CompanionFeel;
  ageVibe: AgeVibe;
  heightVibe: HeightVibe;
  hairColor: HairColor;
  hairStyle: HairStyle;
  eyeColor: EyeColor;
  buildVibe: BuildVibe;
  styleVibe: StyleVibe;
  guidanceBalance: GuidanceBalance;
  regionalInspiration: string;
  futureVoiceVibe: string;
  doNotWant: string;
}

export interface PrivatePreferences {
  shareSensitivePreferences: boolean;
  ethnicityPreference: string;
  culturalBackgroundPreference: string;
  orientationOrRelationshipPreference: string;
  openToMatchedWith: MatchFeelPreference[];
}

export interface OnboardingSelection {
  version: 2;
  createdAt: string;
  companionId: CompanionId;
  chapter: ChapterType;
  presence: PresenceType;
  clientApplication: ClientApplication;
  companionStudio: CompanionStudioSelection;
  privatePreferences: PrivatePreferences;
}

export interface CreateOnboardingSelectionInput {
  companionId: CompanionId;
  chapter: ChapterType;
  presence: PresenceType;
  clientApplication: ClientApplication;
  companionStudio: CompanionStudioSelection;
  privatePreferences: PrivatePreferences;
}

const STORAGE_KEY = "weird-science:onboarding-selection";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCompanionId(value: unknown): value is CompanionId {
  return value === "mara" || value === "iris" || value === "rowan";
}

function isPresenceType(value: unknown): value is PresenceType {
  return value === "steady" || value === "reflective" || value === "catalytic";
}

function isChapterType(value: unknown): value is ChapterType {
  return (
    value === "caregiving_isolation" ||
    value === "night_shift" ||
    value === "postpartum" ||
    value === "expat_relocation"
  );
}

function defaultClientApplication(
  chapter: ChapterType,
  presence: PresenceType
): ClientApplication {
  return {
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
  };
}

function defaultCompanionStudio(companionId: CompanionId): CompanionStudioSelection {
  return {
    creationMode: "recommended",
    baseCompanionId: companionId,
    genderFeel: companionId === "rowan" ? "ungendered" : "androgynous",
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
  };
}

function defaultPrivatePreferences(): PrivatePreferences {
  return {
    shareSensitivePreferences: false,
    ethnicityPreference: "",
    culturalBackgroundPreference: "",
    orientationOrRelationshipPreference: "",
    openToMatchedWith: []
  };
}

function migrateLegacySelection(raw: unknown): OnboardingSelection | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (
    !isCompanionId(raw.companionId) ||
    !isChapterType(raw.chapter) ||
    !isPresenceType(raw.presence)
  ) {
    return null;
  }

  return {
    version: 2,
    createdAt: new Date().toISOString(),
    companionId: raw.companionId,
    chapter: raw.chapter,
    presence: raw.presence,
    clientApplication: defaultClientApplication(raw.chapter, raw.presence),
    companionStudio: defaultCompanionStudio(raw.companionId),
    privatePreferences: defaultPrivatePreferences()
  };
}

export function createOnboardingSelection(
  input: CreateOnboardingSelectionInput
): OnboardingSelection {
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    companionId: input.companionId,
    chapter: input.chapter,
    presence: input.presence,
    clientApplication: input.clientApplication,
    companionStudio: input.companionStudio,
    privatePreferences: input.privatePreferences
  };
}

export function saveOnboardingSelection(selection: OnboardingSelection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
}

export function getOnboardingSelection(): OnboardingSelection | null {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isRecord(parsed) && parsed.version === 2) {
      return parsed as unknown as OnboardingSelection;
    }

    return migrateLegacySelection(parsed);
  } catch {
    return null;
  }
}
