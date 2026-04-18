export type PresenceType = "steady" | "reflective" | "catalytic";

export type ChapterType =
  | "general_loneliness"
  | "grief"
  | "recovery"
  | "caregiving_isolation"
  | "relocation"
  | "night_shift";

export interface OnboardingSelection {
  companionId: "mara" | "iris" | "rowan";
  chapter: ChapterType;
  presence: PresenceType;
}

const STORAGE_KEY = "weird-science:onboarding-selection";

export function saveOnboardingSelection(
  selection: OnboardingSelection
): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
}

export function getOnboardingSelection(): OnboardingSelection | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OnboardingSelection;
  } catch {
    return null;
  }
}