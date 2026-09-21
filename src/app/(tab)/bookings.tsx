import React, { useMemo, useState } from "react";
import { router } from "expo-router";
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
  Modal,
  TextInput,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import {
  listBookedJobs,
  listReceivedJobs,
  BOOKED_FILTERS,
  RECEIVED_FILTERS,
  statusColors,
  type Booking,
} from "@/data/booking";
import { DISPUTE_REASONS, type DisputeReason } from "@/data/disputes";
import { getCurrentUserId } from "@/services/inAppNotifications";

const openBookingLocation = async (item: Booking) => {
  try {
    let url = "";
    if (
      typeof (item as any).latitude === "number" &&
      typeof (item as any).longitude === "number"
    ) {
      const { latitude, longitude } = item as any;
      if (Platform.OS === "ios") {
        url = `http://maps.apple.com/?ll=${latitude},${longitude}&q=Customer%20Location`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      }
    } else if (item.location) {
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

function canViewJobLocation(item: Booking): boolean {
  return (
    item.paymentStatus === "released" ||
    item.paymentStatus === "pay_on_site" ||
    item.paymentMethod === "pay_on_site"
  );
}

const handleOpenMap = (item: Booking) => {
  if (!canViewJobLocation(item)) {
    Alert.alert(
      "Location locked",
      "The exact location is only available after payment is completed or when the customer selected Pay on site (Pro).",
    );
    return;
  }
  openBookingLocation(item);
};

export default function Bookings() {
  const [mainTab, setMainTab] = useState<"booked" | "received">("booked");
  const [filter, setFilter] = useState<string>("All");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportBooking, setReportBooking] = useState<Booking | null>(null);
  const [selectedReason, setSelectedReason] = useState<DisputeReason | null>(
    null,
  );
  const [reportDescription, setReportDescription] = useState("");
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);

  const data = useMemo<Booking[]>(() => {
    return mainTab === "booked" ? listBookedJobs() : listReceivedJobs();
  }, [mainTab]);

  const filteredData = useMemo<Booking[]>(() => {
    if (filter === "All") return data;
    return data.filter((item) => item.status === filter);
  }, [data, filter]);

  const handleMainTabChange = (tab: "booked" | "received") => {
    setMainTab(tab);
    setFilter("All");
  };

  const filters = mainTab === "booked" ? BOOKED_FILTERS : RECEIVED_FILTERS;

  const pickReportPhotos = async () => {
    try {
      const remaining = 3 - reportPhotos.length;
      if (remaining <= 0) return;
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo library access to attach images.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
      });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri).filter(Boolean);
      setReportPhotos((prev) => [...prev, ...uris].slice(0, 3));
    } catch (e) {
      Alert.alert("Could not open photos", "Please try again.");
    }
  };

  const renderStatusActions = (item: Booking) => {
    if (mainTab === "received" && item.status === "Pending") {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.mapButton]}
            activeOpacity={0.8}
            onPress={() => handleOpenMap(item)}
          >
            <Ionicons
              name="map-outline"
              size={16}
              color={canViewJobLocation(item) ? "#16A34A" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.mapButtonText,
                !canViewJobLocation(item) && { color: "#9CA3AF" },
              ]}
            >
              Map
            </Text>
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
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.mapButton]}
            activeOpacity={0.8}
            onPress={() => handleOpenMap(item)}
          >
            <Ionicons
              name="map-outline"
              size={16}
              color={canViewJobLocation(item) ? "#16A34A" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.mapButtonText,
                !canViewJobLocation(item) && { color: "#9CA3AF" },
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
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color="#16A34A"
            />
            <Text style={styles.completeButtonText}>Mark as Completed</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (mainTab === "received" && item.status === "Awaiting Approval")
      return null;
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
            onPress={() => {
              setReportBooking(item);
              setSelectedReason(null);
              setReportDescription("");
              setReportPhotos([]);
              setShowReportModal(true);
            }}
          >
            <Ionicons name="close" size={16} color="#DC2626" />
            <Text style={styles.declineButtonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (item.status === "Completed") return null;
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

  const renderBooking = ({ item }: { item: Booking }) => {
    const statusStyle = statusColors[item.status];
    return (
      <View style={styles.card}>
        <View style={styles.topSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={item.image}
              style={styles.avatar}
              resizeMode="cover"
            />
            {item.verified === true && (
              <View style={styles.verifiedBadge}>
                <Image
                  source={require("@/assets/premium/checkmark.png")}
                  style={{ width: 40, height: 40, marginLeft: -1 }}
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
          <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
            <Ionicons name="chatbubble-outline" size={17} color="#16A34A" />
            <Text style={styles.contactText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
            <Ionicons name="call-outline" size={17} color="#16A34A" />
            <Text style={styles.contactText}>Call</Text>
          </TouchableOpacity>
        </View>
        {renderStatusActions(item)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bookings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your bookings and jobs
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/notification/[id]",
              params: { id: String(getCurrentUserId()) },
            })
          }
        >
          <Ionicons name="notifications-outline" size={28} color="#111" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

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

      <FlatList
        style={{ flex: 1 }}
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

      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowReportModal(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlayInner}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => {
                Keyboard.dismiss();
                setShowReportModal(false);
              }}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Report Issue</Text>
              {reportBooking ? (
                <Text style={styles.modalSubtitle}>
                  {reportBooking.title} · {reportBooking.providerName}
                </Text>
              ) : null}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalLabel}>What went wrong?</Text>
                {DISPUTE_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonRow,
                        isSelected && styles.reasonRowSelected,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <View
                        style={[
                          styles.reasonRadio,
                          isSelected && styles.reasonRadioSelected,
                        ]}
                      >
                        {isSelected ? (
                          <View style={styles.reasonRadioDot} />
                        ) : null}
                      </View>
                      <Text style={styles.reasonText}>{reason}</Text>
                    </TouchableOpacity>
                  );
                })}
                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Describe the issue..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={reportDescription}
                  onChangeText={setReportDescription}
                />
                <Text style={styles.modalLabel}>Photos (optional)</Text>
                <View style={styles.photoRow}>
                  {reportPhotos.map((uri, index) => (
                    <View key={uri}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() =>
                          setReportPhotos((p) =>
                            p.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Ionicons name="close" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {reportPhotos.length < 3 && (
                    <TouchableOpacity
                      style={styles.addPhotoBtn}
                      onPress={pickReportPhotos}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={22}
                        color="#16A34A"
                      />
                      <Text style={styles.addPhotoText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.acceptButton,
                    { marginTop: 16, justifyContent: "center" },
                  ]}
                  onPress={() => {
                    if (!selectedReason) {
                      Alert.alert(
                        "Select a reason",
                        "Please choose what went wrong.",
                      );
                      return;
                    }
                    Alert.alert(
                      "Report submitted",
                      "We will review your report shortly.",
                    );
                    setShowReportModal(false);
                  }}
                >
                  <Text style={styles.acceptButtonText}>Submit Report</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  mainTabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  activeMainTab: { backgroundColor: "#FFFFFF" },
  mainTabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  activeMainTabText: { color: "#16A34A" },
  filterWrapper: { marginBottom: 8 },
  filterContainer: { paddingHorizontal: 16, gap: 8 },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  activeFilterButton: { backgroundColor: "#E8F8EF" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  activeFilterText: { color: "#16A34A" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
  },
  topSection: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatarContainer: { position: "relative", marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  verifiedBadge: { position: "absolute", bottom: -4, right: -4 },
  providerInfo: { flex: 1, minWidth: 0 },
  providerName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  ratingText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  reviewText: { fontSize: 12, color: "#6B7280" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "700" },
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  infoContainer: { gap: 6, marginBottom: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 13, color: "#6B7280", flex: 1 },
  contactRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
  },
  contactText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  mapButtonText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  acceptButton: { backgroundColor: "#16A34A" },
  acceptButtonText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  declineButton: { backgroundColor: "#FEE2E2" },
  declineButtonText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
  cancelButton: { backgroundColor: "#FEE2E2" },
  cancelButtonText: { fontSize: 13, fontWeight: "600", color: "#DC2626" },
  completeButton: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  completeButtonText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  secondaryActionButton: { backgroundColor: "#F3F4F6" },
  secondaryActionText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  modalOverlay: { flex: 1 },
  modalOverlayInner: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 28,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 12,
  },
  modalScrollContent: { paddingBottom: 16 },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    marginTop: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  reasonRowSelected: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reasonRadioSelected: { borderColor: "#16A34A" },
  reasonRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  reasonText: { fontSize: 14, color: "#111827", flex: 1 },
  descriptionInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#111827",
  },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  photoThumb: { width: 72, height: 72, borderRadius: 10 },
  photoRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#16A34A",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
  },
  addPhotoText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
});
