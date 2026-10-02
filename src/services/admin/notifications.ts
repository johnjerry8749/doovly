/**
 * Admin notifications service
 * --------------------------
 * Admin screens import from @/services/admin/notifications
 *
 * NOW  → mock history + fan-out into user in-app inbox
 * LATER → single POST /admin/notifications; server fans out
 *
 * When you wire the API, replace ONLY the bodies of:
 *   listAdminNotifications, sendAdminNotification, sendInAppToUser
 * Keep signatures and return shapes stable so screens stay unchanged.
 */

import {
  getMockAdminNotifications,
  addMockAdminNotification,
  AUDIENCE_LABELS,
  type AdminNotification,
  type NotificationChannel,
  type NotificationAudience,
  type NotificationStatus,
} from "@/data/adminNotifications";
import { listUsers, type AdminUser } from "@/services/admin/users";
import {
  addInAppNotification,
  getCurrentUserId,
} from "@/services/inAppNotifications";
import { getLoggedInProfessionalId } from "@/services/savedProviders";
import { API_URL, apiRequest } from "@/services/api";

export type {
  AdminNotification,
  NotificationChannel,
  NotificationAudience,
  NotificationStatus,
};
export { AUDIENCE_LABELS };

export type SendAdminNotificationInput = {
  title: string;
  message: string;
  channels: NotificationChannel[];
  sentTo: NotificationAudience;
  link?: string;
};

export type SendAdminNotificationResult = {
  notification: AdminNotification;
  /** How many users received an in-app row (mock fan-out). */
  inAppRecipientCount: number;
};

export type SendInAppToUserInput = {
  /** Admin user / professional id */
  userId: string;
  title: string;
  message: string;
};

/** True when EXPO_PUBLIC_API_URL is set — use real HTTP instead of mock. */
function useApi(): boolean {
  return Boolean(API_URL);
}

/**
 * Map admin/professional id → in-app notification owner id.
 * Mock logged-in pro ("1") shares inbox userId "u1".
 * Other pros use "pro-{id}" so their rows stay separate until real auth.
 * LATER: backend uses real auth user UUIDs; this helper can be deleted.
 */
export function resolveInAppUserId(professionalOrUserId: string): string {
  const loggedProId = getLoggedInProfessionalId();
  if (loggedProId && String(professionalOrUserId) === String(loggedProId)) {
    return getCurrentUserId();
  }
  // Already a user-style id
  if (String(professionalOrUserId).startsWith("u")) {
    return String(professionalOrUserId);
  }
  return `pro-${professionalOrUserId}`;
}

function matchesAudience(
  user: AdminUser,
  audience: NotificationAudience,
): boolean {
  if (user.isSuspended) return false;
  switch (audience) {
    case "all":
      return true;
    case "verified":
      return user.verified;
    case "subscribed":
      return user.subscription === "Pro";
    case "free":
      return user.subscription === "Free";
    default:
      return false;
  }
}

/** Resolve which admin users should get this broadcast. */
export function resolveAudienceUsers(
  audience: NotificationAudience,
): AdminUser[] {
  return listUsers().filter((u) => matchesAudience(u, audience));
}

/**
 * Mock: write one in-app row per recipient when "in-app" channel is selected.
 * API path: server does this — client only POSTs once.
 */
function fanOutInAppMock(
  recipients: AdminUser[],
  title: string,
  message: string,
): number {
  const seen = new Set<string>();
  let count = 0;
  for (const user of recipients) {
    const inboxUserId = resolveInAppUserId(user.id);
    if (seen.has(inboxUserId)) continue;
    seen.add(inboxUserId);
    addInAppNotification({
      userId: inboxUserId,
      type: "general",
      title,
      body: message,
    });
    count += 1;
  }
  return count;
}

/** List notification history (admin). */
export async function listAdminNotifications(): Promise<AdminNotification[]> {
  if (useApi()) {
    // TODO backend: GET /admin/notifications
    return apiRequest<AdminNotification[]>("/admin/notifications");
  }
  return getMockAdminNotifications();
}

/**
 * Send a broadcast notification.
 * Mock: records history + fans out in-app rows to matching users.
 * API: one POST; server handles history + inbox + email/SMS.
 */
export async function sendAdminNotification(
  input: SendAdminNotificationInput,
): Promise<SendAdminNotificationResult> {
  const title = input.title.trim();
  const message = input.message.trim();

  if (useApi()) {
    // TODO backend: POST /admin/notifications
    // Body: { title, message, channels, sentTo, link }
    // Server must: store history, create per-user in-app rows, queue email/SMS
    const notification = await apiRequest<AdminNotification>(
      "/admin/notifications",
      {
        method: "POST",
        body: JSON.stringify({
          title,
          message,
          channels: input.channels,
          sentTo: input.sentTo,
          link: input.link?.trim() || undefined,
        }),
      },
    );
    return { notification, inAppRecipientCount: 0 };
  }

  // —— MOCK path ——
  const notification = addMockAdminNotification({
    title,
    message,
    channels: input.channels,
    sentTo: input.sentTo,
    link: input.link,
  });

  let inAppRecipientCount = 0;
  if (input.channels.includes("in-app")) {
    const recipients = resolveAudienceUsers(input.sentTo);
    inAppRecipientCount = fanOutInAppMock(recipients, title, message);
  }

  // Email / SMS: mock only logs in history; real providers need backend
  return { notification, inAppRecipientCount };
}

/**
 * Send in-app notification to one user (Users detail modal).
 * Mock: writes directly to that user's inbox.
 * API: POST /admin/users/:id/notifications or similar.
 */
export async function sendInAppToUser(
  input: SendInAppToUserInput,
): Promise<{ ok: true; inboxUserId: string }> {
  const title = input.title.trim();
  const message = input.message.trim();

  if (useApi()) {
    // TODO backend: POST /admin/users/:userId/notifications
    await apiRequest(`/admin/users/${input.userId}/notifications`, {
      method: "POST",
      body: JSON.stringify({ title, message, channel: "in-app" }),
    });
    return { ok: true, inboxUserId: input.userId };
  }

  const inboxUserId = resolveInAppUserId(input.userId);
  addInAppNotification({
    userId: inboxUserId,
    type: "general",
    title,
    body: message,
  });
  return { ok: true, inboxUserId };
}
