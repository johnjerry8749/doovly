/**
 * Real push notification service.
 *
 * Expo Go does not provide the native remote-push runtime needed by this app.
 * Use an Expo development build or production build for push notifications.
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { getCachedSessionUser, loadSessionUser } from "@/lib/session";
import type { NotificationPayload, NotificationService } from "./types";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

let cachedService: NotificationService | null = null;

function getNotificationService(): NotificationService {
  if (cachedService) return cachedService;

  if (isExpoGo()) {
    cachedService = {
      async register() {
        console.log(
          "[Notifications] Expo Go detected. Install a development build for real push notifications.",
        );
        return null;
      },
      async send(payload) {
        console.log("[Notifications] Expo Go local fallback:", payload.title);
      },
    };
    return cachedService;
  }

  // Lazy-load expo-notifications so Android Expo Go never evaluates the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { expoNotificationService } = require("./expoNotificationService");
  cachedService = expoNotificationService as NotificationService;
  return cachedService;
}

async function savePushToken(token: string | null) {
  if (!token) return;

  const user = await loadSessionUser();
  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({ expo_push_token: token })
    .eq("id", user.uuid);

  if (error) {
    console.warn("[Notifications] failed to save push token:", error.message);
  }
}

async function clearPushToken() {
  const user = getCachedSessionUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ expo_push_token: null })
    .eq("id", user.uuid);
}

export async function registerForNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const token = await getNotificationService().register();
  if (token) await savePushToken(token);
  return token;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  return getNotificationService().send(payload);
}

export function addNotificationResponseListener(
  callback: (data: Record<string, any>) => void,
): () => void {
  if (isExpoGo()) return () => {};

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require("expo-notifications") as typeof import("expo-notifications");
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    callback((response.notification.request.content.data ?? {}) as Record<string, any>);
  });

  return () => subscription.remove();
}

export function bindPushAuthListener(): () => void {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      void registerForNotifications();
    } else if (event === "SIGNED_OUT") {
      void clearPushToken();
    }
  });

  return () => data.subscription.unsubscribe();
}

export const Notifications = {
  newBooking: () =>
    sendNotification({
      title: "New Booking Request",
      body: "Someone just booked your service",
      data: { type: "booking", screen: "bookings" },
    }),
  bookingAccepted: () =>
    sendNotification({
      title: "Booking Accepted!",
      body: "Your booking has been accepted by the professional",
      data: { type: "booking_accepted", screen: "bookings" },
    }),
  bookingCancelled: () =>
    sendNotification({
      title: "Booking Cancelled",
      body: "A booking was cancelled",
      data: { type: "booking_cancelled" },
    }),
  newMessage: () =>
    sendNotification({
      title: "New Message",
      body: "You have a new message",
      data: { type: "chat", screen: "chat" },
    }),
  custom: (title: string, body: string, data?: Record<string, any>) =>
    sendNotification({ title, body, data }),
};
