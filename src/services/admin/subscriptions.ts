import { supabase } from "@/lib/supabase";

export type SubscriptionPlan = "Pro" | "Free";
export type SubscriptionStatus = "Active" | "Expired" | "Cancelled";
export type SubscriptionUser = {
  id: string;
  name: string;
  profession: string;
  location: string;
  avatar: any;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  statusLabel: string;
  endDate: string;
  userId: string;
  professionalId: string;
};

let cache: SubscriptionUser[] = [];

function map(row: any, profile?: any, pro?: any): SubscriptionUser {
  const active = row.status === "active";
  return {
    id: row.id,
    userId: row.user_id,
    professionalId: row.professional_id,
    name: profile?.full_name ?? "Unnamed User",
    profession: pro?.profession ?? "Professional",
    location: profile?.city ?? pro?.city ?? "",
    avatar: profile?.avatar_url ? { uri: profile.avatar_url } : undefined,
    plan: row.plan_code === "pro" ? "Pro" : "Free",
    status: active ? "Active" : row.status === "cancelled" ? "Cancelled" : "Expired",
    statusLabel: active ? (row.end_date ? "Renews " + new Date(row.end_date).toLocaleDateString() : "Active") : (row.status_label || "Expired"),
    endDate: row.end_date ?? "—",
  };
}

export async function listSubscriptionsAsync(): Promise<SubscriptionUser[]> {
  const [rowsRes, profilesRes, prosRes] = await Promise.all([
    supabase.from("professional_subscriptions")
      .select("id,user_id,professional_id,plan_id,plan_code,status,status_label,end_date,created_at,updated_at,admin_override")
      .order("updated_at", { ascending: false }),
    supabase.from("profiles")
      .select("id,full_name,city,avatar_url")
      .order("created_at", { ascending: false }),
    supabase.from("professionals")
      .select("id,user_id,profession,city"),
  ]);

  const error = [rowsRes, profilesRes, prosRes].find((result) => result.error)?.error;
  if (error) throw error;

  const profiles = new Map((profilesRes.data ?? []).map((row: any) => [row.id, row]));
  const professionals = new Map((prosRes.data ?? []).map((row: any) => [row.id, row]));
  const subscriptionByProfessional = new Map<string, any>();
  for (const row of rowsRes.data ?? []) {
    if (!subscriptionByProfessional.has(row.professional_id)) {
      subscriptionByProfessional.set(row.professional_id, row);
    }
  }

  cache = (prosRes.data ?? []).map((professional: any) => {
    const profile = profiles.get(professional.user_id);
    const existing = subscriptionByProfessional.get(professional.id);
    if (existing) return map(existing, profile, professional);

    return {
      id: "free:" + professional.id,
      userId: professional.user_id,
      professionalId: professional.id,
      name: profile?.full_name ?? "Unnamed User",
      profession: professional.profession ?? "Professional",
      location: profile?.city ?? professional.city ?? "",
      avatar: profile?.avatar_url ? { uri: profile.avatar_url } : undefined,
      plan: "Free" as const,
      status: "Active" as const,
      statusLabel: "Free",
      endDate: "—",
    };
  });

  return cache;
}

export function listSubscriptions() {
  return cache;
}

export function getSubscriptionStats(list = cache) {
  return {
    total: list.length,
    pro: list.filter((item) => item.plan === "Pro").length,
    free: list.filter((item) => item.plan === "Free").length,
  };
}

export async function updateSubscription(
  id: string,
  input: { plan?: SubscriptionPlan; status?: SubscriptionStatus },
) {
  const existing = cache.find((item) => item.id === id);
  if (!existing) throw new Error("Subscription record not found.");

  const plan = input.plan ?? existing.plan;
  const status = input.status ?? existing.status;
  const planCode = plan === "Pro" ? "pro" : "free";
  const statusCode = status === "Active" ? "active" : status === "Cancelled" ? "cancelled" : "expired";
  const grantsPro = planCode === "pro" && statusCode === "active";
  const planLookupCode = planCode === "pro" ? "pro" : "basic";

  const { data: planRow, error: planError } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("code", planLookupCode)
    .maybeSingle();
  if (planError) throw planError;

  const values = {
    user_id: existing.userId,
    professional_id: existing.professionalId,
    plan_id: planRow?.id ?? null,
    plan_code: planCode,
    status: statusCode,
    status_label: status === "Active" ? (grantsPro ? "Active" : "Free") : status,
    admin_override: true,
  };

  if (id.startsWith("free:")) {
    const { error } = await supabase.from("professional_subscriptions").insert(values);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("professional_subscriptions")
      .update(values)
      .eq("id", id);
    if (error) throw error;
  }

  const { error: professionalError } = await supabase
    .from("professionals")
    .update({ subscribed: grantsPro })
    .eq("id", existing.professionalId);
  if (professionalError) throw professionalError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      pro_access_override: grantsPro,
      pro_access_override_updated_at: new Date().toISOString(),
    })
    .eq("id", existing.userId);
  if (profileError) throw profileError;

  const refreshed = await listSubscriptionsAsync();
  return refreshed.find((item) => item.userId === existing.userId);
}
