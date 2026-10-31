import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { retryBootstrap } from "@/lib/bootstrapData";
import { checkOnline } from "@/lib/dataState";
import { getDataState, setDataPhase, subscribeDataState, type DataState } from "@/lib/dataState";
import { queryClient } from "@/lib/queryClient";
import { queryPersister } from "@/lib/queryPersister";

export default function OfflineConnectionNotice() {
  const [dataState, setDataState] = useState<DataState>(getDataState);
  const [retrying, setRetrying] = useState(false);
  const retryingRef = useRef(false);

  useEffect(() => {
    return subscribeDataState(setDataState);
  }, []);

  const handleRetry = useCallback(async () => {
    if (retryingRef.current) return;

    retryingRef.current = true;
    setRetrying(true);
    try {
      // Confirm that Supabase is reachable before restarting the JS app.
      // Do not wait for individual screen caches here: a failed cache request
      // must not prevent the full app refresh the user requested.
      const online = await checkOnline();
      if (!online) {
        setDataPhase("offline", "No network connection");
        return;
      }

      if (Updates.isEnabled) {
        // Remove persisted query data so the restarted app loads fresh values.
        queryClient.clear();
        await queryPersister.removeClient();
        await Updates.reloadAsync();
        return;
      }

      // Development clients may not have expo-updates enabled. Keep the
      // existing bootstrap retry as a safe fallback for those environments.
      await retryBootstrap();
      if (getDataState().phase === "error") {
        setDataPhase("error", getDataState().error ?? "Doovly could not refresh.");
      }
    } catch (error) {
      console.warn("[OfflineConnectionNotice] app reload failed:", error);
      setDataPhase("error", "Doovly could not refresh. Please tap Retry.");
    } finally {
      retryingRef.current = false;
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    if (dataState.phase !== "offline" || retrying) return;

    // While the offline overlay is visible, quietly probe for restored
    // connectivity. Once Supabase responds, restart the complete app.
    const interval = setInterval(async () => {
      if (retryingRef.current) return;
      const online = await checkOnline(false);
      if (online) void handleRetry();
    }, 4000);

    return () => clearInterval(interval);
  }, [dataState.phase, retrying, handleRetry]);

  const visible = dataState.phase === "offline" || dataState.phase === "error" || retrying;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Keep the offline notice visible until the connection is restored.
      }}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="cloud-offline-outline" size={34} color="#159447" />
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
