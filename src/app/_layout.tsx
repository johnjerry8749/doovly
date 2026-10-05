import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider } from "@/context/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { registerForNotifications } from "@/services/notifications";
import { bootstrapAppData, retryBootstrap } from "@/lib/bootstrapData";

export default function RootLayout() {
  useEffect(() => {
    registerForNotifications();
    void bootstrapAppData();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void retryBootstrap();
    });

    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
