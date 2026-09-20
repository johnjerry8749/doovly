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
import {
  DISPUTE_REASONS,
  type DisputeReason,
} from "@/data/disputes";

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

      const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
      setReportPhotos((prev) => [...prev, ...uris].slice(0, 3));
    } catch (error) {
      console.error("Image picker error:", error);
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
            onPress={() => openBookingLocation(item)}
          >
            <Ionicons name="map-outline" size={16} color="#16A34A" />
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
      return (
        <View style={styles.actionRow}>
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
            <Text style={styles.completeButtonText}>Completed</Text>
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
            <Image source={item.image} style={styles.avatar} resizeMode="cover" />
            {item.verified === true && (
              <View style={styles.verifiedBadge}>
                <Image
                  source={require("@/assets/premium/checkmark.png")}
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
        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
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
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View>
                  <View style={styles.modalHandle} />
                  <Text style={styles.modalTitle}>Report Issue</Text>

                  {reportBooking ? (
                    <Text style={styles.modalSubtitle}>
                      {reportBooking.title} · {reportBooking.providerName}
                    </Text>
                  ) : null}
                </View>
              </TouchableWithoutFeedback>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
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
                      activeOpacity={0.7}
                      onPress={() => {
                        Keyboard.dismiss();
                        setSelectedReason(reason);
                      }}
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
                      <Text
                        style={[
                          styles.reasonText,
                          isSelected && styles.reasonTextSelected,
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <Text style={styles.modalLabel}>Describe the issue</Text>

                <TextInput
                  style={styles.reportInput}
                  placeholder="Please explain what happened..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={reportDescription}
                  onChangeText={setReportDescription}
                  maxLength={500}
                  blurOnSubmit={false}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text style={styles.charCount}>
                  {reportDescription.length}/500
                </Text>

                <Text style={styles.modalLabel}>Add photos (optional)</Text>
                <Text style={styles.photosHint}>
                  You can add up to 3 photos for review.
                </Text>

                <View style={styles.photosRow}>
                  {reportPhotos.map((uri, index) => (
                    <View
                      key={uri + String(index)}
                      style={styles.photoThumbWrap}
                    >
                      <Image source={{ uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => {
                          Keyboard.dismiss();
                          setReportPhotos((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                        }}
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {reportPhotos.length < 3 ? (
                    <TouchableOpacity
                      style={styles.addPhotoBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        Keyboard.dismiss();
                        pickReportPhotos();
                      }}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={22}
                        color="#16A34A"
                      />
                      <Text style={styles.addPhotoText}>Add</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.submitReportBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    Keyboard.dismiss();
                    if (!selectedReason) {
                      Alert.alert(
                        "Select a reason",
                        "Please choose what went wrong.",
                      );
                      return;
                    }
                    if (!reportDescription.trim()) {
                      Alert.alert(
                        "Description required",
                        "Please describe the issue.",
                      );
                      return;
                    }
                    Alert.alert(
                      "Report submitted",
                      "Your report has been sent. Our team will review it shortly.",
                    );
                    setShowReportModal(false);
                    setReportBooking(null);
                    setSelectedReason(null);
                    setReportDescription("");
                    setReportPhotos([]);
                  }}
                >
                  <Text style={styles.submitReportBtnText}>Submit Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelReportBtn}
                  activeOpacity={0.7}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowReportModal(false);
                  }}
                >
                  <Text style={styles.cancelReportBtnText}>Cancel</Text>
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  headerSubtitle: { marginTop: 4, fontSize: 13, color: "#6B7280" },
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
  activeMainTab: { borderBottomWidth: 2, borderBottomColor: "#16A34A" },
  mainTabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  activeMainTabText: { color: "#16A34A" },
  filterWrapper: { backgroundColor: "#FFFFFF", paddingVertical: 10 },
  filterContainer: { paddingHorizontal: 16 },
  filterButton: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    marginRight: 7,
  },
  activeFilterButton: { backgroundColor: "#16A34A" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  activeFilterText: { color: "#FFFFFF" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topSection: { flexDirection: "row", alignItems: "center" },
  avatarContainer: { position: "relative", width: 52, height: 52 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E7EB",
  },
  verifiedBadge: {
    position: "absolute",
    right: -6,
    bottom: -4,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  providerName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  ratingText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  reviewText: { marginLeft: 4, fontSize: 12, color: "#9CA3AF" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "700" },
  jobTitle: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  infoContainer: { marginTop: 10, gap: 6 },
  infoItem: { flexDirection: "row", alignItems: "center" },
  infoText: { marginLeft: 8, fontSize: 13, color: "#6B7280", flex: 1 },
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
  mapButton: { backgroundColor: "#EFF6FF" },
  mapButtonText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  acceptButton: { backgroundColor: "#16A34A" },
  acceptButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  declineButton: { backgroundColor: "#FEF2F2" },
  declineButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  cancelButton: { backgroundColor: "#FEF2F2" },
  cancelButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  completeButton: { backgroundColor: "#F0FDF4" },
  completeButtonText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  secondaryActionButton: { backgroundColor: "#EFF6FF" },
  secondaryActionText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: "88%",
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  modalSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    marginTop: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  reasonRowSelected: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  reasonRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reasonRadioSelected: { borderColor: "#16A34A" },
  reasonRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  reasonText: { fontSize: 14, color: "#374151", flex: 1 },
  reasonTextSelected: { color: "#16A34A", fontWeight: "600" },
  reportInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 12,
  },
  submitReportBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  submitReportBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cancelReportBtn: { alignItems: "center", paddingVertical: 10 },
  cancelReportBtnText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  photosHint: { fontSize: 12, color: "#9CA3AF", marginBottom: 10 },
  photosRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  photoThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
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
