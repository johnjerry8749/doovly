import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack, useRouter } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { queryClient } from "@/lib/queryClient";
import {
  addNotificationResponseListener,
  bindPushAuthListener,
  registerForNotifications,
} from "@/services/notifications";
import { bootstrapAppData, retryBootstrap } from "@/lib/bootstrapData";
import { loadSessionUser } from "@/lib/session";
import SystemNotificationBanner from "@/components/SystemNotificationBanner";
import {
  addCustomerInfoListener,
  getCustomerInfo,
  initRevenueCat,
} from "@/lib/revenuecat";

function RevenueCatBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    let removeListener: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      await initRevenueCat(user?.id ?? null);
      if (cancelled || !user?.id) return;

      await getCustomerInfo();
      if (cancelled) return;

      removeListener = addCustomerInfoListener(() => {
        // RevenueCat helper keeps the entitlement cache synchronized.
      });
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [user?.id]);

  return null;
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    void registerForNotifications();
    const unbindPushAuth = bindPushAuthListener();

    const removeNotificationResponse = addNotificationResponseListener(
      async (data) => {
        try {
          if (typeof data?.link === "string" && data.link.length > 0) {
            router.push(data.link as any);
            return;
          }

          const user = await loadSessionUser();
          if (user?.uuid) {
            router.push(`/notification/${user.uuid}` as any);
          }
        } catch (error) {
          console.warn("[Notifications] response navigation failed:", error);
        }
      },
    );

    void bootstrapAppData();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void retryBootstrap();
        void registerForNotifications();
      }
    });

    return () => {
      subscription.remove();
      unbindPushAuth();
      removeNotificationResponse();
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <SystemNotificationBanner />
      <AuthProvider>
        <RevenueCatBootstrap />
        <LocationProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
