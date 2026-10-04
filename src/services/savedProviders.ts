/**
 * Saved providers (mock)
 * --------------------
 * Free users: max 5 saved professionals
 * Pro (subscribed): unlimited
 *
 * Later: swap bodies for API / AsyncStorage.
 *
 * Single source of truth while on mock data:
 * - subscribed / verified / role come from the logged-in professional in
 *   src/data/professionals.ts (via mock professional id "1").
 * - professionalId exposed to the rest of the app is the seeded UUID so
 *   Supabase queries never receive bare mock ids like "1".
 */

import {
  getProfessionalById as getProfessionalByIdAsync,
  type Professional,
} from "@/services/professionals";
import {
  PROFESSIONALS,
  getProfessionalById as getMockProfessionalById,
} from "@/data/professionals";
import { MOCK_SESSION, isUuid, tryToUuid, tryToMockId } from "@/lib/ids";

// =====================================================
// MOCK LOGGED-IN USER (replace with auth later)
// =====================================================

export type AppUser = {
  id: string;
  name: string;
  /** true = Doovly Pro → unlimited saves + Pro dashboard */
  subscribed: boolean;
  /**
   * Professional profile id that belongs to this user (if they offer services).
   * Stored as the seeded Supabase UUID (not mock "1") so service-layer
   * queries against uuid columns succeed.
   * Later: from auth context / API (e.g. /me).
   */
  professionalId: string | null;
};

/** Mock professional row key in src/data/professionals.ts ("1" = John Chukwuemeka) */
const MOCK_LOGGED_IN_PRO_MOCK_ID = MOCK_SESSION.professionalMockId;

/** Seeded professionals.id UUID corresponding to the mock pro */
const MOCK_LOGGED_IN_PRO_UUID = MOCK_SESSION.professionalUuid;

const loggedInProMock = getMockProfessionalById(MOCK_LOGGED_IN_PRO_MOCK_ID);

/**
 * MOCK_USER is derived from the professional record so
 * verified + subscribed stay in sync with src/data/professionals.ts.
 * Change subscribed/verified on the professional to control Pro UI.
 */
export const MOCK_USER: AppUser = {
  id: MOCK_SESSION.userUuid,
  name: loggedInProMock?.name ?? "John Jerry",
  // Driven by professional mock data
  subscribed: loggedInProMock?.subscribed ?? false,
  professionalId: MOCK_LOGGED_IN_PRO_UUID,
};

/**
 * Professional id of the logged-in user (if any).
 * NOW  → seeded UUID from MOCK_USER (safe for Supabase uuid columns)
 * LATER → from auth / GET /me
 */
export function getLoggedInProfessionalId(): string | null {
  return MOCK_USER.professionalId ?? null;
}

/**
 * Current logged-in user.
 * NOW  → mock MOCK_USER
 * LATER → from auth / GET /me. Keep this name.
 */
export function getCurrentUser(): AppUser {
  return MOCK_USER;
}

/**
 * Role used by the profile tab (Admin Login visibility).
 * NOW  → professional.role on the logged-in mock pro ("admin" | "user")
 * LATER → from auth / GET /me / profiles.role
 */
export function getCurrentUserRole(): "user" | "admin" {
  const role = loggedInProMock?.role;
  return role === "admin" ? "admin" : "user";
}

/**
 * True when the given professional profile belongs to the current auth user.
 * Use this to disable Book Now / Add Review on own profile.
 * Compares both UUID and legacy mock id forms.
 */
export function isOwnProfessionalProfile(professionalId: string): boolean {
  const mine = getLoggedInProfessionalId();
  if (!mine) return false;
  const target = String(professionalId);
  if (String(mine) === target) return true;
  // Also match when one side is still a mock id ("1") and the other is UUID
  const mineMock =
    tryToMockId("professional", mine) ??
    (!isUuid(mine) ? mine : undefined);
  const targetMock =
    tryToMockId("professional", target) ??
    (!isUuid(target) ? target : undefined);
  if (mineMock && targetMock && mineMock === targetMock) return true;
  const targetUuid = isUuid(target)
    ? target
    : tryToUuid("professional", target);
  return Boolean(targetUuid && targetUuid === mine);
}

/** Current user is on Doovly Pro (from professional mock data). */
export function isCurrentUserPro(): boolean {
  return loggedInProMock?.subscribed ?? MOCK_USER.subscribed;
}

/** Current user has a verified professional badge. */
export function isCurrentUserVerified(): boolean {
  return loggedInProMock?.verified ?? false;
}

export const FREE_SAVE_LIMIT = 5;

// =====================================================
// IN-MEMORY SAVED IDS (mock persistence)
// Stored as seeded UUIDs when possible.
// =====================================================

function toSavedProfessionalKey(id: string): string {
  const raw = String(id);
  if (isUuid(raw)) return raw;
  return tryToUuid("professional", raw) ?? raw;
}

let savedIds: string[] = [
  toSavedProfessionalKey("1"),
  toSavedProfessionalKey("2"),
];

export function getSavedIds(): string[] {
  return [...savedIds];
}

/**
 * Resolve saved providers from Supabase (async).
 * Prefer this over the old sync mock list when rendering UI.
 */
export async function getSavedProviders(): Promise<Professional[]> {
  const results = await Promise.all(
    savedIds.map((id) => getProfessionalByIdAsync(id)),
  );
  return results.filter((p): p is Professional => p != null);
}

export function isSaved(providerId: string): boolean {
  const key = toSavedProfessionalKey(providerId);
  return savedIds.some((id) => id === key || id === String(providerId));
}

/** null = unlimited (Pro) */
export function getSaveLimit(): number | null {
  if (isCurrentUserPro()) return null;
  return FREE_SAVE_LIMIT;
}

export function canSaveMore(): boolean {
  const limit = getSaveLimit();
  if (limit === null) return true;
  return savedIds.length < limit;
}

export function getRemainingSlots(): number | null {
  const limit = getSaveLimit();
  if (limit === null) return null;
  return Math.max(0, limit - savedIds.length);
}

export type SaveResult =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "limit" };

/**
 * Toggle save/unsave.
 * Returns { ok: false, reason: "limit" } when free user hits 5.
 */
export function toggleSave(providerId: string): SaveResult {
  const id = toSavedProfessionalKey(providerId);

  if (savedIds.includes(id) || savedIds.includes(String(providerId))) {
    savedIds = savedIds.filter(
      (x) => x !== id && x !== String(providerId),
    );
    return { ok: true, saved: false };
  }

  if (!canSaveMore()) {
    return { ok: false, reason: "limit" };
  }

  savedIds = [...savedIds, id];
  return { ok: true, saved: true };
}

/**
 * Toggle Pro status for testing.
 * Keeps MOCK_USER and the professional mock record in sync.
 */
export function setMockSubscribed(subscribed: boolean) {
  MOCK_USER.subscribed = subscribed;

  const pro = PROFESSIONALS.find(
    (p) => p.id === String(MOCK_LOGGED_IN_PRO_MOCK_ID),
  );
  if (pro) {
    pro.subscribed = subscribed;
  }
}

/** Re-export async Supabase lookup (UUID or mock id). */
export { getProfessionalByIdAsync as getProfessionalById };
