/**
 * Real auth session helpers.
 * No mock fallbacks — callers must handle null / AuthRequiredError.
 */

import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export class AuthRequiredError extends Error {
  constructor(message = "You must be signed in") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export type SessionUser = {
  uuid: string;
  publicId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  professionalId: string | null;
  professionalUuid: string | null;
  subscribed: boolean;
  paidSubscribed: boolean;
  proTrialEndsAt: string | null;
  verified: boolean;
};

let cached: SessionUser | null = null;
let loadPromise: Promise<SessionUser | null> | null = null;

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("[session] getSession", error.message);
    return null;
  }
  return data.session;
}

export async function requireUser(): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new AuthRequiredError();
  return user;
}

export async function loadSessionUser(
  force = false,
): Promise<SessionUser | null> {
  if (cached && !force) return cached;
  if (loadPromise && !force) return loadPromise;

  loadPromise = (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      cached = null;
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, pro_trial_ends_at")
      .eq("id", user.id)
      .maybeSingle();

    const { data: pro } = await supabase
      .from("professionals")
      .select("id, subscribed, is_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    cached = {
      uuid: user.id,
      publicId: user.id,
      email: profile?.email ?? user.email ?? null,
      fullName: profile?.full_name ?? null,
      role: profile?.role ?? "user",
      professionalId: pro?.id ?? null,
      professionalUuid: pro?.id ?? null,
      subscribed: Boolean(pro?.subscribed),
      paidSubscribed: Boolean(pro?.subscribed),
      proTrialEndsAt: profile?.pro_trial_ends_at ?? null,
      verified: Boolean(pro?.is_verified),
    };
    return getCachedSessionUser();
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export function getCachedSessionUser(): SessionUser | null {
  if (!cached) return null;

  const trialActive = Boolean(
    cached.proTrialEndsAt &&
      new Date(cached.proTrialEndsAt).getTime() > Date.now(),
  );

  return {
    ...cached,
    subscribed: cached.subscribed || trialActive,
  };
}

export function clearSessionCache() {
  cached = null;
}

export function bindAuthListener(
  onChange?: (user: SessionUser | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange(async (event) => {
    if (event === "SIGNED_OUT") {
      clearSessionCache();
      onChange?.(null);
      return;
    }
    const u = await loadSessionUser(true);
    onChange?.(u);
  });
  return () => data.subscription.unsubscribe();
}
