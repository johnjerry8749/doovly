import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { statusColors, type Booking } from "@/services/bookings";
import { openBookingChat } from "@/services/chat";

const GREEN = "#16A34A";

type Props = {
  item: Booking;
  mainTab: "booked" | "received";
};

function formatAmount(amount?: number) {
  if (amount == null) return null;
  return `₦${amount.toLocaleString()}`;
}

export function BookingCard({ item, mainTab }: Props) {
  const statusStyle = statusColors[item.status];
  const amountText = formatAmount(item.amount);

  const displayName =
    mainTab === "booked" ? item.professionalName : item.customerName;
  const displayImage =
    mainTab === "booked" ? item.professionalImage : item.customerImage;

  /** Customer (booked) may cancel only while Pending */
  const showCancel = mainTab === "booked" && item.status === "Pending";

  const openChat = () => {
    const conv = openBookingChat(item, mainTab);
    router.push({
      pathname: "/chat/[id]",
      params: { id: conv.id },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={displayImage}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>

        <View style={styles.providerInfo}>
          <Text style={styles.providerName} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewText}>• Reviews</Text>
          </View>
        </View>

        <View
          style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusStyle.text }]}
          />
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.jobTitle}>{item.title}</Text>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={17} color={GREEN} />
          <Text style={styles.infoText}>{item.date}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={17} color={GREEN} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        {amountText ? (
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={17} color={GREEN} />
            <Text style={styles.amountText}>{amountText}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.chatButton}
          activeOpacity={0.8}
          onPress={openChat}
        >
          <Ionicons name="chatbubble-outline" size={17} color={GREEN} />
          <Text style={styles.chatButtonText}>Open Chat</Text>
        </TouchableOpacity>

        {showCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                "Cancel Booking",
                "This booking will be cancelled.",
              )
            }
          >
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerInfo: {
    flex: 1,
    minWidth: 0,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  reviewText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  infoContainer: {
    gap: 8,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#4B5563",
    flex: 1,
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
    color: GREEN,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  chatButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
});
