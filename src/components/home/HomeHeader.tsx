import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  locationName: string;
  loadingLocation: boolean;
  onLocationPress: () => void;
  onNotificationPress: () => void;
};

/**
 * Top location + notification header.
 * Styles and layout match the original home.tsx exactly.
 */
export function HomeHeader({
  locationName,
  loadingLocation,
  onLocationPress,
  onNotificationPress,
}: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.locationContainer}
        onPress={onLocationPress}
        activeOpacity={0.7}
      >
        <Ionicons name="location" size={16} color="#159447" />
        {loadingLocation ? (
          <View style={styles.locationLoading}>
            <ActivityIndicator size="small" color="#159447" />
            <Text style={styles.locationLoadingText}>Getting location...</Text>
          </View>
        ) : (
          <Text style={styles.locationText} numberOfLines={1}>
            {locationName}
          </Text>
        )}
        <Ionicons name="chevron-down" size={14} color="#6B7280" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.notificationButton}
        activeOpacity={0.7}
        onPress={onNotificationPress}
      >
        <Ionicons name="notifications-outline" size={28} color="#111" />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 18,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    flexShrink: 1,
    marginLeft: 6,
  },
  locationLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 6,
  },
  locationLoadingText: { fontSize: 13, color: "#6B7280" },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#159447",
  },
});
