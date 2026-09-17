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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  listBookedJobs,
  listReceivedJobs,
  BOOKED_FILTERS,
  RECEIVED_FILTERS,
  statusColors,
  type BookingStatus,
  type Booking,
} from "@/data/booking";

export default function Bookings() {
  const [mainTab, setMainTab] = useState<"booked" | "received">("booked");
  const [filter, setFilter] = useState<string>("All");

  /**
   * Get the correct data based on the selected main tab.
   */
  const data = useMemo<Booking[]>(() => {
    return mainTab === "booked"
      ? listBookedJobs()
      : listReceivedJobs();
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
   * Change between Booked and Received tabs.
   * Reset the filter whenever the main tab changes.
   */
  const handleMainTabChange = (tab: "booked" | "received") => {
    setMainTab(tab);
    setFilter("All");
  };

  /**
   * Get the correct filters for the current tab.
   */
  const filters =
    mainTab === "booked" ? BOOKED_FILTERS : RECEIVED_FILTERS;

  /**
   * Render action buttons depending on booking status.
   */
  const renderStatusActions = (item: Booking) => {
    const buttonStyle = [
      styles.actionButton,
      styles.secondaryActionButton,
    ];

    /**
     * Received + Pending
     */
    if (mainTab === "received" && item.status === "Pending") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={buttonStyle}>
            <Ionicons
              name="location-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.secondaryActionText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.acceptButton,
            ]}
          >
            <Ionicons
              name="checkmark"
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.declineButton,
            ]}
          >
            <Ionicons
              name="close"
              size={16}
              color="#DC2626"
            />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * Upcoming
     */
    if (item.status === "Upcoming") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={buttonStyle}>
            <Ionicons
              name="location-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.secondaryActionText}>
              View Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cancelButton,
            ]}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color="#DC2626"
            />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * Accepted
     */
    if (item.status === "Accepted") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={buttonStyle}>
            <Ionicons
              name="location-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.secondaryActionText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cancelButton,
            ]}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color="#DC2626"
            />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.completeButton,
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#16A34A"
            />
            <Text style={styles.completeButtonText}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * Ongoing
     */
    if (item.status === "Ongoing") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={buttonStyle}>
            <Ionicons
              name="location-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.secondaryActionText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cancelButton,
            ]}
          >
            <Ionicons
              name="close-circle-outline"
              size={16}
              color="#DC2626"
            />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.completeButton,
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#16A34A"
            />
            <Text style={styles.completeButtonText}>
              Completed
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * Completed
     */
    if (item.status === "Completed") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={buttonStyle}>
            <Ionicons
              name="location-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.secondaryActionText}>
              View Location
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    /**
     * Cancelled / Declined
     */
    if (
      item.status === "Cancelled" ||
      item.status === "Declined"
    ) {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={buttonStyle}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color="#2563EB"
            />
            <Text style={styles.secondaryActionText}>
              View Details
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  /**
   * Render each booking card.
   */
  const renderBooking = ({ item }: { item: Booking }) => {
    const statusStyle = statusColors[item.status];

    return (
      <View style={styles.card}>
        {/* ----------------------------------------
            TOP SECTION
        ----------------------------------------- */}
        <View style={styles.topSection}>
          {/* Profile image + verification badge */}
          <View style={styles.avatarContainer}>
            <Image
              source={item.image}
              style={styles.avatar}
              resizeMode="cover"
            />

            {/* Verification badge sits on avatar edge */}
            {item.verified === true && (
              <View style={styles.verifiedBadge}>
                <Image
                  source={require("@/assets/premium/checkmark.png")}
                  style={styles.verifiedBadgeImage}
                  style={{ width: 40, height: 40, marginLeft: -1 }}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>

          {/* Provider information */}
          <View style={styles.providerInfo}>
            <View style={styles.nameRow}>
              <Text
                style={styles.providerName}
                numberOfLines={1}
              >
                {item.providerName}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <Ionicons
                name="star"
                size={14}
                color="#F59E0B"
              />

              <Text style={styles.ratingText}>
                {item.rating.toFixed(1)}
              </Text>

              <Text style={styles.reviewText}>
                ({item.reviews} reviews)
              </Text>
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
            <Ionicons
              name="calendar-outline"
              size={17}
              color="#6B7280"
            />

            <Text style={styles.infoText}>
              {item.date}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons
              name="location-outline"
              size={17}
              color="#6B7280"
            />

            <Text
              style={styles.infoText}
              numberOfLines={1}
            >
              {item.location}
            </Text>
          </View>
        </View>

        {/* ----------------------------------------
            MAP / LOCATION PREVIEW
        ----------------------------------------- */}
        <View style={styles.mapContainer}>
          <View style={styles.mapBackground}>
            <Ionicons
              name="map-outline"
              size={28}
              color="#9CA3AF"
            />

            <Text style={styles.mapTitle}>
              Location
            </Text>

            <Text
              style={styles.mapLocation}
              numberOfLines={1}
            >
              {item.location}
            </Text>
          </View>

          <View style={styles.mapPin}>
            <Ionicons
              name="location"
              size={20}
              color="#2563EB"
            />
          </View>
        </View>

        {/* ----------------------------------------
            CONTACT ACTIONS
        ----------------------------------------- */}
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons
              name="chatbubble-outline"
              size={17}
              color="#2563EB"
            />

            <Text style={styles.contactText}>
              Chat
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactButton}>
            <Ionicons
              name="call-outline"
              size={17}
              color="#2563EB"
            />

            <Text style={styles.contactText}>
              Call
            </Text>
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
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* ----------------------------------------
          HEADER
      ----------------------------------------- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Bookings
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage your bookings and jobs
          </Text>
        </View>

        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      {/* ----------------------------------------
          MAIN TABS
      ----------------------------------------- */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[
            styles.mainTab,
            mainTab === "booked" && styles.activeMainTab,
          ]}
          onPress={() =>
            handleMainTabChange("booked")
          }
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "booked" &&
                styles.activeMainTabText,
            ]}
          >
            My Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            mainTab === "received" &&
              styles.activeMainTab,
          ]}
          onPress={() =>
            handleMainTabChange("received")
          }
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "received" &&
                styles.activeMainTabText,
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
                  isActive &&
                    styles.activeFilterButton,
                ]}
                onPress={() =>
                  setFilter(itemFilter)
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive &&
                      styles.activeFilterText,
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
        contentContainerStyle={
          styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color="#9CA3AF"
              />
            </View>

            <Text style={styles.emptyTitle}>
              No bookings found
            </Text>

            <Text style={styles.emptyText}>
              There are no bookings under this
              category.
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
    backgroundColor: "#F9FAFB",
  },

  /* Header */
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Main tabs */
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
    borderBottomColor: "#2563EB",
  },

  mainTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  activeMainTabText: {
    color: "#2563EB",
  },

  /* Filters */
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
    backgroundColor: "#2563EB",
  },

  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  /* List */
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Booking card */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  /* Top provider section */
  topSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* Avatar wrapper */
  avatarContainer: {
    width: 57,
    height: 57,
    position: "relative",
  },

  /* Profile image */
  avatar: {
    width: 57,
    height: 57,
    borderRadius: 29,
    backgroundColor: "#F3F4F6",
  },

  /* Verification badge */
  verifiedBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 21,
    height: 21,
    borderRadius: 11,
    // backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },

  verifiedBadgeImage: {
    width: 19,
    height: 19,
    borderRadius: 10,
  },

  /* Provider information */
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

  /* Status */
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

  /* Job title */
  jobTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  /* Information */
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

  /* Map */
  mapContainer: {
    height: 125,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
    position: "relative",
  },

  mapBackground: {
    flex: 1,
    backgroundColor: "#EEF2F7",
    alignItems: "center",
    justifyContent: "center",
  },

  mapTitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },

  mapLocation: {
    maxWidth: "80%",
    marginTop: 3,
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },

  mapPin: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  /* Contact buttons */
  contactRow: {
    flexDirection: "row",
    marginTop: 12,
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
    color: "#2563EB",
  },

  /* Action buttons */
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

  secondaryActionButton: {
    backgroundColor: "#EFF6FF",
  },

  secondaryActionText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  acceptButton: {
    backgroundColor: "#16A34A",
  },

  acceptButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  declineButton: {
    backgroundColor: "#FEF2F2",
  },

  declineButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },

  cancelButton: {
    backgroundColor: "#FEF2F2",
  },

  cancelButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },

  completeButton: {
    backgroundColor: "#F0FDF4",
  },

  completeButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* Empty state */
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