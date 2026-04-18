import { MARA_CORE } from "./mara";
import { IRIS_CORE } from "./iris";
import { ROWAN_CORE } from "./rowan";
import type { CompanionCore } from "../companionTypes";

export type CompanionCoreTemplate = Omit<CompanionCore, "id" | "createdAt">;

export const LAUNCH_COMPANIONS: Record<string, CompanionCoreTemplate> = {
  mara: MARA_CORE,
  iris: IRIS_CORE,
  rowan: ROWAN_CORE,
};

export const COMPANION_ORDER = ["mara", "iris", "rowan"] as const;
export type CompanionKey = (typeof COMPANION_ORDER)[number];
