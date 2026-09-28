import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const GREEN = "#159447";

const MOCK_BOOKINGS = [
  { id: "b1", title: "Full Body Massage", status: "Accepted", amount: 18000 },
  { id: "b2", title: "Car Repair", status: "Declined", amount: 28000 },
  { id: "b3", title: "AC Repair", status: "Accepted", amount: 22000 },
];

export default function AdminBookingsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={MOCK_BOOKINGS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>
                {item.status} · ₦{item.amount.toLocaleString()}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                item.status === "Accepted"
                  ? styles.badgeOk
                  : styles.badgeBad,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  item.status === "Accepted"
                    ? styles.badgeTextOk
                    : styles.badgeTextBad,
                ]}
              >
                {item.status}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No bookings</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  title: { fontSize: 15, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeOk: { backgroundColor: "#DBEAFE" },
  badgeBad: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  badgeTextOk: { color: "#2563EB" },
  badgeTextBad: { color: "#DC2626" },
  empty: { textAlign: "center", color: "#9CA3AF", marginTop: 40 },
});
