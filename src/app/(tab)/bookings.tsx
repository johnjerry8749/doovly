import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Booking,
  BookingSide,
  BookingStatus,
  fetchBookings,
} from "@/data/bookings";

const SIDES: { key: BookingSide; label: string }[] = [
  { key: "booked", label: "Jobs I Booked" },
  { key: "received", label: "Jobs I Received" },
];

const STATUS_FILTERS: { key: BookingStatus | "all"; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<
  BookingStatus,
  { bg: string; text: string }
> = {
  upcoming: { bg: "#DCFCE7", text: "#16A34A" },
  ongoing: { bg: "#FFEDD5", text: "#EA580C" },
  completed: { bg: "#F3F4F6", text: "#6B7280" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

export default function BookingsScreen() {
  const [side, setSide] = useState<BookingSide>("booked");
  const [status, setStatus] = useState<BookingStatus | "all">("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // ⬇️ All data comes from here — swap fetchBookings for real DB later
      const data = await fetchBookings({ side, status });
      setBookings(data);
    } catch (e) {
      console.log("Failed to load bookings", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [side, status]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const renderCard = ({ item }: { item: Booking }) => {
    const colors = STATUS_COLORS[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => router.push(`/booking/${item.id}`)}
      >
        <View style={styles.cardTop}>
          <Image
            source={
              typeof item.professionalAvatar === "number"
                ? item.professionalAvatar
                : item.professionalAvatar
                  ? { uri: item.professionalAvatar }
                  : require("@/assets/profile_1.jpg")
            }
            style={styles.avatar}
          />
          <View style={styles.cardInfo}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {item.serviceName}
            </Text>
            <View style={styles.nameRow}>
              <Ionicons name="person" size={12} color="#16A34A" />
              <Text style={styles.proName} numberOfLines={1}>
                {item.professionalName}
              </Text>
            </View>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
              <Text style={styles.dateText}>{item.dateLabel}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              /* TODO: open chat */
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#16A34A" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              /* TODO: Linking.openURL(`tel:...`) */
            }}
          >
            <Ionicons name="call-outline" size={16} color="#16A34A" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoD}>D</Text>
          </View>
          <Text style={styles.logoText}>Doovly</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Bookings</Text>

      {/* Side tabs: Jobs I Booked / Jobs I Received */}
      <View style={styles.sideTabs}>
        {SIDES.map((s) => {
          const active = side === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.sideTab, active && styles.sideTabActive]}
              onPress={() => setSide(s.key)}
            >
              <Text
                style={[styles.sideTabText, active && styles.sideTabTextActive]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status filter chips */}
      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatus(f.key)}
            >
              {f.key === "upcoming" && active && (
                <Ionicons
                  name="calendar"
                  size={13}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List — data from fetchBookings (DB-ready) */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#16A34A"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySub}>
                {side === "booked"
                  ? "Book a pro from Home to see jobs here."
                  : "When customers book your services, they appear here."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 4,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  logoD: { color: "#fff", fontWeight: "800", fontSize: 16 },
  logoText: { fontSize: 18, fontWeight: "700", color: "#16A34A" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
  },

  sideTabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  sideTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  sideTabActive: { backgroundColor: "#16A34A" },
  sideTabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  sideTabTextActive: { color: "#fff" },

  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  chipActive: { backgroundColor: "#16A34A" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#fff" },

  list: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  cardInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  serviceName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  proName: { fontSize: 13, color: "#16A34A", fontWeight: "500" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, color: "#9CA3AF" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 16,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 30 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginTop: 14,
  },
  emptySub: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
