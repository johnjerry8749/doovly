/**
 * In-App Notifications service
 * ----------------------------
 * Screens import ONLY from here for the notification list inside the app.
 *
 * Notifications list still uses local mock data until notifications table swap.
 * getCurrentUserId prefers real Supabase auth session (cached).
 */

import {
  NOTIFICATIONS,
  type Notification,
  type NotifType,
} from "@/data/notifications";
import {
  getLoggedInProfessionalId,
  MOCK_USER,
} from "@/services/savedProviders";
import { listProfessionals } from "@/services/professionals";
import { supabase } from "@/lib/supabase";
import { MOCK_SESSION } from "@/lib/ids";

export type { Notification, NotifType };

/** Cached auth user id so sync callers keep working. */
let cachedUserId: string = MOCK_SESSION.userUuid || MOCK_USER.id;

/** Bootstrap from current session (call once at app start if needed). */
export async function hydrateCurrentUserId(): Promise<string> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      cachedUserId = session.user.id;
      return cachedUserId;
    }
  } catch (e) {
    console.warn("hydrateCurrentUserId:", e);
  }
  return cachedUserId;
}

// Keep cache fresh when auth changes
try {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      cachedUserId = session.user.id;
    } else {
      cachedUserId = MOCK_SESSION.userUuid || MOCK_USER.id;
    }
  });
  void hydrateCurrentUserId();
} catch {
  /* supabase may throw if env missing in some test contexts */
}

/** Current logged-in user id (real auth UUID when signed in). */
export function getCurrentUserId(): string {
  return cachedUserId;
}

export function getNotificationsByUserId(userId: string): Notification[] {
  return NOTIFICATIONS.filter((n) => n.userId === String(userId));
}

export function getMyNotifications(): Notification[] {
  return getNotificationsByUserId(getCurrentUserId());
}

export function getUnreadCount(userId?: string): number {
  const uid = userId ?? getCurrentUserId();
  return getNotificationsByUserId(uid).filter((n) => n.unread).length;
}

export function markNotificationRead(notificationId: string): void {
  const row = NOTIFICATIONS.find((n) => n.id === notificationId);
  if (row) row.unread = false;
}

export type InAppNotificationInput = {
  userId: string;
  type: NotifType;
  title: string;
  body: string;
};

export function addInAppNotification(
  input: InAppNotificationInput,
): Notification {
  const notification: Notification = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: String(input.userId),
    type: input.type,
    title: input.title,
    body: input.body,
    time: "Just now",
    unread: true,
  };

  NOTIFICATIONS.unshift(notification);

  // Best-effort persist to Supabase when online
  void supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      unread: true,
      time_label: "Just now",
    })
    .then(({ error }) => {
      if (error) console.warn("addInAppNotification persist:", error.message);
    });

  return notification;
}

export function notifySubscribedProsInArea(input: {
  city: string;
  title: string;
  body: string;
}): number {
  const city = input.city.trim().toLowerCase();
  // listProfessionals is async — fire-and-forget fan-out
  void (async () => {
    try {
      const pros = await listProfessionals();
      const filtered = pros.filter((pro) => {
        if (!pro.subscribed) return false;
        const proCity = pro.city.trim().toLowerCase();
        return proCity.includes(city) || city.includes(proCity);
      });
      const currentUserId = getCurrentUserId();
      const currentProId = getLoggedInProfessionalId();
      const recipientIds = new Set<string>();

      for (const pro of filtered) {
        if (currentProId && String(pro.id) === String(currentProId)) {
          recipientIds.add(currentUserId);
          continue;
        }
        if (pro.userId) recipientIds.add(String(pro.userId));
        else recipientIds.add(`pro-${pro.id}`);
      }

      recipientIds.forEach((userId) => {
        addInAppNotification({
          userId,
          type: "general",
          title: input.title,
          body: input.body,
        });
      });
    } catch (e) {
      console.warn("notifySubscribedProsInArea:", e);
    }
  })();

  return 0;
}

export function markAllNotificationsRead(userId?: string): void {
  const uid = userId ?? getCurrentUserId();
  NOTIFICATIONS.forEach((n) => {
    if (n.userId === String(uid)) n.unread = false;
  });
  void supabase
    .from("notifications")
    .update({ unread: false })
    .eq("user_id", uid)
    .eq("unread", true);
}
