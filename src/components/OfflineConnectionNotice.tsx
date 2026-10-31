import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { retryBootstrap } from "@/lib/bootstrapData";
import { getDataState, subscribeDataState, type DataState } from "@/lib/dataState";

export default function OfflineConnectionNotice() {
  const [dataState, setDataState] = useState<DataState>(getDataState);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    return subscribeDataState(setDataState);
  }, []);

  const handleRetry = useCallback(async () => {
    if (retrying) return;

    setRetrying(true);
    try {
      await retryBootstrap();
    } finally {
      setRetrying(false);
    }
  }, [retrying]);

  if (dataState.phase !== "offline" && !retrying) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.wifiIcon}>⌁</Text>
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.message}>
          Please check your internet connection and try again.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry internet connection"
          disabled={retrying}
          onPress={() => void handleRetry()}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && !retrying && styles.retryButtonPressed,
            retrying && styles.retryButtonDisabled,
          ]}
        >
          {retrying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.retryText}>Retry</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
    backgroundColor: "rgba(17, 24, 39, 0.48)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  wifiIcon: {
    fontSize: 38,
    lineHeight: 42,
    color: "#159447",
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 9,
  },
  retryButton: {
    minWidth: 132,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#159447",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 24,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonDisabled: {
    opacity: 0.75,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
