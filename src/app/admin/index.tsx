import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAdminStats } from "@/services/admin";

const GREEN = "#159447";

const LINKS: {
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  href: "/admin/users" | "/admin/requests" | "/admin/bookings";
}[] = [
  {
    title: "Users",
    subtitle: "Manage accounts & roles",
    icon: "people-outline",
    href: "/admin/users",
  },
  {
    title: "Service requests",
    subtitle: "Moderate job posts",
    icon: "document-text-outline",
    href: "/admin/requests",
  },
  {
    title: "Bookings",
    subtitle: "Accepted & declined orders",
    icon: "calendar-outline",
    href: "/admin/bookings",
  },
];

export default function AdminDashboard() {
  const stats = getAdminStats();

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
        <Text style={styles.headerTitle}>Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>Dashboard</Text>
        <Text style={styles.hint}>Overview of platform activity</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.users}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.requests}</Text>
            <Text style={styles.statLabel}>Requests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.bookings}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingOffers}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Manage</Text>
        {LINKS.map((item) => (
          <TouchableOpacity
            key={item.href}
            style={styles.linkCard}
            activeOpacity={0.85}
            onPress={() => router.push(item.href)}
          >
            <View style={styles.linkIcon}>
              <Ionicons name={item.icon} size={22} color={GREEN} />
            </View>
            <View style={styles.linkText}>
              <Text style={styles.linkTitle}>{item.title}</Text>
              <Text style={styles.linkSub}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  content: { padding: 16, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#111827" },
  hint: { fontSize: 14, color: "#6B7280", marginTop: 4, marginBottom: 16 },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: GREEN },
  statLabel: { fontSize: 13, color: "#6B7280", marginTop: 4, fontWeight: "600" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  linkText: { flex: 1 },
  linkTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  linkSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
});
