/**
 * Saved providers (mock)
 * --------------------
 * Free users: max 5 saved professionals
 * Pro (subscribed): unlimited
 *
 * Later: swap bodies for API / AsyncStorage.
 */

import { getProfessionalById, type Professional } from "@/services/professionals";

// =====================================================
// MOCK LOGGED-IN USER (replace with auth later)
// =====================================================

export type AppUser = {
  id: string;
  name: string;
  /** true = Doovly Pro → unlimited saves */
  subscribed: boolean;
  /**
   * Professional profile id that belongs to this user (if they offer services).
   * Used to detect "own profile" so Book Now / Add Review can be disabled.
   * Later: from auth context / API (e.g. /me).
   */
  professionalId: string | null;
};

/** Change subscribed to true to test unlimited saves */
export const MOCK_USER: AppUser = {
  id: "u1",
  name: "John Jerry",
  subscribed: false,
  // Matches MOCK_LOGGED_IN_PRO_ID in profile tab ("1" = John Chukwuemeka)
  professionalId: "1",
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
 * True when the given professional profile belongs to the current auth user.
 * Use this to disable Book Now / Add Review on own profile.
 */
export function isOwnProfessionalProfile(professionalId: string): boolean {
  const mine = getLoggedInProfessionalId();
  if (!mine) return false;
  return String(mine) === String(professionalId);
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
  if (MOCK_USER.subscribed) return null;
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

export function setMockSubscribed(subscribed: boolean) {
  MOCK_USER.subscribed = subscribed;
}
