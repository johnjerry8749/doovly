import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import { isAdmin } from "@/services/admin";

/**
 * Admin shell — no bottom tabs.
 * Routes: /admin, /admin/users, /admin/requests, /admin/bookings
 */
export default function AdminLayout() {
  useEffect(() => {
    if (!isAdmin()) {
      // Non-admins cannot stay in admin area
      router.replace("/(tab)/home");
    }
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="bookings" />
    </Stack>
  );
}
