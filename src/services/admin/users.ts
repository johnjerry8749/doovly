import { supabase } from "@/lib/supabase";

export type VerificationStatus = "Verified" | "Pending" | "Rejected";
export type SubscriptionTier = "Pro" | "Free";
export type UserRole = "user" | "professional" | "admin";

export type AdminUser = {
  id: string; name: string; profession: string; email: string; phone: string;
  location: string; verified: boolean; verificationStatus: VerificationStatus;
  subscription: SubscriptionTier; role: UserRole; isSuspended: boolean;
  avatar: any; memberSince: string; lastActive: string;
};

let cache: AdminUser[] = [];

function mapUser(row: any): AdminUser {
  const pro = Array.isArray(row.professionals) ? row.professionals[0] : row.professionals;
  const sub = Array.isArray(pro?.professional_subscriptions)
    ? pro.professional_subscriptions.find((s: any) => s.status === "active") ?? pro?.professional_subscriptions[0]
    : pro?.professional_subscriptions;
  const verified = Boolean(pro?.is_verified);
  return {
    id: row.id,
    name: row.full_name ?? "Unnamed User",
    profession: pro?.profession ?? "User",
    email: row.email ?? "",
    phone: row.phone ?? "",
    location: row.city ?? pro?.city ?? "",
    verified,
    verificationStatus: verified ? "Verified" : "Pending",
    subscription: sub?.status === "active" ? "Pro" : "Free",
    role: (row.role ?? "user") as UserRole,
    isSuspended: Boolean(row.is_suspended),
    avatar: row.avatar_url ? { uri: row.avatar_url } : undefined,
    memberSince: row.member_since ?? row.created_at ?? "",
    lastActive: row.last_active_label ?? row.last_active_at ?? "",
  };
}

export async function listUsersAsync(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,phone,email,avatar_url,role,city,is_suspended,member_since,created_at,last_active_label,last_active_at,professionals(id,profession,city,is_verified,professional_subscriptions(status))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  cache = (data ?? []).map(mapUser);
  return cache;
}
export function listUsers(): AdminUser[] { return cache; }
export async function getUserByIdAsync(id: string) { return (await listUsersAsync()).find((u) => u.id === id); }

export async function suspendUser(id: string) {
  const { data, error } = await supabase.from("profiles").update({ is_suspended: true }).eq("id", id).select("id,full_name,phone,email,avatar_url,role,city,is_suspended,member_since,created_at,last_active_label,last_active_at,professionals(id,profession,city,is_verified,professional_subscriptions(status))").single();
  if (error) throw error;
  const user = mapUser(data); cache = cache.map((u) => u.id === id ? user : u); return user;
}
export async function unsuspendUser(id: string) {
  const { data, error } = await supabase.from("profiles").update({ is_suspended: false }).eq("id", id).select("id,full_name,phone,email,avatar_url,role,city,is_suspended,member_since,created_at,last_active_label,last_active_at,professionals(id,profession,city,is_verified,professional_subscriptions(status))").single();
  if (error) throw error;
  const user = mapUser(data); cache = cache.map((u) => u.id === id ? user : u); return user;
}
export async function updateUser(id: string, input: Partial<Pick<AdminUser,"name"|"profession"|"email"|"phone"|"location"|"verificationStatus"|"subscription"|"role">>) {
  const profilePatch: any = {};
  if (input.name !== undefined) profilePatch.full_name = input.name;
  if (input.email !== undefined) profilePatch.email = input.email;
  if (input.phone !== undefined) profilePatch.phone = input.phone;
  if (input.location !== undefined) profilePatch.city = input.location;
  if (input.role !== undefined) profilePatch.role = input.role;
  if (input.verificationStatus !== undefined) profilePatch._verification = input.verificationStatus;
  if (input.subscription !== undefined) profilePatch._subscription = input.subscription;
  const { error } = await supabase.from("profiles").update(Object.fromEntries(Object.entries(profilePatch).filter(([k]) => !k.startsWith("_")))).eq("id", id);
  if (error) throw error;

  const pro = await supabase.from("professionals").select("id").eq("user_id", id).maybeSingle();
  if (pro.error) throw pro.error;
  if (pro.data && input.profession !== undefined) {
    const { error: pe } = await supabase.from("professionals").update({
      profession: input.profession,
      is_verified: input.verificationStatus === "Verified" ? true : input.verificationStatus === "Rejected" ? false : undefined,
    }).eq("id", pro.data.id);
    if (pe) throw pe;
  }
  return getUserByIdAsync(id);
}
