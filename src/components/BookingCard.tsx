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
import {
  getOrCreateConversationForBooking,
  formatBookingChatMessage,
} from "@/services/chat";

const GREEN = "#16A34A";

type Props = {
  item: Booking;
  mainTab: "booked" | "received";
  onReport: (item: Booking) => void;
};

function formatAmount(amount?: number) {
  if (amount == null) return null;
  return `₦${amount.toLocaleString()}`;
}

export function BookingCard({ item, mainTab, onReport }: Props) {
  const statusStyle = statusColors[item.status];
  const amountText = formatAmount(item.amount);
  const isPayOnSite =
    item.paymentMethod === "pay_on_site" ||
    item.paymentStatus === "pay_on_site";

  const showPaymentBanner =
    (item.paymentMethod === "pay_now" &&
      (item.paymentStatus === "held" ||
        item.paymentStatus === "released" ||
        item.paymentStatus === "refunded")) ||
    isPayOnSite;

  const paymentLabel = isPayOnSite
    ? "Payment will be on site"
    : item.paymentStatus === "released"
      ? "Payment released"
      : item.paymentStatus === "refunded"
        ? "Payment refunded"
        : "Payment secured in Paystack";

  // Booked → show professional; Received → show customer
  const displayName =
    mainTab === "booked" ? item.professionalName : item.customerName;
  const displayImage =
    mainTab === "booked" ? item.professionalImage : item.customerImage;

  const openChat = () => {
    const conv = getOrCreateConversationForBooking(item, mainTab);
    const message = formatBookingChatMessage(item);
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: conv.id,
        initialMessage: message,
      },
    });
  };

  const renderStatusActions = () => {
    // RECEIVED — Pending (pro can accept/decline)
    if (mainTab === "received" && item.status === "Pending") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert("Accept Job", "This job will be marked as Accepted.")
            }
          >
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

    // RECEIVED — Accepted / Ongoing
    if (
      mainTab === "received" &&
      (item.status === "Accepted" || item.status === "Ongoing")
    ) {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert("Cancel Job", "This job will be cancelled.")
            }
          >
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          {item.status === "Accepted" ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.onMyWayButton]}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  "On My Way",
                  "Customer will be notified that you are on your way.",
                )
              }
            >
              <Ionicons name="navigate-outline" size={16} color="#FFFFFF" />
              <Text style={styles.onMyWayButtonText}>I'm On My Way</Text>
            </TouchableOpacity>
          ) : (
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
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.completeButtonText}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // RECEIVED — Awaiting Approval
    if (mainTab === "received" && item.status === "Awaiting Approval") {
      return null;
    }

    // BOOKED — Pending: client can cancel before pro accepts
    if (mainTab === "booked" && item.status === "Pending") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert("Cancel Booking", "This booking will be cancelled.")
            }
          >
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // BOOKED — Accepted / Ongoing: client cannot cancel
    if (
      mainTab === "booked" &&
      (item.status === "Accepted" || item.status === "Ongoing")
    ) {
      return null;
    }

    // BOOKED — Awaiting Approval (customer must approve)
    if (mainTab === "booked" && item.status === "Awaiting Approval") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                "Approve Job",
                "Job approved. Payment will be released to the professional.",
              )
            }
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.approveButtonText}>
              Approve & Release{amountText ? ` ${amountText}` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.reportButton]}
            activeOpacity={0.8}
            onPress={() => onReport(item)}
          >
            <Ionicons name="flag-outline" size={16} color="#DC2626" />
            <Text style={styles.reportButtonText}>Report Issue</Text>
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
      {/* Top: avatar + name + rating + status */}
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
      </View>

      {showPaymentBanner && (
        <View
          style={[
            styles.paymentBanner,
            isPayOnSite && styles.paymentBannerOnSite,
          ]}
        >
          <View
            style={[
              styles.paymentIconWrap,
              isPayOnSite && styles.paymentIconWrapOnSite,
            ]}
          >
            <Ionicons
              name={isPayOnSite ? "cash-outline" : "lock-closed"}
              size={16}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.paymentTextWrap}>
            <Text
              style={[
                styles.paymentLabel,
                isPayOnSite && styles.paymentLabelOnSite,
              ]}
            >
              {paymentLabel}
            </Text>
            {amountText ? (
              <Text
                style={[
                  styles.paymentAmount,
                  isPayOnSite && styles.paymentAmountOnSite,
                ]}
              >
                {amountText}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Open Chat — always available so bookings track into conversation */}
      <View style={styles.contactRow}>
        <TouchableOpacity
          style={styles.contactButton}
          activeOpacity={0.8}
          onPress={openChat}
        >
          <Ionicons name="chatbubble-outline" size={17} color={GREEN} />
          <Text style={styles.contactText}>Open Chat</Text>
        </TouchableOpacity>
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
  paymentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  paymentBannerOnSite: {
    backgroundColor: "#FFF7ED",
  },
  paymentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconWrapOnSite: {
    backgroundColor: "#EA580C",
  },
  paymentTextWrap: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
  paymentLabelOnSite: {
    color: "#9A3412",
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: GREEN,
    marginTop: 1,
  },
  paymentAmountOnSite: {
    color: "#C2410C",
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  acceptButton: {
    backgroundColor: GREEN,
    flex: 1,
    justifyContent: "center",
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: "700",
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
  onMyWayButton: {
    backgroundColor: GREEN,
    flex: 1,
    justifyContent: "center",
  },
  onMyWayButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  completeButton: {
    backgroundColor: GREEN,
    flex: 1,
    justifyContent: "center",
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  approveButton: {
    backgroundColor: GREEN,
    flex: 1,
    justifyContent: "center",
  },
  approveButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  reportButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  reportButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
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
