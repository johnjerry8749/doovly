import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { NotificationPayload, NotificationService } from './types';

/**
 * True when the app is running inside Expo Go (not a development build / standalone).
 * Remote Android push was removed from Expo Go starting SDK 53.
 */
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Remote Android push tokens are not available in Expo Go.
 * Development builds and production builds support them.
 */
function canUseAndroidRemotePush(): boolean {
  if (Platform.OS !== 'android') return true;
  return !isExpoGo();
}

function getEasProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

// Configure foreground presentation safely (local notifications still work in Expo Go).
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
  console.warn('[Notifications] setNotificationHandler failed:', error);
}

/**
 * Notification service used by Doovly.
 * - Local notifications work everywhere (including Android Expo Go).
 * - Real Expo push tokens are requested only when remote push is supported
 *   (iOS, or Android outside Expo Go / in a development build).
 */
class MockNotificationService implements NotificationService {
  async register(): Promise<string | null> {
    try {
      // Physical device recommended for push; simulators often cannot receive remote push.
      if (!Device.isDevice) {
        console.log('[Notifications] Not a physical device — skipping push token');
        // Still allow local notification permission flow for testing UI.
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return null;
      }

      // Android 13+ channel required for notifications to appear.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#16A34A',
        });
      }

      // ── Android Expo Go: do NOT call getExpoPushTokenAsync (crashes / throws) ──
      if (!canUseAndroidRemotePush()) {
        const localToken = `ExpoGoLocalToken[android-${Date.now()}]`;
        console.log(
          '[Notifications] Android Expo Go detected — remote push disabled. Using local token only:',
          localToken,
        );
        console.log(
          '[Notifications] Use an Android development build for real push notifications.',
        );
        return localToken;
      }

      // ── Real Expo Push token (iOS Expo Go, development builds, production) ──
      const projectId = getEasProjectId();
      if (!projectId) {
        console.warn(
          '[Notifications] Missing EAS projectId — cannot get Expo push token',
        );
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;
      console.log('[Notifications] Registered Expo push token:', token);
      return token;
    } catch (error) {
      // Never crash the app if notifications fail (especially on Expo Go).
      console.warn('[Notifications] register() failed safely:', error);
      return null;
    }
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: true,
        },
        trigger: null, // immediate local notification
      });
      console.log('[Notifications] Sent local notification:', payload.title);
    } catch (error) {
      console.warn('[Notifications] send() failed safely:', error);
    }
  }
}

export const mockNotificationService = new MockNotificationService();
