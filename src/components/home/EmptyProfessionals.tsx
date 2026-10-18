import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onViewAllInNigeria: () => void;
};

/**
 * Empty state when no professionals match filters/location.
 * Exact copy of original empty UI.
 */
export function EmptyProfessionals({ onViewAllInNigeria }: Props) {
  return (
    <View style={styles.emptyProsContainer}>
      <Ionicons name="search-outline" size={48} color="#ccc" />
      <Text style={styles.emptyProsTitle}>
        No Avaliable professionals near you
      </Text>
      <Text style={styles.emptyProsSubtitle}>
        Try another location or view all in Nigeria.
      </Text>
      <TouchableOpacity
        style={styles.emptyProsButton}
        onPress={onViewAllInNigeria}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyProsButtonText}>View all in Nigeria</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyProsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyProsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
    textAlign: "center",
  },
  emptyProsSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyProsButton: {
    marginTop: 18,
    backgroundColor: "#159447",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyProsButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
