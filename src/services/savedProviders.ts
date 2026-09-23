/**
 * Saved providers (mock)
 * --------------------
 * Free users: max 5 saved professionals
 * Pro (subscribed): unlimited
 *
 * Later: swap bodies for API / AsyncStorage.
 *
 * Single source of truth while on mock data:
 * - subscribed / verified come from the logged-in professional in
 *   src/data/professionals.ts (via professionalId).
 */

import {
  getProfessionalById,
  type Professional,
} from "@/services/professionals";
import { PROFESSIONALS } from "@/data/professionals";

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
   * Used to detect "own profile" so Book Now / Add Review can be disabled.
   * Later: from auth context / API (e.g. /me).
   */
  professionalId: string | null;
};

/** Must match MOCK_LOGGED_IN_PRO_ID used in profile tab ("1" = John Chukwuemeka) */
const MOCK_LOGGED_IN_PRO_ID = "1";

const loggedInPro = getProfessionalById(MOCK_LOGGED_IN_PRO_ID);

/**
 * MOCK_USER is derived from the professional record so
 * verified + subscribed stay in sync with src/data/professionals.ts.
 * Change subscribed/verified on the professional to control Pro UI.
 */
export const MOCK_USER: AppUser = {
  id: "u1",
  name: loggedInPro?.name ?? "John Jerry",
  // Driven by professional mock data
  subscribed: loggedInPro?.subscribed ?? false,
  professionalId: MOCK_LOGGED_IN_PRO_ID,
};

/**
 * Professional id of the logged-in user (if any).
 * NOW  → mock from MOCK_USER
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
 * NOW  → professional.role on the logged-in pro ("admin" | "user")
 * LATER → from auth / GET /me
 */
export function getCurrentUserRole(): "user" | "admin" {
  const proId = getLoggedInProfessionalId();
  if (!proId) return "user";
  const role = getProfessionalById(proId)?.role;
  return role === "admin" ? "admin" : "user";
}

/**
 * True when the given professional profile belongs to the current auth user.
 * Use this to disable Book Now / Add Review on own profile.
 */
export function isOwnProfessionalProfile(professionalId: string): boolean {
  const mine = getLoggedInProfessionalId();
  if (!mine) return false;
  return String(mine) === String(professionalId);
}

/** Current user is on Doovly Pro (from professional data). */
export function isCurrentUserPro(): boolean {
  const proId = getLoggedInProfessionalId();
  if (!proId) return MOCK_USER.subscribed;
  const pro = getProfessionalById(proId);
  return pro?.subscribed ?? MOCK_USER.subscribed;
}

/** Current user has a verified professional badge. */
export function isCurrentUserVerified(): boolean {
  const proId = getLoggedInProfessionalId();
  if (!proId) return false;
  return getProfessionalById(proId)?.verified ?? false;
}

export const FREE_SAVE_LIMIT = 5;

// =====================================================
// IN-MEMORY SAVED IDS (mock persistence)
// =====================================================

let savedIds: string[] = ["1", "2"];

export function getSavedIds(): string[] {
  return [...savedIds];
}

export function getSavedProviders(): Professional[] {
  return savedIds
    .map((id) => getProfessionalById(id))
    .filter((p): p is Professional => p != null);
}

export function isSaved(providerId: string): boolean {
  return savedIds.includes(String(providerId));
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
  const id = String(providerId);

  if (savedIds.includes(id)) {
    savedIds = savedIds.filter((x) => x !== id);
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
 * Keeps MOCK_USER and the professional record in sync.
 */
export function setMockSubscribed(subscribed: boolean) {
  MOCK_USER.subscribed = subscribed;

  const proId = MOCK_USER.professionalId;
  if (!proId) return;

  const pro = PROFESSIONALS.find((p) => p.id === String(proId));
  if (pro) {
    pro.subscribed = subscribed;
  }
}

export { getProfessionalById };
