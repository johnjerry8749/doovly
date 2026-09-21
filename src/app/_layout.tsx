import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { LocationProvider } from "@/context/LocationContext";
import { queryClient } from "@/lib/queryClient";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocationProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </LocationProvider>
    </QueryClientProvider>
  );
}
