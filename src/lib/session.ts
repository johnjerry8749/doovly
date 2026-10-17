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
  phone: string | null;
  fullName: string | null;
  role: string;
  professionalId: string | null;
  professionalUuid: string | null;
  subscribed: boolean;
  paidSubscribed: boolean;
  /** True when an admin has explicitly set the subscription access override. */
  subscriptionOverride: boolean;
  proTrialEndsAt: string | null;
  verified: boolean;
};

let cached: SessionUser | null = null;
let loadPromise: Promise<SessionUser | null> | null = null;
let accessChannel: ReturnType<typeof supabase.channel> | null = null;
let accessChannelUserId: string | null = null;

function watchSessionAccess(userId: string) {
  if (accessChannel && accessChannelUserId === userId) return;
  if (accessChannel) void supabase.removeChannel(accessChannel);

  accessChannelUserId = userId;
  accessChannel = supabase
    .channel("session-pro-access-" + userId)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: "id=eq." + userId },
      () => { void loadSessionUser(true); },
    )
    .subscribe();
}

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

    const { data: profileData, error: profileError } = await supabase.rpc("get_my_private_profile");
    const profile = profileData && typeof profileData === "object" ? profileData : null;
    if (profileError) {
      console.warn("[session] private profile could not be loaded:", profileError.message);
    }

    const [{ data: pro }, { data: subscription }] = await Promise.all([
      supabase
        .from("professionals")
        .select("id, subscribed, is_verified")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("professional_subscriptions")
        .select("plan_code,status,admin_override,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const hasProfileOverride =
      profile?.pro_access_override !== null &&
      profile?.pro_access_override !== undefined;
    const subscriptionOverride = hasProfileOverride || Boolean(subscription?.admin_override);
    const subscriptionGrantsPro = hasProfileOverride
      ? profile.pro_access_override === true
      : subscription?.admin_override
        ? subscription?.plan_code === "pro" && subscription?.status === "active"
        : Boolean(pro?.subscribed);

    cached = {
      uuid: user.id,
      publicId: user.id,
      email: profile?.email ?? user.email ?? null,
      phone: profile?.phone ?? null,
      fullName: profile?.full_name ?? null,
      role: profile?.role ?? "user",
      professionalId: pro?.id ?? null,
      professionalUuid: pro?.id ?? null,
      subscribed: Boolean(pro?.subscribed),
      paidSubscribed: subscriptionGrantsPro,
      subscriptionOverride,
      proTrialEndsAt: profile?.pro_trial_ends_at ?? null,
      verified: Boolean(pro?.is_verified),
    };
    watchSessionAccess(user.id);
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
    subscribed: cached.subscriptionOverride
      ? cached.paidSubscribed
      : cached.subscribed || trialActive,
  };
}

export function clearSessionCache() {
  cached = null;
  accessChannelUserId = null;
  if (accessChannel) void supabase.removeChannel(accessChannel);
  accessChannel = null;
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
