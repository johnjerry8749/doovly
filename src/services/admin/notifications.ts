/**
 * Admin notifications service
 * --------------------------
 * Admin screens import from @/services/admin/notifications
 *
 * NOW (mock):
 *   - Admin history row
 *   - Fan-out in-app inbox rows for matching users
 *   - System/local device banner on THIS device when the logged-in
 *     mock user is in the audience (expo-notifications)
 *
 * LATER (API):
 *   - Single POST /admin/notifications
 *   - Server stores history, creates in-app rows, queues email/SMS,
 *     and sends remote Expo/FCM/APNs push to each user's device tokens
 *
 * Keep function signatures stable so screens do not change on swap.
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
import {
  registerForNotifications,
  sendNotification,
} from "@/services/notifications";

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
  /** True if a system banner was shown on this device (mock only). */
  systemNotificationShown: boolean;
};

export type SendInAppToUserInput = {
  /** Admin user / professional id */
  userId: string;
  title: string;
  message: string;
};

export type SendInAppToUserResult = {
  ok: true;
  inboxUserId: string;
  systemNotificationShown: boolean;
};

/** True when EXPO_PUBLIC_API_URL is set — use real HTTP instead of mock. */
function useApi(): boolean {
  return Boolean(API_URL);
}

/**
 * Map admin/professional id → in-app notification owner id.
 * Mock logged-in pro ("1") shares inbox userId "u1".
 * Other pros use "pro-{id}" until real auth.
 */
export function resolveInAppUserId(professionalOrUserId: string): string {
  const loggedProId = getLoggedInProfessionalId();
  if (loggedProId && String(professionalOrUserId) === String(loggedProId)) {
    return getCurrentUserId();
  }
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

/**
 * Show a system/OS notification on THIS device (local).
 * Mock stand-in for remote push to the logged-in user.
 *
 * LATER: backend sends Expo Push / FCM / APNs to stored device tokens.
 * Client should NOT schedule local banners for other users' pushes.
 */
async function showSystemNotificationOnThisDevice(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  try {
    // Ensure permission + Android channel exist
    await registerForNotifications();
    await sendNotification({
      title,
      body,
      data: {
        type: "admin_broadcast",
        screen: "notification",
        ...(data || {}),
      },
    });
    return true;
  } catch (e) {
    console.warn("[Admin Notifications] system notification failed:", e);
    return false;
  }
}

/**
 * Mock: if the current logged-in user is among recipients, show a device banner.
 * Simulates "I received a push on my phone" while developing on one device.
 */
async function maybeShowSystemForCurrentUser(
  recipients: AdminUser[],
  title: string,
  message: string,
): Promise<boolean> {
  const currentInboxId = getCurrentUserId();
  const includesMe = recipients.some(
    (u) => resolveInAppUserId(u.id) === currentInboxId,
  );
  if (!includesMe) return false;
  return showSystemNotificationOnThisDevice(title, message);
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
 *
 * Mock:
 *   history + in-app fan-out + local system banner if current user is targeted
 *
 * API (when EXPO_PUBLIC_API_URL is set):
 *   POST /admin/notifications only — server must:
 *   1) store admin history
 *   2) create per-user in-app notification rows
 *   3) queue email/SMS if those channels are selected
 *   4) send remote push to each recipient's stored Expo/FCM/APNs tokens
 */
export async function sendAdminNotification(
  input: SendAdminNotificationInput,
): Promise<SendAdminNotificationResult> {
  const title = input.title.trim();
  const message = input.message.trim();
  const wantsInApp = input.channels.includes("in-app");

  if (useApi()) {
    // TODO backend: POST /admin/notifications
    // Server handles in-app rows + remote push + email/SMS
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
    return {
      notification,
      inAppRecipientCount: 0,
      systemNotificationShown: false,
    };
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
  let systemNotificationShown = false;
  const recipients = resolveAudienceUsers(input.sentTo);

  if (wantsInApp) {
    inAppRecipientCount = fanOutInAppMock(recipients, title, message);
    // Device banner for the developer/tester on this phone
    systemNotificationShown = await maybeShowSystemForCurrentUser(
      recipients,
      title,
      message,
    );
  }

  // Email / SMS: mock only records channels in history; providers need backend
  return { notification, inAppRecipientCount, systemNotificationShown };
}

/**
 * Send in-app (+ system if target is current user) to one user.
 *
 * API: POST /admin/users/:userId/notifications
 * Server creates inbox row + remote push to that user's tokens.
 */
export async function sendInAppToUser(
  input: SendInAppToUserInput,
): Promise<SendInAppToUserResult> {
  const title = input.title.trim();
  const message = input.message.trim();

  if (useApi()) {
    // TODO backend: POST /admin/users/:userId/notifications
    // { title, message, channels: ["in-app"] } → inbox + remote push
    await apiRequest(`/admin/users/${input.userId}/notifications`, {
      method: "POST",
      body: JSON.stringify({
        title,
        message,
        channels: ["in-app"],
      }),
    });
    return {
      ok: true,
      inboxUserId: input.userId,
      systemNotificationShown: false,
    };
  }

  const inboxUserId = resolveInAppUserId(input.userId);
  addInAppNotification({
    userId: inboxUserId,
    type: "general",
    title,
    body: message,
  });

  let systemNotificationShown = false;
  if (inboxUserId === getCurrentUserId()) {
    systemNotificationShown = await showSystemNotificationOnThisDevice(
      title,
      message,
      { targetUserId: inboxUserId },
    );
  }

  return { ok: true, inboxUserId, systemNotificationShown };
}
