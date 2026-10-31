import React from "react";
import { RefreshControl } from "react-native";

type PullToRefreshProps = {
  refreshing: boolean;
  onRefresh: () => void;
};

/**
 * Shared native pull-to-refresh indicator.
 * Data fetching and error handling remain owned by each screen.
 */
export function PullToRefresh({ refreshing, onRefresh }: PullToRefreshProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#159447"
      colors={["#159447"]}
      progressBackgroundColor="#FFFFFF"
    />
  );
}