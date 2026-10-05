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

async function audienceIds(audience: NotificationAudience): Promise<string[]> {
  // Do not use nested PostgREST relationships here. The schema has multiple
  // paths between profiles/professionals/subscriptions, which can make
  // relationship inference ambiguous. Resolve each table explicitly.
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

  const audience = (profilesRes.data ?? []).filter((profile) => {
    const userId = String(profile.id);
    const suspended = Boolean(profile.is_suspended);
    if (suspended) return false;

    const verified = Boolean(verifiedByUser.get(userId));
    const subscribed = subscribedUsers.has(userId);

    switch (audience) {
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

  audienceCache = audience.map((profile) => ({
    id: String(profile.id),
    verified: Boolean(verifiedByUser.get(String(profile.id))),
    pro: subscribedUsers.has(String(profile.id)),
    suspended: Boolean(profile.is_suspended),
  }));

  return audience.map((profile) => String(profile.id));
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
    sentTo:
      (row.sent_to ?? "all") as NotificationAudience,
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

  const recipients = input.channels.includes("in-app")
    ? await audienceIds(input.sentTo)
    : [];

  const { data, error } = await supabase
    .from("admin_notifications")
    .insert({
      title,
      message,
      channels: input.channels,
      sent_to: input.sentTo,
      sent_to_label: labels[input.sentTo],
      status: "Sent",
      link: input.link?.trim() || null,
      sent_at: new Date().toISOString(),
    })
    .select(
      "id,title,message,channels,sent_to,sent_to_label,status,link,sent_at,created_at",
    )
    .single();

  if (error) throw error;

  if (input.channels.includes("in-app") && recipients.length) {
    const rows = recipients.map((user_id) => ({
      user_id,
      type: "general",
      title,
      body: message,
      unread: true,
      data: input.link?.trim() ? { link: input.link.trim() } : null,
    }));

    const notificationInsert = await supabase
      .from("notifications")
      .insert(rows);

    if (notificationInsert.error) throw notificationInsert.error;
  }

  return {
    notification: map(data),
    inAppRecipientCount: recipients.length,
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
