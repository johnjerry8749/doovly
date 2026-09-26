import React, { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  Modal,
  TextInput,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import {
  listBookedJobs,
  listReceivedJobs,
  type Booking,
} from "@/services/bookings";

import {
  DISPUTE_REASONS,
  type DisputeReason,
} from "@/services/disputes";

import { getCurrentUserId } from "@/services/inAppNotifications";
import { BookingCard } from "@/components/BookingCard";

const GREEN = "#16A34A";

export default function Bookings() {
  const [mainTab, setMainTab] = useState<"booked" | "received">("booked");

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportBooking, setReportBooking] = useState<Booking | null>(null);

  const [selectedReason, setSelectedReason] =
    useState<DisputeReason | null>(null);

  const [reportDescription, setReportDescription] = useState("");
  const [reportPhotos, setReportPhotos] = useState<string[]>([]);

  const data = useMemo<Booking[]>(() => {
    return mainTab === "booked" ? listBookedJobs() : listReceivedJobs();
  }, [mainTab]);

  const handleMainTabChange = (tab: "booked" | "received") => {
    setMainTab(tab);
  };

  const pickReportPhotos = async () => {
    try {
      const remaining = 3 - reportPhotos.length;

      if (remaining <= 0) {
        return;
      }

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

      if (result.canceled) {
        return;
      }

      const uris = result.assets.map((asset) => asset.uri).filter(Boolean);

      setReportPhotos((previous) => [...previous, ...uris].slice(0, 3));
    } catch {
      Alert.alert("Could not open photos", "Please try again.");
    }
  };

  const openReport = (item: Booking) => {
    setReportBooking(item);
    setSelectedReason(null);
    setReportDescription("");
    setReportPhotos([]);
    setShowReportModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bookings</Text>
          <Text style={styles.headerSubtitle}>
            Track your bookings and jobs
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/notification/[id]",
              params: {
                id: String(getCurrentUserId()),
              },
            })
          }
        >
          <Ionicons name="notifications-outline" size={28} color="#111" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      {/* BOOKED / RECEIVED TABS ONLY */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === "booked" && styles.mainTabActive]}
          onPress={() => handleMainTabChange("booked")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "booked" && styles.mainTabTextActive,
            ]}
          >
            Booked
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.mainTab,
            mainTab === "received" && styles.mainTabActive,
          ]}
          onPress={() => handleMainTabChange("received")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.mainTabText,
              mainTab === "received" && styles.mainTabTextActive,
            ]}
          >
            Received
          </Text>
        </TouchableOpacity>
      </View>

      {/* BOOKINGS LIST — full record history, no filters */}
      <FlatList
        data={data}
        keyExtractor={(item) => `${mainTab}-${item.id}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={28} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              Your {mainTab === "booked" ? "bookings" : "received jobs"} will
              show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard item={item} mainTab={mainTab} onReport={openReport} />
        )}
      />

      {/* REPORT MODAL */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.modalOverlayInner}
            onPress={() => Keyboard.dismiss()}
          >
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setShowReportModal(false)}
            />

            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>Report an issue</Text>

              <Text style={styles.modalSubtitle}>
                {reportBooking
                  ? `${reportBooking.title} · Booking #${reportBooking.id}`
                  : "Tell us what went wrong"}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.modalLabel}>Reason</Text>

                {DISPUTE_REASONS.map((reason) => {
                  const selected = selectedReason === reason;

                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonRow,
                        selected && styles.reasonRowSelected,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.reasonRadio,
                          selected && styles.reasonRadioSelected,
                        ]}
                      >
                        {selected && <View style={styles.reasonRadioDot} />}
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
                  {reportPhotos.map((uri) => (
                    <View key={uri}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() =>
                          setReportPhotos((previous) =>
                            previous.filter((photo) => photo !== uri),
                          )
                        }
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {reportPhotos.length < 3 && (
                    <TouchableOpacity
                      style={styles.addPhotoBtn}
                      onPress={pickReportPhotos}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera-outline" size={20} color={GREEN} />
                      <Text style={styles.addPhotoText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelReportBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowReportModal(false)}
                >
                  <Text style={styles.cancelReportText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitReportBtn,
                    (!selectedReason || !reportDescription.trim()) && {
                      opacity: 0.5,
                    },
                  ]}
                  activeOpacity={0.85}
                  disabled={!selectedReason || !reportDescription.trim()}
                  onPress={() => {
                    Alert.alert(
                      "Report submitted",
                      "We will review this dispute shortly.",
                    );
                    setShowReportModal(false);
                  }}
                >
                  <Text style={styles.submitReportText}>Submit Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginBottom: 35,
    backgroundColor: "#FFFFFF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  mainTabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },

  mainTab: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  mainTabActive: {
    backgroundColor: "#fff",
  },

  mainTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  mainTabTextActive: {
    color: GREEN,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    flexGrow: 1,
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  modalOverlay: {
    flex: 1,
  },

  modalOverlayInner: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
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

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 12,
  },

  modalScrollContent: {
    paddingBottom: 8,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
    marginBottom: 8,
  },

  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#F9FAFB",
  },

  reasonRowSelected: {
    backgroundColor: "#ECFDF5",
  },

  reasonRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  reasonRadioSelected: {
    borderColor: GREEN,
  },

  reasonRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  reasonText: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },

  descriptionInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },

  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },

  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },

  addPhotoBtn: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  addPhotoText: {
    fontSize: 11,
    fontWeight: "600",
    color: GREEN,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  cancelReportBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelReportText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },

  submitReportBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  submitReportText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
