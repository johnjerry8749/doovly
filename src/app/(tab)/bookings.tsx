import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  listBookedJobs,
  listReceivedJobs,
  BOOKED_FILTERS,
  RECEIVED_FILTERS,
  statusColors,
  type Booking,
} from "@/data/booking";

/**
 * Open the customer's booking location
 * in Google Maps / Apple Maps.
 */
const openBookingLocation = async (item: Booking) => {
  try {
    let url = "";

    /**
     * If latitude and longitude are available,
     * use the exact customer location.
     */
    if (
      typeof item.latitude === "number" &&
      typeof item.longitude === "number"
    ) {
      const { latitude, longitude } = item;

      if (Platform.OS === "ios") {
        url = `http://maps.apple.com/?ll=${latitude},${longitude}&q=Customer%20Location`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      }
    } else if (item.location) {
      /**
       * Fallback to the saved address if
       * coordinates are not available.
       */
      const encodedLocation = encodeURIComponent(item.location);

      if (Platform.OS === "ios") {
        url = `http://maps.apple.com/?q=${encodedLocation}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
      }
    } else {
      Alert.alert(
        "Location unavailable",
        "This booking does not have a location yet.",
      );
      return;
    }

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert(
        "Unable to open map",
        "No map application is available on this device.",
      );
      return;
    }

    await Linking.openURL(url);
  } catch (error) {
    console.error("Unable to open booking location:", error);

    Alert.alert("Map Error", "We could not open the customer's location.");
  }
};

export default function Bookings() {
  const [mainTab, setMainTab] = useState<"booked" | "received">("booked");

  const [filter, setFilter] = useState<string>("All");

  /**
   * Get bookings depending on selected tab.
   */
  const data = useMemo<Booking[]>(() => {
    return mainTab === "booked" ? listBookedJobs() : listReceivedJobs();
  }, [mainTab]);

  /**
   * Filter bookings by status.
   */
  const filteredData = useMemo<Booking[]>(() => {
    if (filter === "All") {
      return data;
    }

    return data.filter((item) => item.status === filter);
  }, [data, filter]);

  /**
   * Change main tab.
   */
  const handleMainTabChange = (tab: "booked" | "received") => {
    setMainTab(tab);
    setFilter("All");
  };

  /**
   * Current tab filters.
   */
  const filters = mainTab === "booked" ? BOOKED_FILTERS : RECEIVED_FILTERS;

  /**
   * Render action buttons depending on
   * the current booking status.
   *
   * IMPORTANT:
   *
   * My Bookings:
   * - Upcoming  = Cancel only
   * - Accepted  = Cancel only
   * - Ongoing   = Cancel only
   * - Completed = No button
   *
   * Received Jobs:
   * - Pending   = Map + Accept + Decline
   * - Accepted  = Cancel + Completed
   * - Ongoing   = Cancel + Completed
   * - Completed = No button
   */
  const renderStatusActions = (item: Booking) => {
    /**
     * ----------------------------------------
     * RECEIVED JOBS + PENDING
     * ----------------------------------------
     *
     * Provider can:
     * - Open customer's location
     * - Accept job
     * - Decline job
     */
    if (mainTab === "received" && item.status === "Pending") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.mapButton]}
            activeOpacity={0.8}
            onPress={() => openBookingLocation(item)}
          >
            <Ionicons name="map-outline" size={16} color="#16A34A" />

            <Text style={styles.mapButtonText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />

            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color="#DC2626" />

            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * ----------------------------------------
     * RECEIVED JOBS + ACCEPTED
     * ----------------------------------------
     *
     * Provider can:
     * - Cancel
     * - Mark job as Completed
     *
     * This Completed button belongs ONLY
     * to the provider/receiver.
     */
    if (mainTab === "received" && item.status === "Accepted") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />

            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#16A34A"
            />

            <Text style={styles.completeButtonText}>Completed</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * ----------------------------------------
     * RECEIVED JOBS + ONGOING
     * ----------------------------------------
     *
     * Provider can:
     * - Cancel
     * - Mark job as Completed
     */
    if (mainTab === "received" && item.status === "Ongoing") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />

            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#16A34A"
            />

            <Text style={styles.completeButtonText}>Completed</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * ----------------------------------------
     * MY BOOKINGS + UPCOMING
     * ----------------------------------------
     *
     * Customer can ONLY cancel.
     *
     * There is NO Completed button.
     */
    if (mainTab === "booked" && item.status === "Upcoming") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />

            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * ----------------------------------------
     * MY BOOKINGS + ACCEPTED
     * ----------------------------------------
     *
     * Customer can ONLY cancel.
     *
     * There is NO Completed button.
     */
    if (mainTab === "booked" && item.status === "Accepted") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />

            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * ----------------------------------------
     * MY BOOKINGS + ONGOING
     * ----------------------------------------
     *
     * Customer can ONLY cancel.
     *
     * There is NO Completed button.
     */
    if (mainTab === "booked" && item.status === "Ongoing") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />

            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * ----------------------------------------
     * COMPLETED
     * ----------------------------------------
     *
     * No action button.
     */
    if (item.status === "Completed") {
      return null;
    }

    /**
     * ----------------------------------------
     * CANCELLED / DECLINED
     * ----------------------------------------
     */
    if (item.status === "Cancelled" || item.status === "Declined") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryActionButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={16} color="#16A34A" />

            <Text style={styles.secondaryActionText}>View Details</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  /**
   * Render booking card.
   */
  const renderBooking = ({ item }: { item: Booking }) => {
    const statusStyle = statusColors[item.status];

    return (
      <View style={styles.card}>
        {/* ----------------------------------------
            TOP SECTION
        ----------------------------------------- */}
        <View style={styles.topSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image
              source={item.image}
              style={styles.avatar}
              resizeMode="cover"
            />

            {/* Verification badge */}
            {item.verified === true && (
              <View style={styles.verifiedBadge}>
                <Image
                  source={require("@/assets/premium/checkmark.png")}
                  style={styles.verifiedBadgeImage}
                  style={{
                    width: 40,
                    height: 40,
                    marginLeft: -1,
                  }}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>

          {/* Provider information */}
          <View style={styles.providerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.providerName} numberOfLines={1}>
                {item.providerName}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />

              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>

              <Text style={styles.reviewText}>({item.reviews} reviews)</Text>
            </View>
          </View>

          {/* Status */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusStyle.bg,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusStyle.text,
                },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {/* ----------------------------------------
            JOB TITLE
        ----------------------------------------- */}
        <Text style={styles.jobTitle}>{item.title}</Text>

        {/* ----------------------------------------
            BOOKING INFORMATION
        ----------------------------------------- */}
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

        {/* ----------------------------------------
            CONTACT ACTIONS
        ----------------------------------------- */}
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
            <Ionicons name="chatbubble-outline" size={17} color="#16A34A" />

            <Text style={styles.contactText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
            <Ionicons name="call-outline" size={17} color="#16A34A" />

            <Text style={styles.contactText}>Call</Text>
          </TouchableOpacity>
        </View>

        {/* ----------------------------------------
            STATUS ACTIONS
        ----------------------------------------- */}
        {renderStatusActions(item)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ----------------------------------------
          HEADER
      ----------------------------------------- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bookings</Text>

          <Text style={styles.headerSubtitle}>
            Manage your bookings and jobs
          </Text>
        </View>

        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={28} color="#111" />

          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* ----------------------------------------
          MAIN TABS
      ----------------------------------------- */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === "booked" && styles.activeMainTab]}
          onPress={() => handleMainTabChange("booked")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "booked" && styles.activeMainTabText,
            ]}
          >
            My Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            mainTab === "received" && styles.activeMainTab,
          ]}
          onPress={() => handleMainTabChange("received")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "received" && styles.activeMainTabText,
            ]}
          >
            Received Jobs
          </Text>
        </TouchableOpacity>
      </View>

      {/* ----------------------------------------
          STATUS FILTERS
      ----------------------------------------- */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {filters.map((itemFilter) => {
            const isActive = filter === itemFilter;

            return (
              <TouchableOpacity
                key={itemFilter}
                style={[
                  styles.filterButton,
                  isActive && styles.activeFilterButton,
                ]}
                onPress={() => setFilter(itemFilter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.activeFilterText,
                  ]}
                >
                  {itemFilter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ----------------------------------------
          BOOKINGS LIST
      ----------------------------------------- */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
            </View>

            <Text style={styles.emptyTitle}>No bookings found</Text>

            <Text style={styles.emptyText}>
              There are no bookings under this category.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* ----------------------------------------
     HEADER
  ----------------------------------------- */
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  notificationButton: {
    width: 35,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#159447",
    right: 1,
    top: 0,
  },

  /* ----------------------------------------
     MAIN TABS
  ----------------------------------------- */
  mainTabsContainer: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  mainTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    marginHorizontal: 4,
  },

  activeMainTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#16A34A",
  },

  mainTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  activeMainTabText: {
    color: "#16A34A",
  },

  /* ----------------------------------------
     FILTERS
  ----------------------------------------- */
  filterWrapper: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
  },

  filterContainer: {
    paddingHorizontal: 16,
  },

  filterButton: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    marginRight: 7,
  },

  activeFilterButton: {
    backgroundColor: "#16A34A",
  },

  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  /* ----------------------------------------
     LIST
  ----------------------------------------- */
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* ----------------------------------------
     BOOKING CARD
  ----------------------------------------- */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  /* ----------------------------------------
     TOP SECTION
  ----------------------------------------- */
  topSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatarContainer: {
    width: 57,
    height: 57,
    position: "relative",
  },

  avatar: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: "#F3F4F6",
  },

  /* ----------------------------------------
     VERIFICATION BADGE
  ----------------------------------------- */
  verifiedBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
   },

  verifiedBadgeImage: {
    width: 21,
    height: 21,
  },

  /* ----------------------------------------
     PROVIDER INFORMATION
  ----------------------------------------- */
  providerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  providerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  reviewText: {
    marginLeft: 4,
    fontSize: 11,
    color: "#9CA3AF",
  },

  /* ----------------------------------------
     STATUS
  ----------------------------------------- */
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  /* ----------------------------------------
     JOB TITLE
  ----------------------------------------- */
  jobTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  /* ----------------------------------------
     INFORMATION
  ----------------------------------------- */
  infoContainer: {
    marginTop: 12,
  },

  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  infoText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    color: "#6B7280",
  },

  /* ----------------------------------------
     CONTACT BUTTONS
  ----------------------------------------- */
  contactRow: {
    flexDirection: "row",
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },

  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },

  contactText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
  },

  /* ----------------------------------------
     ACTION ROW
  ----------------------------------------- */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 12,
  },

  actionButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    marginBottom: 5,
  },

  /* Map */
  mapButton: {
    backgroundColor: "#EFF6FF",
  },

  mapButtonText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* Accept */
  acceptButton: {
    backgroundColor: "#16A34A",
  },

  acceptButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Decline */
  declineButton: {
    backgroundColor: "#FEF2F2",
  },

  declineButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },

  /* Cancel */
  cancelButton: {
    backgroundColor: "#FEF2F2",
  },

  cancelButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },

  /* Complete */
  completeButton: {
    backgroundColor: "#F0FDF4",
  },

  completeButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* Other */
  secondaryActionButton: {
    backgroundColor: "#EFF6FF",
  },

  secondaryActionText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* ----------------------------------------
     EMPTY STATE
  ----------------------------------------- */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },

  emptyText: {
    marginTop: 6,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
