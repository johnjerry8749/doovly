import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack, useRouter } from "expo-router";
import { focusManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { queryPersister, shouldPersistQuery } from "@/lib/queryPersister";
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

const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

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
    focusManager.setFocused(AppState.currentState === "active");

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      const isActive = state === "active";
      focusManager.setFocused(isActive);

      if (isActive) {
        // Refresh bootstrap data when the app returns to the foreground.
        void retryBootstrap();
        void registerForNotifications();
      }
    });

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

    return () => {
      appStateSubscription.remove();
      unbindPushAuth();
      removeNotificationResponse();
    };
  }, [router]);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: QUERY_CACHE_MAX_AGE,
        buster: "doovly-query-cache-v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            shouldPersistQuery(query.queryKey),
        },
      }}
    >
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
    </PersistQueryClientProvider>
  );
}
