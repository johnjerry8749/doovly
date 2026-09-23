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
import { isCurrentUserPro } from "@/services/savedProviders";
import {
  getOrCreateConversationForProfessional,
  formatBookingChatMessage,
} from "@/services/chat";

const GREEN = "#16A34A";

type Props = {
  item: Booking;
  mainTab: "booked" | "received";
  onOpenMap: (item: Booking) => void;
  onReport: (item: Booking) => void;
};

export function BookingCard({ item, mainTab, onOpenMap, onReport }: Props) {
  const statusStyle = statusColors[item.status];
  const showChat = item.status !== "Completed" || isCurrentUserPro();

  const renderStatusActions = () => {
    if (mainTab === "received" && item.status === "Pending") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.mapButton]}
            activeOpacity={0.8}
            onPress={() => onOpenMap(item)}
          >
            <Ionicons name="map-outline" size={16} color={GREEN} />
            <Text style={styles.mapButtonText}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert("Accept Job", "This job will be marked as Accepted.")
            }
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert("Decline Job", "This job will be declined.")
            }
          >
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (
      mainTab === "received" &&
      (item.status === "Accepted" || item.status === "Ongoing")
    ) {
      const locationAvailable =
        item.paymentStatus === "released" ||
        item.paymentStatus === "pay_on_site" ||
        item.paymentMethod === "pay_on_site";

      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.mapButton,
              !locationAvailable && styles.lockedMapButton,
            ]}
            activeOpacity={0.8}
            onPress={() => onOpenMap(item)}
          >
            <Ionicons
              name={locationAvailable ? "map-outline" : "lock-closed-outline"}
              size={16}
              color={locationAvailable ? GREEN : "#9CA3AF"}
            />
            <Text
              style={[
                styles.mapButtonText,
                !locationAvailable && styles.lockedMapButtonText,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert("Cancel Job", "This job will be cancelled.")
            }
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                "Mark as Completed",
                "Customer will be asked to Approve the job before payment is released.",
              )
            }
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={GREEN} />
            <Text style={styles.completeButtonText}>Mark as Completed</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mainTab === "received" && item.status === "Awaiting Approval") {
      return null;
    }

    if (
      mainTab === "booked" &&
      (item.status === "Upcoming" ||
        item.status === "Accepted" ||
        item.status === "Ongoing")
    ) {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert("Cancel Booking", "This booking will be cancelled.")
            }
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (mainTab === "booked" && item.status === "Awaiting Approval") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                "Approve Job",
                "Job approved. Payment will be released to the professional.",
              )
            }
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            <Text style={styles.acceptButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            activeOpacity={0.8}
            onPress={() => onReport(item)}
          >
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text style={styles.declineButtonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (item.status === "Completed") {
      return null;
    }

    if (item.status === "Cancelled" || item.status === "Declined") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={16} color={GREEN} />
            <Text style={styles.secondaryActionText}>View Details</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.card}>
      <View style={styles.topSection}>
        <View style={styles.avatarContainer}>
          <Image source={item.image} style={styles.avatar} resizeMode="cover" />
          {item.verified === true && (
            <View style={styles.verifiedBadge}>
              <Image
                source={require("@/assets/premium/checkmark.png")}
                style={styles.verifiedBadgeImage}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        <View style={styles.providerInfo}>
          <Text style={styles.providerName} numberOfLines={1}>
            {item.providerName}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.reviewText}>({item.reviews} reviews)</Text>
          </View>
        </View>

        <View
          style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
        >
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.jobTitle}>{item.title}</Text>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={17} color="#6B7280" />
          <Text style={styles.infoText}>{item.date}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={17} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>

      <View style={styles.contactRow}>
        {showChat && (
          <TouchableOpacity
            style={styles.contactButton}
            activeOpacity={0.8}
            onPress={() => {
              const conv = getOrCreateConversationForProfessional(
                item.professionalId,
              );
              const message = formatBookingChatMessage(item);
              router.push({
                pathname: "/chat/[id]",
                params: {
                  id: conv.id,
                  initialMessage: message,
                },
              });
            }}
          >
            <Ionicons name="chatbubble-outline" size={17} color={GREEN} />
            <Text style={styles.contactText}>Chat</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
          <Ionicons name="call-outline" size={17} color={GREEN} />
          <Text style={styles.contactText}>Call</Text>
        </TouchableOpacity>
      </View>

      {renderStatusActions()}
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
  verifiedBadge: {
    position: "absolute",
    right: -6,
    bottom: -5,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  verifiedBadgeImage: {
    width: 32,
    height: 32,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  infoContainer: {
    gap: 6,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  contactRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
  },
  contactText: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mapButton: {
    backgroundColor: "#F0FDF4",
  },
  mapButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN,
  },
  lockedMapButton: {
    backgroundColor: "#F3F4F6",
  },
  lockedMapButtonText: {
    color: "#9CA3AF",
  },
  acceptButton: {
    backgroundColor: GREEN,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  declineButton: {
    backgroundColor: "#FEE2E2",
  },
  declineButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
  cancelButton: {
    backgroundColor: "#FEE2E2",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
  completeButton: {
    backgroundColor: "#F0FDF4",
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN,
  },
  secondaryActionButton: {
    backgroundColor: "#F3F4F6",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: GREEN,
  },
});
