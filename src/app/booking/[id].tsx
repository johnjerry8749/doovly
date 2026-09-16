import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Booking, fetchBookingById } from "@/data/bookings";

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  upcoming: { bg: "#DCFCE7", text: "#16A34A" },
  ongoing: { bg: "#FFEDD5", text: "#EA580C" },
  completed: { bg: "#F3F4F6", text: "#6B7280" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // ⬇️ Swap for real DB: await fetchBookingById(id)
      const data = await fetchBookingById(id!);
      if (mounted) {
        setBooking(data);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Booking not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const colors = STATUS_COLORS[booking.status] ?? STATUS_COLORS.upcoming;

  const infoRows = [
    { label: "Service", value: booking.serviceName },
    { label: "Address", value: booking.address },
    { label: "Duration", value: booking.duration },
    { label: "Price", value: booking.price },
    { label: "Payment", value: booking.paymentStatus },
    { label: "Booking ID", value: booking.id },
    {
      label: "Status",
      value:
        booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
      isStatus: true,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Pro / customer summary */}
        <View style={styles.summary}>
          <Image
            source={
              typeof booking.professionalAvatar === "number"
                ? booking.professionalAvatar
                : require("@/assets/profile_1.jpg")
            }
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.serviceTitle}>{booking.serviceName}</Text>
            <View style={styles.nameRow}>
              <Ionicons name="person" size={13} color="#16A34A" />
              <Text style={styles.proName}>{booking.professionalName}</Text>
            </View>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
              <Text style={styles.dateText}>{booking.dateLabel}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionPill}>
            <Ionicons name="chatbubble" size={18} color="#16A34A" />
            <Text style={styles.actionPillText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionPillOutline}>
            <Ionicons name="call" size={18} color="#16A34A" />
            <Text style={styles.actionPillText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionPillOutline}>
            <Ionicons name="location" size={18} color="#16A34A" />
            <Text style={styles.actionPillText}>View Location</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Information — all fields from DB row */}
        <Text style={styles.sectionTitle}>Booking Information</Text>
        <View style={styles.infoCard}>
          {infoRows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                i < infoRows.length - 1 && styles.infoRowBorder,
              ]}
            >
              <Text style={styles.infoLabel}>{row.label}</Text>
              {row.isStatus ? (
                <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>
                    {row.value}
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.infoValue,
                    row.label === "Payment" &&
                      booking.paymentStatus === "Paid" && { color: "#16A34A" },
                  ]}
                >
                  {row.value}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Notes from DB */}
        {booking.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </View>
          </>
        ) : null}

        {/* Pro actions when side=received (optional later) */}
        {booking.side === "received" && booking.status === "upcoming" && (
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.declineBtn}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn}>
              <Text style={styles.acceptText}>Accept Job</Text>
            </TouchableOpacity>
          </View>
        )}

        {booking.status === "ongoing" && (
          <TouchableOpacity style={styles.completeBtn}>
            <Text style={styles.completeText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16, color: "#6B7280", marginBottom: 12 },
  backLink: { color: "#16A34A", fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },

  content: { padding: 16 },

  summary: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E7EB",
  },
  serviceTitle: { fontSize: 17, fontWeight: "700", color: "#111", marginBottom: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  proName: { fontSize: 14, color: "#16A34A", fontWeight: "500" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 13, color: "#9CA3AF" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionPillOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionPillText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  infoLabel: { fontSize: 13, color: "#6B7280" },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111",
    maxWidth: "58%",
    textAlign: "right",
  },

  notesCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  notesText: { fontSize: 14, color: "#374151", lineHeight: 21 },

  bottomActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  declineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  declineText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  completeBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  completeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
