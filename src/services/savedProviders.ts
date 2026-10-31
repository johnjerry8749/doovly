/**
 * Saved providers + current user helpers
 * Real auth only — no mock session fallbacks.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { addCustomerInfoListener, isProEntitlementCached } from "@/lib/revenuecat";

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
let savedLoadPromise: Promise<string[]> | null = null;
let savedGeneration = 0;

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

  // An explicit admin decision takes precedence over the store entitlement.
  // This lets support revoke access immediately without cancelling the store plan.
  if (s.subscriptionOverride) return s.paidSubscribed;

  // Paid Pro access otherwise comes from RevenueCat's active doovly_pro entitlement.
  if (isProEntitlementCached()) return true;

  // Preserve Doovly's existing first-30-days trial policy while it is valid.
  // A stale Supabase "subscribed" flag must not keep an expired paid plan unlocked.
  return Boolean(
    !s.paidSubscribed &&
      s.proTrialEndsAt &&
      new Date(s.proTrialEndsAt).getTime() > Date.now(),
  );
}

/**
 * Reactive Pro access for screens whose limits or controls depend on Pro.
 * Updates when the admin changes the profile override or RevenueCat refreshes.
 */
export function useCurrentUserPro(): boolean {
  const [pro, setPro] = useState(() => isCurrentUserPro());

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refresh = async () => {
      await loadSessionUser(true);
      if (active) setPro(isCurrentUserPro());
    };

    const removeCustomerListener = addCustomerInfoListener(() => {
      if (active) setPro(isCurrentUserPro());
    });

    void refresh()
      .then(() => {
        const session = getCachedSessionUser();
        if (!active || !session) return;
        channel = supabase
          .channel("reactive-pro-access-" + session.uuid)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "profiles", filter: "id=eq." + session.uuid },
            () => { void refresh(); },
          )
          .subscribe();
      })
      .catch((error) => {
        console.warn("[Pro access] refresh failed:", error);
      });

    return () => {
      active = false;
      removeCustomerListener();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return pro;
}

export function isCurrentUserVerified(): boolean {
  const s = getCachedSessionUser();
  if (!s) return false;
  if (s.verified) return true;
  const proId = s.professionalId;
  if (!proId) return false;
  return getProfessionalById(proId)?.verified ?? false;
}

async function fetchSavedIds(generation: number): Promise<string[]> {
  const s = await loadSessionUser();
  if (!s) {
    if (generation === savedGeneration) { savedIds = []; savedLoaded = true; }
    return [];
  }

  const { data, error } = await supabase
    .from("saved_providers")
    .select("professional_id")
    .eq("user_id", s.uuid);

  if (error) throw error;

  const ids = (data ?? []).map((row: any) => String(row.professional_id));
  if (generation === savedGeneration) { savedIds = ids; savedLoaded = true; }
  return ids;
}

export async function ensureSavedLoaded(): Promise<string[]> {
  if (savedLoaded) return savedIds;
  if (!savedLoadPromise) {
    const request = fetchSavedIds(savedGeneration);
    const tracked = request.finally(() => { if (savedLoadPromise === tracked) savedLoadPromise = null; });
    savedLoadPromise = tracked;
  }
  return savedLoadPromise;
}

export function invalidateSavedCache() {
  savedGeneration += 1;
  savedLoaded = false;
  savedIds = [];
  savedLoadPromise = null;
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
  | { ok: false; reason: "limit" | "auth" | "error"; message?: string };

export async function toggleSave(providerId: string): Promise<SaveResult> {
  const s = await loadSessionUser();
  if (!s) return { ok: false, reason: "auth" };

  await ensureSavedLoaded();
  const id = String(providerId);
  const currentlySaved = savedIds.includes(id);

  if (!currentlySaved && !canSaveMore()) {
    return { ok: false, reason: "limit" };
  }

  const proUuid = id;

  try {
    if (currentlySaved) {
      const { error } = await supabase
        .from("saved_providers")
        .delete()
        .eq("user_id", s.uuid)
        .eq("professional_id", proUuid);

      if (error) throw error;
      savedIds = savedIds.filter((x) => x !== id);
      return { ok: true, saved: false };
    }

    const { error } = await supabase
      .from("saved_providers")
      .upsert(
        { user_id: s.uuid, professional_id: proUuid },
        { onConflict: "user_id,professional_id" },
      );

    if (error) throw error;
    savedIds = [...savedIds.filter((x) => x !== id), id];
    return { ok: true, saved: true };
  } catch (error) {
    console.warn("Saved provider update failed:", error);
    return {
      ok: false,
      reason: "error",
      message: error instanceof Error ? error.message : "Could not update saved provider.",
    };
  }
}


export { getProfessionalById };
