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
};

/** Change subscribed to true to test unlimited saves */
export const MOCK_USER: AppUser = {
  id: "u1",
  name: "John Jerry",
  subscribed: false,
};

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
