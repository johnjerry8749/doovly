import { supabase } from "@/lib/supabase";

export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type SubscriptionTier = "Pro" | "Free";
export type UserRole = "user" | "professional" | "admin";

export type AdminUser = {
  id: string;
  name: string;
  profession: string;
  email: string;
  phone: string;
  location: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  subscription: SubscriptionTier;
  role: UserRole;
  isSuspended: boolean;
  avatar: any;
  memberSince: string;
  lastActive: string;
};

let cache: AdminUser[] = [];

function mapUser(row: any, pro?: any, sub?: any): AdminUser {
  const subscription: SubscriptionTier =
    row.pro_access_override !== null && row.pro_access_override !== undefined
      ? (row.pro_access_override ? "Pro" : "Free")
      : (sub?.status === "active" && sub?.plan_code === "pro" ? "Pro" : "Free");

  return {
    id: row.id,
    name: row.full_name ?? "Unnamed User",
    profession: pro?.profession ?? "User",
    email: row.email ?? "",
    phone: row.phone ?? "",
    location: row.city ?? pro?.city ?? "",
    verified: Boolean(pro?.is_verified),
    verificationStatus: pro?.is_verified ? "Verified" : "Pending",
    subscription,
    role: (row.role ?? "user") as UserRole,
    isSuspended: Boolean(row.is_suspended),
    avatar: row.avatar_url ? { uri: row.avatar_url } : undefined,
    memberSince: row.member_since ?? row.created_at ?? "",
    lastActive: row.last_active_label ?? row.last_active_at ?? "",
  };
}

export async function listUsersAsync(): Promise<AdminUser[]> {
  const [profiles, pros, subs] = await Promise.all([
    supabase.rpc("admin_list_profiles"),
    supabase.from("professionals")
      .select("id,user_id,profession,city,is_verified"),
    supabase.from("professional_subscriptions")
      .select("id,user_id,professional_id,plan_code,status,updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const error = [profiles, pros, subs].find((result) => result.error)?.error;
  if (error) throw error;

  const professionalsByUser = new Map((pros.data ?? []).map((item: any) => [item.user_id, item]));
  const subscriptionByUser = new Map<string, any>();
  for (const item of subs.data ?? []) {
    if (!subscriptionByUser.has(item.user_id)) subscriptionByUser.set(item.user_id, item);
  }

  cache = (profiles.data ?? []).map((profile: any) =>
    mapUser(profile, professionalsByUser.get(profile.id), subscriptionByUser.get(profile.id)),
  );
  return cache;
}

export function listUsers() {
  return cache;
}

export async function getUserByIdAsync(id: string) {
  return (await listUsersAsync()).find((user) => user.id === id);
}

export async function suspendUser(id: string) {
  const { error } = await supabase.from("profiles").update({ is_suspended: true }).eq("id", id);
  if (error) throw error;
  return getUserByIdAsync(id);
}

export async function unsuspendUser(id: string) {
  const { error } = await supabase.from("profiles").update({ is_suspended: false }).eq("id", id);
  if (error) throw error;
  return getUserByIdAsync(id);
}

export async function updateUser(
  id: string,
  input: Partial<Pick<AdminUser, "name" | "profession" | "email" | "phone" | "location" | "verificationStatus" | "subscription" | "role">>,
) {
  const profilePatch: Record<string, unknown> = {};
  if (input.name !== undefined) profilePatch.full_name = input.name;
  if (input.email !== undefined) profilePatch.email = input.email;
  if (input.phone !== undefined) profilePatch.phone = input.phone;
  if (input.location !== undefined) profilePatch.city = input.location;
  if (input.role !== undefined) profilePatch.role = input.role;

  // This field was previously accepted by the admin form but silently ignored.
  // NULL means RevenueCat/trial rules apply; TRUE/FALSE are explicit admin decisions.
  if (input.subscription !== undefined) {
    profilePatch.pro_access_override = input.subscription === "Pro";
    profilePatch.pro_access_override_updated_at = new Date().toISOString();
  }

  if (Object.keys(profilePatch).length) {
    const { error } = await supabase.from("profiles").update(profilePatch).eq("id", id);
    if (error) throw error;
  }

  const pro = await supabase.from("professionals")
    .select("id")
    .eq("user_id", id)
    .maybeSingle();
  if (pro.error) throw pro.error;

  if (pro.data) {
    const professionalPatch: Record<string, unknown> = {};
    if (input.profession !== undefined) professionalPatch.profession = input.profession;
    if (input.verificationStatus !== undefined) {
      professionalPatch.is_verified = input.verificationStatus === "Verified";
    }
    if (input.subscription !== undefined) {
      professionalPatch.subscribed = input.subscription === "Pro";
    }

    if (Object.keys(professionalPatch).length) {
      const { error } = await supabase.from("professionals")
        .update(professionalPatch)
        .eq("id", pro.data.id);
      if (error) throw error;
    }

    if (input.subscription !== undefined) {
      const planCode = input.subscription === "Pro" ? "pro" : "basic";
      const status = input.subscription === "Pro" ? "active" : "expired";
      const [{ data: plan, error: planError }, { data: existing, error: existingError }] = await Promise.all([
        supabase.from("subscription_plans").select("id").eq("code", planCode).maybeSingle(),
        supabase.from("professional_subscriptions")
          .select("id")
          .eq("professional_id", pro.data.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (planError) throw planError;
      if (existingError) throw existingError;

      const values = {
        user_id: id,
        professional_id: pro.data.id,
        plan_id: plan?.id ?? null,
        plan_code: input.subscription === "Pro" ? "pro" : "free",
        status,
        status_label: input.subscription === "Pro" ? "Active" : "Free",
        admin_override: true,
      };

      if (existing?.id) {
        const { error } = await supabase.from("professional_subscriptions")
          .update(values)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professional_subscriptions").insert(values);
        if (error) throw error;
      }
    }
  }

  return getUserByIdAsync(id);
}
