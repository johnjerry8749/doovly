
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

  const pro = useMemo(
    () => getProfessionalById(id ?? ""),
    [id]
  );

  const [tab, setTab] = useState<TabKey>("services");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loadingDistance, setLoadingDistance] = useState(true);

  const [reviews, setReviews] = useState<ProReview[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ----------------------------------------------------------
  // LOAD REVIEWS
  // ----------------------------------------------------------

  useEffect(() => {
    if (pro) {
      setReviews(pro.reviews);
    }
  }, [pro]);

  // ----------------------------------------------------------
  // LOCATION / DISTANCE
  // ----------------------------------------------------------

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
          pro.longitude
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

  // ----------------------------------------------------------
  // PROFESSIONAL NOT FOUND
  // ----------------------------------------------------------

  if (!pro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>
            Professional not found
          </Text>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------------
  // BOOKING
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // REVIEW
  // ----------------------------------------------------------

  const submitReview = async () => {
    const comment = reviewText.trim();

    if (!comment) {
      Alert.alert(
        "Empty review",
        "Please write a short comment about this pro."
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

      Alert.alert(
        "Thanks!",
        "Your review was added."
      );
    } catch {
      Alert.alert(
        "Error",
        "Could not post review. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // DISTANCE LABEL
  // ----------------------------------------------------------

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
    reviews.length
  );

  const reviewsToNextStar =
    10 - (reviews.length % 10);

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

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
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#16A34A"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Professional Profile
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* CONTENT */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* PROFILE IMAGE */}

          <View style={styles.avatarContainer}>
            <Image
              source={pro.image}
              style={styles.avatar}
            />

            {pro.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="#fff"
                />
              </View>
            )}
          </View>

          {/* NAME */}

          <Text style={styles.name}>
            {pro.name}
          </Text>

          {/* RATING */}

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
                color="#16A34A"
              />
            ))}

            <Text style={styles.ratingText}>
              {starCount}/5 · {reviews.length}{" "}
              {reviews.length === 1
                ? "review"
                : "reviews"}
            </Text>
          </View>

          {/* STAR PROGRESS */}

          {starCount < 5 && (
            <Text style={styles.starHint}>
              {reviewsToNextStar} more review
              {reviewsToNextStar === 1
                ? ""
                : "s"}{" "}
              to unlock the next star
            </Text>
          )}

          {/* LOCATION */}

          <View style={styles.locationRow}>
            <Ionicons
              name="location"
              size={16}
              color="#16A34A"
            />

            {loadingDistance ? (
              <ActivityIndicator
                size="small"
                color="#16A34A"
              />
            ) : (
              <Text style={styles.locationText}>
                {distanceLabel}
              </Text>
            )}
          </View>

          {/* PROFILE TABS */}

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
                  tab === key && styles.activeTab,
                ]}
                onPress={() => setTab(key)}
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

          {/* SERVICES */}

          {tab === "services" && (
            <View style={styles.serviceCard}>
              {pro.services.map((service, index) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceRow,
                    index <
                      pro.services.length - 1 &&
                      styles.serviceBorder,
                  ]}
                  onPress={() =>
                    onBook(service)
                  }
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
                    <Text
                      style={styles.serviceName}
                    >
                      {service.name}
                    </Text>

                    <Text
                      style={styles.serviceDescription}
                      numberOfLines={2}
                    >
                      {service.description}
                    </Text>
                  </View>

                  <Text style={styles.servicePrice}>
                    {service.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* PORTFOLIO */}

          {tab === "portfolio" && (
            <View style={styles.portfolioGrid}>
              {pro.portfolio.length === 0 ? (
                <Text style={styles.emptyText}>
                  No portfolio photos yet
                </Text>
              ) : (
                pro.portfolio.map((image, index) => (
                  <Image
                    key={index}
                    source={image}
                    style={styles.portfolioImage}
                  />
                ))
              )}
            </View>
          )}

          {/* REVIEWS */}

          {tab === "reviews" && (
            <View style={styles.reviewsContainer}>
              <View style={styles.writeReview}>
                <Text style={styles.writeTitle}>
                  Write a review
                </Text>

                <Text style={styles.writeHint}>
                  Every 10 reviews gives this pro
                  another star.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Your name (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={reviewerName}
                  onChangeText={setReviewerName}
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.commentInput,
                  ]}
                  placeholder="Share your experience..."
                  placeholderTextColor="#9CA3AF"
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!reviewText.trim() ||
                      submitting) &&
                      styles.disabledButton,
                  ]}
                  disabled={
                    !reviewText.trim() ||
                    submitting
                  }
                  onPress={submitReview}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={
                        styles.submitButtonText
                      }
                    >
                      Post Review
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {reviews.length === 0 ? (
                <Text style={styles.emptyText}>
                  No reviews yet — be the first!
                </Text>
              ) : (
                reviews.map((review) => (
                  <View
                    key={review.id}
                    style={styles.reviewCard}
                  >
                    <View style={styles.reviewHeader}>
                      <View
                        style={
                          styles.reviewAvatar
                        }
                      >
                        <Text
                          style={
                            styles.reviewInitial
                          }
                        >
                          {review.userName
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={
                            styles.reviewName
                          }
                        >
                          {review.userName}
                        </Text>

                        <Text
                          style={
                            styles.reviewDate
                          }
                        >
                          {review.date}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={styles.reviewComment}
                    >
                      {review.comment}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* SPACE FOR FIXED BUTTON */}

          <View style={styles.bottomSpace} />
        </ScrollView>    
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
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

  content: {
    paddingHorizontal: 20,
    alignItems: "center",
  },

  avatarContainer: {
    marginTop: 20,
    marginBottom: 14,
    position: "relative",
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#E5E7EB",
  },

  verifiedBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

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

  portfolioGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  portfolioImage: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },

  reviewsContainer: {
    width: "100%",
    gap: 12,
  },

  writeReview: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },

  writeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  writeHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
  },

  commentInput: {
    minHeight: 90,
    paddingTop: 12,
  },

  submitButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  emptyText: {
    width: "100%",
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 30,
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
    color: "#fff",
    fontWeight: "700",
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

  bottomSpace: {
    height: 150,
  },

  bookingFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
