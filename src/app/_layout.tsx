import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider } from "@/context/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { registerForNotifications } from "@/services/notifications";
import { bootstrapAppData } from "@/lib/bootstrapData";

export default function RootLayout() {
  useEffect(() => {
    registerForNotifications();
    void bootstrapAppData();
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
