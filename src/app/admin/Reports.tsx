import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDashboardStats, type DashboardStats } from "@/services/admin/dashboard";

export default function Reports() {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let active = true;
    getDashboardStats()
      .then((data) => { if (active) setStats(data); })
      .catch((error) => console.warn("[Reports]", error));
    return () => { active = false; };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 56 }]}>
      <Text style={styles.title}>Reports</Text>
      <Text style={styles.subtitle}>Analytics and reports</Text>
      <Text style={styles.subtitle}>Users: {stats?.totalUsers ?? "—"}</Text>
      <Text style={styles.subtitle}>Verified professionals: {stats?.totalVerifiedUsers ?? "—"}</Text>
      <Text style={styles.subtitle}>Active Pro subscriptions: {stats?.totalProSubUsers ?? "—"}</Text>
      <Text style={styles.subtitle}>Service requests: {stats?.totalPostRequests ?? "—"}</Text>
      <Text style={styles.subtitle}>Bookings: {stats?.totalBookings ?? "—"}</Text>
      <Text style={styles.subtitle}>Pro subscription revenue: ₦{(stats?.totalRevenueFromPro ?? 0).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
});
