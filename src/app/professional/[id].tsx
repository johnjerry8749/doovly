import React, { useEffect, useState } from "react";
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

  const [pro, setPro] = useState<
    Awaited<ReturnType<typeof getProfessionalById>>
  >(undefined);
  const [loadingPro, setLoadingPro] = useState(true);

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
    let cancelled = false;
    (async () => {
      try {
        setLoadingPro(true);
        const data = await getProfessionalById(id ?? "");
        if (cancelled) return;
        setPro(data);
        if (data) setReviews(data.reviews ?? []);
      } catch (e) {
        console.error("Professional load error:", e);
        if (!cancelled) setPro(undefined);
      } finally {
        if (!cancelled) setLoadingPro(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (pro.latitude == null || pro.longitude == null) {
          return;
        }

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

  if (loadingPro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

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
      setReviews((previous) => [newReview, ...previous]);
      setReviewText("");
      setReviewerName("");
      setReviewModalVisible(false);
      Alert.alert("Thanks!", "Your review was added successfully.");
    } catch (error) {
      console.log("Review error:", error);
      Alert.alert("Error", "Could not post your review. Please try again.");
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
          { text: "Not now", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () =>
              router.push("/profile/subscription/subscription"),
          },
        ],
      );
      return;
    }
    if (result.ok) setSaved(result.saved);
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={GREEN} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Professional Profile</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onToggleSave}
              activeOpacity={0.7}
              hitSlop={8}
              style={styles.headerActionBtn}
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={24}
                color={saved ? "#EF4444" : GREEN}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onShare}
              activeOpacity={0.7}
              hitSlop={8}
              style={styles.headerActionBtn}
            >
              <Ionicons name="share-outline" size={24} color={GREEN} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fixedProfileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                typeof pro.image === "string"
                  ? { uri: pro.image }
                  : (pro.image as any)
              }
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{pro.name}</Text>
          </View>

          {pro.bio ? (
            <Text style={styles.bioText} numberOfLines={3}>
              {pro.bio}
            </Text>
          ) : null}

          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={GREEN} />
            {loadingDistance ? (
              <ActivityIndicator size="small" color={GREEN} />
            ) : (
              <Text style={styles.locationText}>{distanceLabel}</Text>
            )}
          </View>

          {(pro.verified || pro.subscribed) && (
            <View style={styles.badgeRow}>
              {pro.verified ? (
                <View style={styles.badgeItem}>
                  <Ionicons name="checkmark-circle" size={28} color={GREEN} />
                  <View style={styles.badgeTextWrap}>
                    <Text style={styles.badgeTitle}>Verified</Text>
                    <Text style={styles.badgeSub}>
                      Identity & documents verified
                    </Text>
                  </View>
                </View>
              ) : null}
              {pro.subscribed ? (
                <View style={styles.badgeItem}>
                  <MaterialCommunityIcons
                    name="shield-crown"
                    size={28}
                    color="#D4AF37"
                  />
                  <View style={styles.badgeTextWrap}>
                    <Text style={styles.badgeTitle}>Premium</Text>
                    <Text style={styles.badgeSub}>Active subscription</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

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
        </View>

        <View style={styles.scrollArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {tab === "services" && (
              <View style={styles.serviceCard}>
                {(pro.services ?? []).map((service, index) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceRow,
                      index < (pro.services?.length ?? 0) - 1 &&
                        styles.serviceBorder,
                      isOwnProfile && styles.disabledButton,
                    ]}
                    disabled={isOwnProfile}
                    onPress={() => {
                      if (isOwnProfile) return;
                      router.push({
                        pathname: "/bookme/[id]",
                        params: {
                          id: pro.id,
                          serviceId: service.id,
                          serviceName: service.name,
                          price: service.price,
                        },
                      });
                    }}
                    activeOpacity={isOwnProfile ? 1 : 0.7}
                  >
                    <View style={styles.serviceIcon}>
                      <MaterialCommunityIcons
                        name={service.icon as any}
                        size={22}
                        color={GREEN}
                      />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text
                        style={styles.serviceDescription}
                        numberOfLines={2}
                      >
                        {service.description}
                      </Text>
                    </View>
                    <Text style={styles.servicePrice}>{service.price}</Text>
                  </TouchableOpacity>
                ))}
                {(pro.services ?? []).length === 0 && (
                  <Text style={styles.emptyText}>No services listed yet</Text>
                )}
              </View>
            )}

            {tab === "portfolio" && (
              <View style={styles.portfolioGrid}>
                {(pro.portfolio ?? []).length === 0 ? (
                  <Text style={styles.emptyText}>
                    No completed projects yet
                  </Text>
                ) : (
                  (pro.portfolio ?? []).map((project) => (
                    <View key={project.id} style={styles.portfolioItem}>
                      {project.image ? (
                        <Image
                          source={
                            typeof project.image === "string"
                              ? { uri: project.image }
                              : (project.image as any)
                          }
                          style={styles.projectImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      <Text style={styles.projectTitle} numberOfLines={2}>
                        {project.description}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {tab === "reviews" && (
              <View style={styles.reviewsContainer}>
                <TouchableOpacity
                  style={[
                    styles.writeReviewButton,
                    isOwnProfile && styles.disabledButton,
                  ]}
                  activeOpacity={isOwnProfile ? 1 : 0.8}
                  disabled={isOwnProfile}
                  onPress={() => {
                    if (isOwnProfile) return;
                    setReviewModalVisible(true);
                  }}
                >
                  <View style={styles.writeReviewIcon}>
                    <Ionicons name="create-outline" size={22} color={GREEN} />
                  </View>
                  <View style={styles.writeReviewContent}>
                    <Text style={styles.writeReviewTitle}>
                      {isOwnProfile ? "Your profile" : "Write a review"}
                    </Text>
                    <Text style={styles.writeReviewHint}>
                      {isOwnProfile
                        ? "You cannot review your own profile"
                        : "Share your experience with this professional"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {reviews.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No reviews yet. Be the first!
                  </Text>
                ) : (
                  reviews.map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>
                            {review.userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewName}>
                            {review.userName}
                          </Text>
                          <Text style={styles.reviewDate}>{review.date}</Text>
                        </View>
                      </View>
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalSheet}>
            <Text style={styles.reviewModalTitle}>Write a review</Text>
            <TextInput
              style={styles.reviewNameInput}
              placeholder="Your name (optional)"
              placeholderTextColor="#9CA3AF"
              value={reviewerName}
              onChangeText={setReviewerName}
            />
            <TextInput
              style={styles.reviewTextInput}
              placeholder="Share your experience..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={reviewText}
              onChangeText={setReviewText}
            />
            <View style={styles.reviewModalActions}>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(false)}
                style={styles.reviewCancelBtn}
              >
                <Text style={styles.reviewCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitReview}
                style={styles.reviewSubmitBtn}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.reviewSubmitText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16, color: "#333", marginBottom: 12 },
  backLink: { color: GREEN, fontWeight: "600" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
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
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerActionBtn: { padding: 6 },
  fixedProfileSection: { alignItems: "center", paddingTop: 16, paddingHorizontal: 16 },
  avatarContainer: { marginBottom: 10 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E7EB",
  },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  nameText: { fontSize: 20, fontWeight: "700", color: "#111" },
  bioText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  locationText: { fontSize: 13, color: "#555" },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  badgeItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  badgeTextWrap: {},
  badgeTitle: { fontSize: 13, fontWeight: "700", color: "#111" },
  badgeSub: { fontSize: 11, color: "#6B7280" },
  tabs: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginTop: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: { borderBottomWidth: 2, borderBottomColor: GREEN },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  activeTabText: { color: GREEN },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  serviceBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceInfo: { flex: 1, marginRight: 8 },
  serviceName: { fontSize: 15, fontWeight: "600", color: "#111" },
  serviceDescription: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  servicePrice: { fontSize: 14, fontWeight: "700", color: GREEN },
  disabledButton: { opacity: 0.5 },
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  portfolioItem: { width: "47%" },
  projectImage: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  projectTitle: { fontSize: 12, color: "#333", marginTop: 6 },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 24,
    fontSize: 14,
  },
  reviewsContainer: {},
  writeReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  writeReviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  writeReviewContent: { flex: 1 },
  writeReviewTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
  writeReviewHint: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 10,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reviewAvatarText: { fontWeight: "700", color: GREEN },
  reviewName: { fontSize: 14, fontWeight: "600", color: "#111" },
  reviewDate: { fontSize: 11, color: "#9CA3AF" },
  reviewComment: { fontSize: 13, color: "#374151", lineHeight: 20 },
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  reviewModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  reviewModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 14,
  },
  reviewNameInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 15,
    marginBottom: 14,
  },
  reviewModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  reviewCancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  reviewCancelText: { color: "#6B7280", fontWeight: "600" },
  reviewSubmitBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 80,
    alignItems: "center",
  },
  reviewSubmitText: { color: "#fff", fontWeight: "700" },
});
