import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { router, useLocalSearchParams } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";

import * as Location from "expo-location";

import {
  getProfessionalById,
  getDistanceKm,
  starsFromReviewCount,
  addReview,
  type ProService,
  type ProReview,
} from "@/services/professionals";

type TabKey = "services" | "portfolio" | "reviews";

export default function ProfessionalProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // ============================================================
  // PROFESSIONAL
  // ============================================================

  const pro = useMemo(() => getProfessionalById(id ?? ""), [id]);

  // ============================================================
  // TAB STATE
  // ============================================================

  const [tab, setTab] = useState<TabKey>("services");

  // ============================================================
  // DISTANCE STATE
  // ============================================================

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loadingDistance, setLoadingDistance] = useState(true);

  // ============================================================
  // REVIEW STATE
  // ============================================================

  const [reviews, setReviews] = useState<ProReview[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // ============================================================
  // LOAD REVIEWS
  // ============================================================

  useEffect(() => {
    if (pro) {
      setReviews(pro.reviews);
    }
  }, [pro]);

  // ============================================================
  // CALCULATE DISTANCE
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const calculateDistance = async () => {
      if (!pro) {
        setLoadingDistance(false);
        return;
      }

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const distance = getDistanceKm(
          location.coords.latitude,
          location.coords.longitude,
          pro.latitude,
          pro.longitude,
        );

        if (mounted) {
          setDistanceKm(distance);
        }
      } catch (error) {
        console.log("Distance error:", error);
      } finally {
        if (mounted) {
          setLoadingDistance(false);
        }
      }
    };

    calculateDistance();

    return () => {
      mounted = false;
    };
  }, [pro]);

  // ============================================================
  // PROFESSIONAL NOT FOUND
  // ============================================================

  if (!pro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Professional not found</Text>

          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================
  // BOOKING
  // ============================================================

  const onBook = (service?: ProService) => {
    router.push({
      pathname: "/(tab)/bookings",
      params: {
        proId: pro.id,
        serviceId: service?.id ?? "",
        serviceName: service?.name ?? "",
        price: service?.price ?? pro.priceFrom,
      },
    });
  };

  // ============================================================
  // SUBMIT REVIEW
  // ============================================================

  const submitReview = async () => {
    const comment = reviewText.trim();

    if (!comment) {
      Alert.alert(
        "Empty review",
        "Please write a short comment about this professional.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const newReview = await addReview(pro.id, {
        userName: reviewerName.trim() || "Anonymous",
        comment,
      });

      // Add newest review to the beginning
      setReviews((previous) => [newReview, ...previous]);

      // Clear form
      setReviewText("");
      setReviewerName("");

      // Close modal
      setReviewModalVisible(false);

      Alert.alert("Thanks!", "Your review was added successfully.");
    } catch (error) {
      console.log("Review error:", error);

      Alert.alert("Error", "Could not post your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // DISTANCE LABEL
  // ============================================================

  const distanceLabel = loadingDistance
    ? "Getting distance..."
    : distanceKm !== null
      ? `${
          distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)
        } km away`
      : pro.city;

  // ============================================================
  // RATING
  // ============================================================

  const starCount = starsFromReviewCount(reviews.length);

  const reviewsToNextStar = 10 - (reviews.length % 10);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#16A34A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Professional Profile</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* ======================================================
            MAIN CONTENT
        ====================================================== */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ====================================================
              PROFILE IMAGE
          ==================================================== */}

          <View style={styles.avatarContainer}>
            <Image
              source={pro.image}
              style={styles.avatar}
              resizeMode="cover"
            />

            {/* Blue verification badge */}
            {pro.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* ====================================================
              PROFESSIONAL NAME
          ==================================================== */}

          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{pro.name}</Text>

            {/* Gold premium shield */}
            {pro.subscribed && (
              <View style={styles.premiumShield}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={25}
                  color="#D4AF37"
                />
              </View>
            )}
          </View>

          {/* ====================================================
              RATING
          ==================================================== */}

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= starCount ? "star" : "star-outline"}
                size={18}
                color="#16A34A"
              />
            ))}

            <Text style={styles.ratingText}>
              {starCount}/5 · {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </Text>
          </View>

          {/* ====================================================
              STAR PROGRESS
          ==================================================== */}

          {starCount < 5 && (
            <Text style={styles.starHint}>
              {reviewsToNextStar} more review
              {reviewsToNextStar === 1 ? "" : "s"} to unlock the next star
            </Text>
          )}

          {/* ====================================================
              LOCATION
          ==================================================== */}

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#16A34A" />

            {loadingDistance ? (
              <ActivityIndicator size="small" color="#16A34A" />
            ) : (
              <Text style={styles.locationText}>{distanceLabel}</Text>
            )}
          </View>

          {/* ====================================================
              TABS
          ==================================================== */}

          <View style={styles.tabs}>
            {(
              [
                ["services", "Services"],
                ["portfolio", "Portfolio"],
                ["reviews", "Reviews"],
              ] as const
            ).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.tab, tab === key && styles.activeTab]}
                onPress={() => setTab(key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tabText, tab === key && styles.activeTabText]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ====================================================
              SERVICES TAB
          ==================================================== */}

          {tab === "services" && (
            <View style={styles.serviceCard}>
              {pro.services.map((service, index) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceRow,
                    index < pro.services.length - 1 && styles.serviceBorder,
                  ]}
                  onPress={() => onBook(service)}
                  activeOpacity={0.7}
                >
                  <View style={styles.serviceIcon}>
                    <MaterialCommunityIcons
                      name={service.icon as any}
                      size={22}
                      color="#16A34A"
                    />
                  </View>

                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>

                    <Text style={styles.serviceDescription} numberOfLines={2}>
                      {service.description}
                    </Text>
                  </View>

                  <Text style={styles.servicePrice}>{service.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ====================================================
              PORTFOLIO TAB
          ==================================================== */}

          {tab === "portfolio" && (
            <View style={styles.portfolioGrid}>
              {pro.completedProjects?.length === 0 ? (
                <Text style={styles.emptyText}>No completed projects yet</Text>
              ) : (
                pro.completedProjects?.map((project) => (
                  <View key={project.id} style={styles.projectCard}>
                    <View style={styles.projectHeader}>
                      <View style={styles.projectIcon}>
                        <Ionicons
                          name="checkmark-done"
                          size={18}
                          color="#0A66C2"
                        />
                      </View>

                      <Text style={styles.projectTitle}>{project.title}</Text>
                    </View>

                    <Text style={styles.projectDescription}>
                      {project.description}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ====================================================
              REVIEWS TAB
          ==================================================== */}

          {tab === "reviews" && (
            <View style={styles.reviewsContainer}>
              {/* WRITE REVIEW BUTTON */}

              <TouchableOpacity
                style={styles.writeReviewButton}
                activeOpacity={0.8}
                onPress={() => setReviewModalVisible(true)}
              >
                <View style={styles.writeReviewIcon}>
                  <Ionicons name="create-outline" size={22} color="#16A34A" />
                </View>

                <View style={styles.writeReviewContent}>
                  <Text style={styles.writeReviewTitle}>Write a review</Text>

                  <Text style={styles.writeReviewHint}>
                    Share your experience with this professional
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* REVIEW LIST */}

              {reviews.length === 0 ? (
                <Text style={styles.emptyText}>
                  No reviews yet. Be the first!
                </Text>
              ) : (
                reviews.map((review) => (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewInitial}>
                          {review.userName.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.reviewUserInfo}>
                        <Text style={styles.reviewName}>{review.userName}</Text>

                        <Text style={styles.reviewDate}>{review.date}</Text>
                      </View>
                    </View>

                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* SPACE FOR FIXED BOOK BUTTON */}

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* ======================================================
            FIXED BOOK NOW BUTTON
        ====================================================== */}

        <View style={styles.bookingFooter}>
          <TouchableOpacity
            style={styles.bookButton}
            activeOpacity={0.8}
            onPress={() => onBook()}
          >
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />

            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
        </View>

        {/* ======================================================
            WRITE REVIEW MODAL
        ====================================================== */}

        <Modal
          visible={reviewModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setReviewModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.reviewModal}>
              {/* MODAL HEADER */}

              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Write a review</Text>

                  <Text style={styles.modalSubtitle}>
                    Share your experience with {pro.name}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setReviewModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>

              {/* REVIEW INFO */}

              <View style={styles.modalInfo}>
                <Ionicons name="star" size={20} color="#16A34A" />

                <Text style={styles.modalInfoText}>
                  Your honest experience can help other users make better
                  decisions.
                </Text>
              </View>

              {/* NAME INPUT */}

              <TextInput
                style={styles.input}
                placeholder="Your name (optional)"
                placeholderTextColor="#9CA3AF"
                value={reviewerName}
                onChangeText={setReviewerName}
                editable={!submitting}
              />

              {/* REVIEW INPUT */}

              <TextInput
                style={[styles.input, styles.commentInput]}
                placeholder="Share your experience..."
                placeholderTextColor="#9CA3AF"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />

              {/* SUBMIT BUTTON */}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!reviewText.trim() || submitting) && styles.disabledButton,
                ]}
                disabled={!reviewText.trim() || submitting}
                onPress={submitReview}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#FFFFFF" />

                    <Text style={styles.submitButtonText}>Post Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  // ==========================================================
  // GENERAL
  // ==========================================================

  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  notFound: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 12,
  },

  backLink: {
    color: "#16A34A",
    fontWeight: "600",
  },

  // ==========================================================
  // HEADER
  // ==========================================================

  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  headerSpacer: {
    width: 40,
  },

  // ==========================================================
  // CONTENT
  // ==========================================================

  content: {
    paddingHorizontal: 20,
    alignItems: "center",
  },

  // ==========================================================
  // PROFILE
  // ==========================================================

  avatarContainer: {
    position: "relative",
    marginTop: 20,
    marginBottom: 14,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#E5E7EB",
  },

  // Blue verified badge on profile image
  verifiedBadge: {
    position: "absolute",
    right: 9,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0A66C2",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    // Android shadow
    elevation: 3,

    // iOS shadow
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },

  nameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  // Gold premium shield
  premiumShield: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  // ==========================================================
  // RATING
  // ==========================================================

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  ratingText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 6,
  },

  starHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },

  // ==========================================================
  // LOCATION
  // ==========================================================

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 6,
  },

  locationText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // ==========================================================
  // TABS
  // ==========================================================

  tabs: {
    width: "100%",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#16A34A",
  },

  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  activeTabText: {
    color: "#16A34A",
  },

  // ==========================================================
  // SERVICES
  // ==========================================================

  serviceCard: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingHorizontal: 4,
  },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  serviceBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  serviceInfo: {
    flex: 1,
    marginRight: 8,
  },

  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },

  serviceDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },

  servicePrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16A34A",
  },

  // ==========================================================
  // PORTFOLIO
  // ==========================================================

  portfolioGrid: {
    width: "100%",
    gap: 12,
  },

  projectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 12,
  },

  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  projectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  projectTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },

  projectDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: "#666666",
    marginLeft: 46,
  },

  emptyText: {
    textAlign: "center",
    fontSize: 14,
    color: "#888888",
    paddingVertical: 30,
  },

  // ==========================================================
  // REVIEWS
  // ==========================================================

  reviewsContainer: {
    width: "100%",
    gap: 12,
  },

  writeReviewButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  writeReviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  writeReviewContent: {
    flex: 1,
  },

  writeReviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },

  writeReviewHint: {
    fontSize: 12,
    color: "#6B7280",
  },

  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  reviewInitial: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  reviewUserInfo: {
    flex: 1,
  },

  reviewName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },

  reviewComment: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
  },

  emptyText: {
    width: "100%",
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 30,
  },

  // ==========================================================
  // FIXED BOOK BUTTON
  // ==========================================================

  bottomSpace: {
    height: 110,
  },

  bookingFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  bookButton: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // ==========================================================
  // REVIEW MODAL
  // ==========================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },

  reviewModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  modalTitleContainer: {
    flex: 1,
    marginRight: 12,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  modalInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },

  modalInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#4B5563",
    marginLeft: 8,
    lineHeight: 17,
  },

  // ==========================================================
  // INPUTS
  // ==========================================================

  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
  },

  commentInput: {
    minHeight: 110,
    paddingTop: 12,
  },

  // ==========================================================
  // SUBMIT REVIEW
  // ==========================================================

  submitButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },

  disabledButton: {
    opacity: 0.5,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
