# Notifications System

Doovly uses `expo-notifications` for local + remote push notifications.

## Important (Android + Expo Go)

Starting with Expo SDK 53, **Android remote push notifications are not available in Expo Go**.

- On **Android Expo Go**: the service only uses local notifications and does **not** call `getExpoPushTokenAsync` (this prevents the crash).
- On **iOS**, development builds, and production: real Expo push tokens are requested normally.

For real Android push during development, use an **Android development build** (see commands below).

## How to use

```ts
import { Notifications, registerForNotifications } from '@/services/notifications';

// Request permission + get token (safe on Expo Go Android)
await registerForNotifications();

// Local test notifications
Notifications.newBooking();
Notifications.bookingAccepted();
Notifications.newMessage();
```

## Android development build (required for real Android push)

```bash
npx eas-cli login
npx eas build --profile development --platform android
```

Install the resulting APK on your device, then:

```bash
npx expo start --dev-client
```

## Switching implementation later

If you split a separate `realNotificationService.ts`, change the active service in `index.ts` only.
