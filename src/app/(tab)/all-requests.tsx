import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listServiceRequests,
  type ServiceRequest,
} from "@/services/serviceRequests";
import {
  addInAppNotification,
  getCurrentUserId,
} from "@/services/inAppNotifications";
import { useLocation } from "@/context/LocationContext";

const GREEN = "#159447";

const CATEGORY_FILTERS = [
  "All",
  "Cleaning",
  "Repair",
  "Plumbing",
  "Painting",
  "Electrical",
  "Barber",
  "Nail Tech",
  "Mechanic",
];

export default function AllRequests() {
  const { locationName, loadingLocation, showAllNigeria } = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [offerRequest, setOfferRequest] = useState<ServiceRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState("");

  const allRequests = listServiceRequests();

  const matchesLocationCity = (itemCity: string, itemArea?: string) => {
    if (loadingLocation || showAllNigeria || !locationName) {
      return true;
    }

    const city = locationName.split(",")[0].trim().toLowerCase();
    if (!city || city === "nigeria") return true;

    const c = itemCity.toLowerCase();
    const area = (itemArea || "").toLowerCase();
    return c.includes(city) || city.includes(c) || area.includes(city);
  };

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allRequests.filter((req) => {
      const matchesSearch =
        !query ||
        req.title.toLowerCase().includes(query) ||
        req.category.toLowerCase().includes(query) ||
        req.location.toLowerCase().includes(query) ||
        req.city.toLowerCase().includes(query) ||
        req.description.toLowerCase().includes(query);

      const matchesLocation = matchesLocationCity(req.city, req.location);

      const matchesCategory =
        categoryFilter === "All" ||
        req.category.toLowerCase().includes(categoryFilter.toLowerCase()) ||
        (categoryFilter === "Repair" &&
          ["mechanic", "electrical", "plumbing"].some((k) =>
            req.category.toLowerCase().includes(k),
          ));

      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [
    allRequests,
    search,
    categoryFilter,
    locationName,
    loadingLocation,
    showAllNigeria,
  ]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const closeOffer = () => {
    setOfferRequest(null);
    setOfferPrice("");
  };

  const submitOffer = () => {
    if (!offerRequest) return;
    const amount = offerPrice.replace(/[^\d]/g, "");
    if (!amount) return;

    const recipientId =
      offerRequest.createdByUserId &&
      offerRequest.createdByUserId !== getCurrentUserId()
        ? offerRequest.createdByUserId
        : getCurrentUserId();

    addInAppNotification({
      userId: recipientId,
      type: "general",
      title: "New Offer",
      body: `Someone sent an offer of ₦${Number(amount).toLocaleString()} on "${offerRequest.title}".`,
    });

    closeOffer();
  };

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const liked = !!likedIds[item.id];
    const likesDisplay = item.likesCount + (liked ? 1 : 0);
    const commentCount = item.comments?.length ?? 0;
    const firstComment = item.comments?.[0];
    const coverImage = item.images?.[0];

    return (
      <View style={styles.card}>
        {/* Poster row */}
        <View style={styles.posterRow}>
          <Image
            source={{ uri: item.posterAvatar }}
            style={styles.posterAvatar}
          />
          <View style={styles.posterInfo}>
            <Text style={styles.posterName}>{item.posterName}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}, {item.city}
              </Text>
            </View>
          </View>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </View>

        {/* Title + NEW */}
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Photo */}
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Category chip (no price on card) */}
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Likes / comments / share */}
        <View style={styles.engagementRow}>
          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => toggleLike(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#EF4444" : "#6B7280"}
            />
            <Text style={styles.engagementText}>{likesDisplay}</Text>
          </TouchableOpacity>

          <View style={styles.engagementBtn}>
            <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
            <Text style={styles.engagementText}>{commentCount}</Text>
          </View>

          <TouchableOpacity style={styles.engagementBtn} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={18} color="#6B7280" />
            <Text style={styles.engagementText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* First comment preview */}
        {firstComment ? (
          <View style={styles.commentPreview}>
            <Image
              source={{ uri: firstComment.userAvatar }}
              style={styles.commentAvatar}
            />
            <View style={styles.commentBody}>
              <Text style={styles.commentName}>{firstComment.userName}</Text>
              <Text style={styles.commentText} numberOfLines={2}>
                {firstComment.text}
              </Text>
            </View>
          </View>
        ) : null}

        {commentCount > 1 ? (
          <Text style={styles.viewMoreComments}>
            View {commentCount - 1} more comment{commentCount - 1 === 1 ? "" : "s"}
          </Text>
        ) : null}

        {/* Send Offer */}
        <TouchableOpacity
          style={styles.sendOfferBtn}
          activeOpacity={0.85}
          onPress={() => setOfferRequest(item)}
        >
          <Ionicons name="paper-plane" size={18} color="#fff" />
          <Text style={styles.sendOfferText}>Send Offer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Service requests</Text>
          <View style={styles.headerLocationRow}>
            <Ionicons name="location" size={13} color={GREEN} />
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {locationName || "All Nigeria"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/profile/createjob")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search service requests..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        {CATEGORY_FILTERS.map((cat) => {
          const active = categoryFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setCategoryFilter(cat)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={42} color="#aaa" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>
              No service requests in this area yet.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 28 }} />}
      />

      {/* Send Offer modal */}
      <Modal
        visible={!!offerRequest}
        transparent
        animationType="slide"
        onRequestClose={closeOffer}
      >
        <KeyboardAvoidingView
          style={styles.offerBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.offerBackdrop} onPress={closeOffer}>
            <Pressable style={styles.offerSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.offerHandle} />
              <Text style={styles.offerTitle}>Send Offer</Text>
              {offerRequest ? (
                <Text style={styles.offerSubtitle} numberOfLines={2}>
                  {offerRequest.title}
                </Text>
              ) : null}

              <Text style={styles.offerLabel}>Your price</Text>
              <View style={styles.offerField}>
                <Text style={styles.offerNaira}>₦</Text>
                <TextInput
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  placeholder="Enter amount"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  style={styles.offerInput}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.offerSubmitBtn,
                  !offerPrice.replace(/[^\d]/g, "") && styles.offerSubmitDisabled,
                ]}
                activeOpacity={0.85}
                disabled={!offerPrice.replace(/[^\d]/g, "")}
                onPress={submitOffer}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.offerSubmitText}>Send Offer</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },
  headerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#777",
    flex: 1,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  searchContainer: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    marginHorizontal: 8,
  },
  filtersScroll: {
    flexGrow: 0,
    maxHeight: 44,
    marginBottom: 8,
  },
  filtersContainer: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 4,
  },
  filterChipActive: {
    backgroundColor: GREEN,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fff",
  },
  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  posterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  posterInfo: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  posterName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    lineHeight: 22,
  },
  newBadge: {
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  coverImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: "#4B5563",
    marginBottom: 12,
  },
  engagementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  engagementBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  engagementText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  commentPreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  commentBody: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 17,
  },
  viewMoreComments: {
    fontSize: 12,
    color: GREEN,
    fontWeight: "600",
    marginBottom: 12,
    marginLeft: 36,
  },
  sendOfferBtn: {
    backgroundColor: GREEN,
    borderRadius: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendOfferText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
    color: "#111",
  },
  emptyText: {
    color: "#888",
    marginTop: 5,
    fontSize: 13,
    textAlign: "center",
  },
  offerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  offerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  offerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 14,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  offerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  offerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  offerField: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offerNaira: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  offerInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 12,
  },
  offerSubmitBtn: {
    backgroundColor: GREEN,
    borderRadius: 26,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  offerSubmitDisabled: {
    opacity: 0.45,
  },
  offerSubmitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
