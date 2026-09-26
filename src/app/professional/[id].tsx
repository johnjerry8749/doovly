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
  Share,
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
  type ProReview,
} from "@/services/professionals";

import {
  isSaved,
  toggleSave,
  isOwnProfessionalProfile,
} from "@/services/savedProviders";

type TabKey = "services" | "portfolio" | "reviews";

const GREEN = "#16A34A";

export default function ProfessionalProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const pro = useMemo(
    () => getProfessionalById(id ?? ""),
    [id],
  );

  const [tab, setTab] = useState<TabKey>("services");

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loadingDistance, setLoadingDistance] = useState(true);

  const [reviews, setReviews] = useState<ProReview[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [saved, setSaved] = useState(() => isSaved(id ?? ""));

  useEffect(() => {
    if (pro) {
      setReviews(pro.reviews);
    }
  }, [pro]);

  useEffect(() => {
    setSaved(isSaved(id ?? ""));
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const calculateDistance = async () => {
      if (!pro) {
        setLoadingDistance(false);
        return;
      }

      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          return;
        }

        const location =
          await Location.getCurrentPositionAsync({
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

  if (!pro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>
            Professional not found
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backLink}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = isOwnProfessionalProfile(pro.id);

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

      setReviews((previous) => [
        newReview,
        ...previous,
      ]);

      setReviewText("");
      setReviewerName("");
      setReviewModalVisible(false);

      Alert.alert(
        "Thanks!",
        "Your review was added successfully.",
      );
    } catch (error) {
      console.log("Review error:", error);

      Alert.alert(
        "Error",
        "Could not post your review. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleSave = () => {
    const result = toggleSave(pro.id);

    if (!result.ok && result.reason === "limit") {
      Alert.alert(
        "Save limit reached",
        "Free users can save up to 5 providers. Upgrade to Pro for unlimited saves.",
        [
          {
            text: "Not now",
            style: "cancel",
          },
          {
            text: "Upgrade",
            onPress: () =>
              router.push(
                "/profile/subscription/subscription",
              ),
          },
        ],
      );

      return;
    }

    if (result.ok) {
      setSaved(result.saved);
    }
  };

  const onShare = async () => {
    const link = `doovly://professional/${pro.id}`;

    try {
      await Share.share({
        message:
          Platform.OS === "ios"
            ? `Check out ${pro.name} (${pro.profession}) on Doovly`
            : `Check out ${pro.name} (${pro.profession}) on Doovly\n${link}`,
        url: link,
        title: `${pro.name} · ${pro.profession}`,
      });
    } catch (error) {
      console.log("Share error:", error);
    }
  };

  const distanceLabel = loadingDistance
    ? "Getting distance..."
    : distanceKm !== null
      ? `${
          distanceKm < 10
            ? distanceKm.toFixed(1)
            : Math.round(distanceKm)
        } km away`
      : pro.city;

  const starCount = starsFromReviewCount(
    reviews.length,
  );

  const reviewsToNextStar =
    10 - (reviews.length % 10);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={GREEN}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Professional Profile
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onToggleSave}
              activeOpacity={0.7}
              hitSlop={8}
              style={styles.headerActionBtn}
            >
              <Ionicons
                name={
                  saved
                    ? "heart"
                    : "heart-outline"
                }
                size={24}
                color={
                  saved ? "#EF4444" : GREEN
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onShare}
              activeOpacity={0.7}
              hitSlop={8}
              style={styles.headerActionBtn}
            >
              <Ionicons
                name="share-outline"
                size={24}
                color={GREEN}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fixedProfileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={pro.image}
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.nameText}>
              {pro.name}
            </Text>

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

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={
                  star <= starCount
                    ? "star"
                    : "star-outline"
                }
                size={18}
                color={GREEN}
              />
            ))}

            <Text style={styles.ratingText}>
              {starCount}/5 · {reviews.length}{" "}
              {reviews.length === 1
                ? "review"
                : "reviews"}
            </Text>
          </View>

          {starCount < 5 && (
            <Text style={styles.starHint}>
              {reviewsToNextStar} more review
              {reviewsToNextStar === 1
                ? ""
                : "s"}{" "}
              to unlock the next star
            </Text>
          )}

          <View style={styles.locationRow}>
            <Ionicons
              name="location"
              size={16}
              color={GREEN}
            />

            {loadingDistance ? (
              <ActivityIndicator
                size="small"
                color={GREEN}
              />
            ) : (
              <Text style={styles.locationText}>
                {distanceLabel}
              </Text>
            )}
          </View>

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
                style={[
                  styles.tab,
                  tab === key &&
                    styles.activeTab,
                ]}
                onPress={() =>
                  setTab(key)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === key &&
                      styles.activeTabText,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.scrollArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
          >
            {tab === "services" && (
              <View style={styles.serviceCard}>
                {pro.services.map(
                  (service, index) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.serviceRow,
                        index <
                          pro.services.length - 1 &&
                          styles.serviceBorder,
                        isOwnProfile &&
                          styles.disabledButton,
                      ]}
                      disabled={isOwnProfile}
                      onPress={() => {
                        if (isOwnProfile) return;

                        router.push({
                          pathname:
                            "/bookme/[id]",
                          params: {
                            id: pro.id,
                            serviceId:
                              service.id,
                            serviceName:
                              service.name,
                            price:
                              service.price,
                          },
                        });
                      }}
                      activeOpacity={
                        isOwnProfile
                          ? 1
                          : 0.7
                      }
                    >
                      <View
                        style={styles.serviceIcon}
                      >
                        <MaterialCommunityIcons
                          name={
                            service.icon as any
                          }
                          size={22}
                          color={GREEN}
                        />
                      </View>

                      <View
                        style={styles.serviceInfo}
                      >
                        <Text
                          style={
                            styles.serviceName
                          }
                        >
                          {service.name}
                        </Text>

                        <Text
                          style={
                            styles.serviceDescription
                          }
                          numberOfLines={2}
                        >
                          {service.description}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.servicePrice
                        }
                      >
                        {service.price}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            )}

            {tab === "portfolio" && (
              <View style={styles.portfolioGrid}>
                {pro.portfolio?.length === 0 ? (
                  <Text
                    style={styles.emptyText}
                  >
                    No completed projects yet
                  </Text>
                ) : (
                  pro.portfolio.map(
                    (project) => (
                      <View
                        key={project.id}
                        style={
                          styles.portfolioItem
                        }
                      >
                        <Image
                          source={
                            project.image
                          }
                          style={
                            styles.projectImage
                          }
                          resizeMode="cover"
                        />

                        <Text
                          style={
                            styles.projectTitle
                          }
                          numberOfLines={2}
                        >
                          {
                            project.description
                          }
                        </Text>
                      </View>
                    ),
                  )
                )}
              </View>
            )}

            {tab === "reviews" && (
              <View
                style={styles.reviewsContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.writeReviewButton,
                    isOwnProfile &&
                      styles.disabledButton,
                  ]}
                  activeOpacity={
                    isOwnProfile ? 1 : 0.8
                  }
                  disabled={isOwnProfile}
                  onPress={() => {
                    if (isOwnProfile) return;

                    setReviewModalVisible(
                      true,
                    );
                  }}
                >
                  <View
                    style={
                      styles.writeReviewIcon
                    }
                  >
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={GREEN}
                    />
                  </View>

                  <View
                    style={
                      styles.writeReviewContent
                    }
                  >
                    <Text
                      style={
                        styles.writeReviewTitle
                      }
                    >
                      {isOwnProfile
                        ? "Your profile"
                        : "Write a review"}
                    </Text>

                    <Text
                      style={
                        styles.writeReviewHint
                      }
                    >
                      {isOwnProfile
                        ? "You cannot review your own profile"
                        : "Share your experience with this professional"}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>

                {reviews.length === 0 ? (
                  <Text
                    style={styles.emptyText}
                  >
                    No reviews yet. Be the first!
                  </Text>
                ) : (
                  reviews.map((review) => (
                    <View
                      key={review.id}
                      style={
                        styles.reviewCard
                      }
                    >
                      <View
                        style={
                          styles.reviewHeader
                        }
                      >
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>
                            {review.userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewName}>
                            {review.userName}
                          </Text>
                          <Text style={styles.reviewDate}>
                            {review.date}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.reviewComment}>
                        {review.comment}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>

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
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Write a review</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Your name (optional)"
                placeholderTextColor="#9CA3AF"
                value={reviewerName}
                onChangeText={setReviewerName}
              />
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Share your experience..."
                placeholderTextColor="#9CA3AF"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.modalSubmit, submitting && { opacity: 0.6 }]}
                onPress={submitReview}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Post review</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(false)}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ textAlign: "center", color: "#6B7280" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 15,
    color: GREEN,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  fixedProfileSection: {
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarContainer: {
    marginBottom: 10,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E7EB",
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
    textAlign: "center",
  },
  premiumShield: {
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 6,
  },
  starHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 18,
  },
  locationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  tabs: {
    flexDirection: "row",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: GREEN,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  activeTabText: {
    color: GREEN,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  serviceBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  serviceDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN,
  },
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  portfolioItem: {
    width: "47%",
  },
  projectImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  projectTitle: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 6,
  },
  reviewsContainer: {
    gap: 12,
  },
  writeReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
  },
  writeReviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  writeReviewContent: {
    flex: 1,
  },
  writeReviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  writeReviewHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: GREEN,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  reviewDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  reviewComment: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 14,
    paddingVertical: 24,
  },
  disabledButton: {
    opacity: 0.55,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
    marginBottom: 12,
  },
  modalTextArea: {
    minHeight: 100,
  },
  modalSubmit: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
