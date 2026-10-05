import { supabase } from "@/lib/supabase";

export type NotificationChannel = "in-app" | "email" | "sms";
export type NotificationAudience = "all" | "verified" | "subscribed" | "free";
export type NotificationStatus = "Sent" | "Scheduled" | "Failed";
export type AdminNotification = {
  id: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  sentTo: NotificationAudience;
  sentToLabel: string;
  status: NotificationStatus;
  link?: string;
  sentAt: string;
  createdAt: string;
};

export type SendAdminNotificationInput = {
  title: string;
  message: string;
  channels: NotificationChannel[];
  sentTo: NotificationAudience;
  link?: string;
};
export type SendAdminNotificationResult = {
  notification: AdminNotification;
  inAppRecipientCount: number;
  emailRecipientCount: number;
  smsRecipientCount: number;
  errors: string[];
  systemNotificationShown: boolean;
};
export type SendInAppToUserInput = {
  userId: string;
  title: string;
  message: string;
};
export type SendInAppToUserResult = {
  ok: true;
  inboxUserId: string;
  systemNotificationShown: boolean;
};

const labels: Record<NotificationAudience, string> = {
  all: "All Users",
  verified: "Verified Users",
  subscribed: "Subscribed Users",
  free: "Free Users",
};

export const AUDIENCE_LABELS = labels;

let audienceCache: {
  id: string;
  verified: boolean;
  pro: boolean;
  suspended: boolean;
}[] = [];

async function audienceIds(audienceType: NotificationAudience): Promise<string[]> {
  const [profilesRes, professionalsRes, subscriptionsRes] = await Promise.all([
    supabase.from("profiles").select("id,is_suspended"),
    supabase.from("professionals").select("user_id,is_verified"),
    supabase
      .from("professional_subscriptions")
      .select("user_id,status")
      .eq("status", "active"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (professionalsRes.error) throw professionalsRes.error;
  if (subscriptionsRes.error) throw subscriptionsRes.error;

  const verifiedByUser = new Map<string, boolean>();

  for (const professional of professionalsRes.data ?? []) {
    if (professional.user_id) {
      verifiedByUser.set(
        String(professional.user_id),
        Boolean(professional.is_verified),
      );
    }
  }

  const subscribedUsers = new Set(
    (subscriptionsRes.data ?? [])
      .map((row) => row.user_id)
      .filter(Boolean)
      .map(String),
  );

  const selectedProfiles = (profilesRes.data ?? []).filter((profile) => {
    const userId = String(profile.id);
    const suspended = Boolean(profile.is_suspended);

    if (suspended) return false;

    const verified = Boolean(verifiedByUser.get(userId));
    const subscribed = subscribedUsers.has(userId);

    switch (audienceType) {
      case "verified":
        return verified;
      case "subscribed":
        return subscribed;
      case "free":
        return !subscribed;
      case "all":
      default:
        return true;
    }
  });

  audienceCache = selectedProfiles.map((profile) => ({
    id: String(profile.id),
    verified: Boolean(verifiedByUser.get(String(profile.id))),
    pro: subscribedUsers.has(String(profile.id)),
    suspended: Boolean(profile.is_suspended),
  }));

  return selectedProfiles.map((profile) => String(profile.id));
}

export async function resolveAudienceUsersAsync(
  audience: NotificationAudience,
): Promise<string[]> {
  return audienceIds(audience);
}

export function resolveAudienceUsers(_audience: NotificationAudience): any[] {
  return audienceCache;
}

function map(row: any): AdminNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    channels: (row.channels ?? []) as NotificationChannel[],
    sentTo: (row.sent_to ?? "all") as NotificationAudience,
    sentToLabel:
      row.sent_to_label ??
      labels[row.sent_to as NotificationAudience] ??
      "All Users",
    status: (row.status ?? "Sent") as NotificationStatus,
    link: row.link ?? undefined,
    sentAt: row.sent_at ?? row.created_at,
    createdAt: row.created_at,
  };
}

export async function listAdminNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select(
      "id,title,message,channels,sent_to,sent_to_label,status,link,sent_at,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(map);
}

export async function sendAdminNotification(
  input: SendAdminNotificationInput,
): Promise<SendAdminNotificationResult> {
  const title = input.title.trim();
  const message = input.message.trim();

  if (!title || !message) {
    throw new Error("Notification title and message are required.");
  }

  if (!input.channels.length) {
    throw new Error("Select at least one delivery channel.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Your admin session has expired. Please sign in again.");

  const { data, error } = await supabase.functions.invoke("admin-send-notification", {
    body: {
      title,
      message,
      channels: input.channels,
      sentTo: input.sentTo,
      link: input.link?.trim() || undefined,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    let detail = error.message;
    try {
      const context = (error as any).context;
      if (context?.json) {
        const payload = await context.json();
        detail = payload?.error || payload?.errors?.join?.("\n") || detail;
      }
    } catch {}
    throw new Error(detail);
  }

  if (!data?.notification) {
    throw new Error(data?.error || data?.errors?.join?.("\n") || "Notification delivery failed.");
  }

  const errors = Array.isArray(data.errors) ? data.errors.map(String) : [];

  return {
    notification: map(data.notification),
    inAppRecipientCount: Number(data.inAppRecipientCount ?? 0),
    emailRecipientCount: Number(data.emailRecipientCount ?? 0),
    smsRecipientCount: Number(data.smsRecipientCount ?? 0),
    errors,
    systemNotificationShown: false,
  };
}

export async function sendInAppToUser(
  input: SendInAppToUserInput,
): Promise<SendInAppToUserResult> {
  const title = input.title.trim();
  const message = input.message.trim();

  if (!input.userId || !title || !message) {
    throw new Error("User, title and message are required.");
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: "general",
    title,
    body: message,
    unread: true,
  });

  if (error) throw error;

  return {
    ok: true,
    inboxUserId: input.userId,
    systemNotificationShown: false,
  };
}
