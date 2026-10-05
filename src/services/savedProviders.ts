/**
 * Saved providers + current user helpers
 * Real auth only — no mock session fallbacks.
 */

import { supabase } from "@/lib/supabase";
import { toUuid, tryToUuid } from "@/lib/ids";
import {
  loadSessionUser,
  getCachedSessionUser,
  type SessionUser,
} from "@/lib/session";
import {
  getProfessionalById,
  ensureProfessionalsLoaded,
  type Professional,
} from "@/services/professionals";

export type AppUser = {
  id: string;
  name: string;
  subscribed: boolean;
  professionalId: string | null;
};

export const FREE_SAVE_LIMIT = 5;

let savedIds: string[] = [];
let savedLoaded = false;

function sessionToAppUser(s: SessionUser): AppUser {
  return {
    id: s.publicId,
    name: s.fullName ?? s.email ?? "User",
    subscribed: s.subscribed,
    professionalId: s.professionalId,
  };
}

export async function ensureCurrentUserLoaded(): Promise<AppUser | null> {
  const s = await loadSessionUser();
  return s ? sessionToAppUser(s) : null;
}

export function getCurrentUser(): AppUser {
  const s = getCachedSessionUser();
  if (!s) {
    return {
      id: "",
      name: "Guest",
      subscribed: false,
      professionalId: null,
    };
  }
  return sessionToAppUser(s);
}

export const MOCK_USER: AppUser = new Proxy({} as AppUser, {
  get(_t, prop: string) {
    return (getCurrentUser() as Record<string, unknown>)[prop];
  },
  set(_t, prop: string, value) {
    const u = getCurrentUser() as Record<string, unknown>;
    u[prop] = value;
    return true;
  },
});

export function getLoggedInProfessionalId(): string | null {
  return getCurrentUser().professionalId ?? null;
}

export function getCurrentUserRole(): "user" | "admin" {
  const s = getCachedSessionUser();
  if (!s) return "user";
  if (s.role === "admin") return "admin";
  const proId = s.professionalId;
  if (!proId) return "user";
  return getProfessionalById(proId)?.role === "admin" ? "admin" : "user";
}

export function isOwnProfessionalProfile(professionalId: string): boolean {
  const mine = getLoggedInProfessionalId();
  if (!mine) return false;
  return String(mine) === String(professionalId);
}

export function isCurrentUserPro(): boolean {
  const s = getCachedSessionUser();
  if (!s) return false;
  if (s.subscribed) return true;
  const proId = s.professionalId;
  if (!proId) return false;
  return getProfessionalById(proId)?.subscribed ?? false;
}

export function isCurrentUserVerified(): boolean {
  const s = getCachedSessionUser();
  if (!s) return false;
  if (s.verified) return true;
  const proId = s.professionalId;
  if (!proId) return false;
  return getProfessionalById(proId)?.verified ?? false;
}

async function fetchSavedIds(): Promise<string[]> {
  const s = await loadSessionUser();
  if (!s) {
    savedIds = [];
    savedLoaded = true;
    return savedIds;
  }

  const { data, error } = await supabase
    .from("saved_providers")
    .select("professional_id, professionals ( mock_id )")
    .eq("user_id", s.uuid);

  if (error) throw error;

  savedIds = (data ?? []).map((row: any) => {
    const mock = row.professionals?.mock_id;
    return mock ? String(mock) : String(row.professional_id);
  });
  savedLoaded = true;
  return savedIds;
}

export async function ensureSavedLoaded(): Promise<string[]> {
  if (savedLoaded) return savedIds;
  return fetchSavedIds();
}

export function invalidateSavedCache() {
  savedLoaded = false;
  savedIds = [];
}

export function getSavedIds(): string[] {
  if (!savedLoaded) void ensureSavedLoaded();
  return [...savedIds];
}

export function getSavedProviders(): Professional[] {
  return getSavedIds()
    .map((id) => getProfessionalById(id))
    .filter((p): p is Professional => p != null);
}

export function isSaved(providerId: string): boolean {
  return savedIds.includes(String(providerId));
}

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
  | { ok: false; reason: "limit" | "auth" };

export function toggleSave(providerId: string): SaveResult {
  const s = getCachedSessionUser();
  if (!s) return { ok: false, reason: "auth" };

  const id = String(providerId);

  if (savedIds.includes(id)) {
    savedIds = savedIds.filter((x) => x !== id);
    void removeSavedRemote(s.uuid, id);
    return { ok: true, saved: false };
  }

  if (!canSaveMore()) {
    return { ok: false, reason: "limit" };
  }

  savedIds = [...savedIds, id];
  void addSavedRemote(s.uuid, id);
  return { ok: true, saved: true };
}

async function addSavedRemote(userUuid: string, providerId: string) {
  const proUuid = toUuid("professional", providerId);
  await supabase.from("saved_providers").upsert({
    user_id: userUuid,
    professional_id: proUuid,
  });
}

async function removeSavedRemote(userUuid: string, providerId: string) {
  const proUuid = tryToUuid("professional", providerId) ?? providerId;
  await supabase
    .from("saved_providers")
    .delete()
    .eq("user_id", userUuid)
    .eq("professional_id", proUuid);
}

export function setMockSubscribed(subscribed: boolean) {
  const s = getCachedSessionUser();
  if (s) s.subscribed = subscribed;
}

export { getProfessionalById };
