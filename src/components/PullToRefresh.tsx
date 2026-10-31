import React, { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import * as Updates from "expo-updates";
import { queryClient } from "@/lib/queryClient";
import { queryPersister } from "@/lib/queryPersister";

type PullToRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

/**
 * Shared native pull-to-refresh indicator.
 * In installed builds, pulling down restarts the whole app with fresh
 * query data so every mounted screen is initialized again.
 */
export function PullToRefresh({ refreshing, onRefresh }: PullToRefreshProps) {
  const [restarting, setRestarting] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (restarting) return;

    if (!Updates.isEnabled) {
      // Keep normal screen refresh behavior in Expo Go/development clients.
      onRefresh();
      return;
    }

    setRestarting(true);
    try {
      queryClient.clear();
      await queryPersister.removeClient();
      await Updates.reloadAsync();
    } catch (error) {
      console.warn("[PullToRefresh] Full app refresh failed:", error);
      setRestarting(false);
      // Preserve the screen's existing refresh as a fallback if app reload
      // is unavailable in the current runtime.
      onRefresh();
    }
  }, [onRefresh, restarting]);

  return (
    <RefreshControl
      refreshing={refreshing || restarting}
      onRefresh={() => void handleRefresh()}
      tintColor="#159447"
      colors={["#159447"]}
      progressBackgroundColor="#FFFFFF"
    />
  );
}
