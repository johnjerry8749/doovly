import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { NotificationPayload, NotificationService } from "./types";

function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (error) {
  console.warn("[Notifications] handler setup failed:", error);
}

class ExpoNotificationService implements NotificationService {
  async register(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log("[Notifications] Push registration requires a physical device.");
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("[Notifications] Permission not granted.");
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Doovly",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#16A34A",
        });
      }

      const projectId = getEasProjectId();
      if (!projectId) {
        console.warn("[Notifications] Missing EAS projectId.");
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      console.log("[Notifications] Expo push token registered.");
      return token.data;
    } catch (error) {
      console.warn("[Notifications] register failed safely:", error);
      return null;
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          sound: "default",
        },
        trigger: null,
      });
    } catch (error) {
      console.warn("[Notifications] local notification failed:", error);
    }
  }
}

export const expoNotificationService = new ExpoNotificationService();
