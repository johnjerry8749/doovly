import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
  type ServiceRequestComment,
} from "@/services/serviceRequests";
import { listProfessionals } from "@/services/professionals";
import {
  getCurrentUserId,
  addInAppNotification,
} from "@/services/inAppNotifications";
import { SERVICE_CATEGORIES } from "@/data/serviceCategories";
import { NIGERIA_CITIES } from "@/data/cities";
import { useLocation } from "@/context/LocationContext";
import CreateJobModal from "@/components/CreateJobModal";
import RequestImageSlider from "@/components/RequestImageSlider";

const GREEN = "#159447";
const MY_AVATAR = require("@/assets/profile_1.jpg");

const CATEGORY_FILTERS = [
  "All",
  ...SERVICE_CATEGORIES.map((category) => category.name),
];

type RequestWithUser = ServiceRequest & {
  userId?: string | number;
  posterUserId?: string | number;
  posterId?: string | number;
  createdByUserId?: string | number;
  professionalId?: string | number;
};

type CommentWithUser = ServiceRequestComment & {
  userId?: string | number;
  createdByUserId?: string | number;
  authorId?: string | number;
  posterUserId?: string | number;
  professionalId?: string | number;
};

const normalize = (value?: string | number | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const categoryMatches = (request: ServiceRequest, selectedCategory: string) => {
  if (selectedCategory === "All") return true;
  const selected = normalize(selectedCategory);
  const requestCategories = [request.category, request.profession]
    .filter(Boolean)
    .map((value) => normalize(value));
  return requestCategories.some(
    (value) =>
      value === selected ||
      value.includes(selected) ||
      selected.includes(value),
  );
};

const getRequestUserId = (
  request: ServiceRequest,
): string | number | undefined => {
  const item = request as RequestWithUser;
  return (
    item.professionalId ??
    item.posterUserId ??
    item.posterId ??
    item.createdByUserId ??
    item.userId
  );
};

const getCommentUserId = (
  comment: ServiceRequestComment,
): string | number | undefined => {
  const item = comment as CommentWithUser;
  return (
    item.professionalId ??
    item.userId ??
    item.createdByUserId ??
    item.authorId ??
    item.posterUserId
  );
};

const findProfessionalForUser = (
  userId?: string | number | null,
  userName?: string | null,
) => {
  const professionals = listProfessionals();
  if (!professionals?.length) return undefined;
  const normalizedUserId = normalize(userId);
  const normalizedUserName = normalize(userName);
  if (normalizedUserId) {
    const byProfessionalId = professionals.find(
      (p) => normalize(p.id) === normalizedUserId,
    );
    if (byProfessionalId) return byProfessionalId;
    const byUserId = professionals.find((p) => {
      const person = p as typeof p & {
        userId?: string | number;
        profileId?: string | number;
      };
      return (
        normalize(person.userId) === normalizedUserId ||
        normalize(person.profileId) === normalizedUserId
      );
    });
    if (byUserId) return byUserId;
  }
  if (normalizedUserName) {
    return professionals.find((p) => normalize(p.name) === normalizedUserName);
  }
  return undefined;
};

const openUserProfile = ({
  userId,
  userName,
}: {
  userId?: string | number | null;
  userName?: string | null;
}) => {
  const professional = findProfessionalForUser(userId, userName);
  if (!professional) return;
  router.push({
    pathname: "/professional/[id]",
    params: { id: String(professional.id), from: "requests" },
  });
};

export default function RequestsScreen() {
  const {
    locationName,
    loadingLocation,
    showAllNigeria,
    showLocationModal,
    setShowLocationModal,
    showCityPicker,
    setShowCityPicker,
    citySearch,
    setCitySearch,
    getUserLocation,
    selectCity,
    viewAllInNigeria,
    closeCityPicker,
  } = useLocation();

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();
    if (!query) return [...NIGERIA_CITIES];
    return NIGERIA_CITIES.filter((city) =>
      city.toLowerCase().includes(query),
    );
  }, [citySearch]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [extraComments, setExtraComments] = useState<
    Record<string, ServiceRequestComment[]>
  >({});
  const [allRequests, setAllRequests] = useState(() => listServiceRequests());
  const [createVisible, setCreateVisible] = useState(false);
  const [offerRequest, setOfferRequest] = useState<ServiceRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [chatRequest, setChatRequest] = useState<ServiceRequest | null>(null);
  const [chatText, setChatText] = useState("");
  const [replyTo, setReplyTo] = useState<ServiceRequestComment | null>(null);
  const commentListRef = useRef<FlatList<ServiceRequestComment>>(null);

  const refreshRequests = () => setAllRequests(listServiceRequests());

  const getComments = (item: ServiceRequest): ServiceRequestComment[] => [
    ...(item.comments || []),
    ...(extraComments[item.id] || []),
  ];

  const matchesLocationCity = (itemCity?: string, itemArea?: string) => {
    if (
      loadingLocation ||
      showAllNigeria ||
      !locationName ||
      locationName === "All Nigeria" ||
      locationName.toLowerCase().includes("unavailable") ||
      locationName.toLowerCase().includes("click here") ||
      locationName.toLowerCase().includes("getting")
    ) {
      return true;
    }
    const city = locationName.split(",")[0].trim().toLowerCase();
    if (!city || city === "nigeria") return true;
    const requestCity = normalize(itemCity);
    const requestArea = normalize(itemArea);
    if (!requestCity && !requestArea) return true;
    return (
      requestCity.includes(city) ||
      city.includes(requestCity) ||
      requestArea.includes(city)
    );
  };

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const seen = new Set<string>();
    return allRequests.filter((request) => {
      const req = request as RequestWithUser;
      if (seen.has(req.id)) return false;
      seen.add(req.id);
      const matchesSearch =
        !query ||
        normalize(req.title).includes(query) ||
        normalize(req.category).includes(query) ||
        normalize(req.profession).includes(query) ||
        normalize(req.location).includes(query) ||
        normalize(req.city).includes(query) ||
        normalize(req.description).includes(query) ||
        normalize(req.posterName).includes(query);
      return (
        matchesSearch &&
        categoryMatches(req, categoryFilter) &&
        matchesLocationCity(req.city, req.location)
      );
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

  const shareRequest = async (item: ServiceRequest) => {
    try {
      await Share.share({
        title: item.title,
        message:
          `${item.title}\n` +
          `${item.category} @ ${item.location}, ${item.city}\n\n` +
          `${item.description}\n\n` +
          "— Shared from Doovly",
      });
    } catch {
      // cancelled
    }
  };

  const openChat = (item: ServiceRequest) => {
    setChatRequest(item);
    setChatText("");
    setReplyTo(null);
  };

  const closeChat = () => {
    setChatRequest(null);
    setChatText("");
    setReplyTo(null);
  };

  const sendChatMessage = () => {
    if (!chatRequest) return;
    const text = chatText.trim();
    if (!text) return;
    const currentUserId = getCurrentUserId();
    const body = replyTo ? `@${replyTo.userName} ${text}` : text;
    const currentProfessional = findProfessionalForUser(currentUserId);
    const newComment: CommentWithUser = {
      id: `local-${Date.now()}`,
      userName: currentProfessional?.name || "You",
      userAvatar: currentProfessional?.image || MY_AVATAR,
      text: body,
      timeAgo: "Just now",
      userId: currentProfessional?.id ?? currentUserId,
    };
    setExtraComments((prev) => ({
      ...prev,
      [chatRequest.id]: [...(prev[chatRequest.id] || []), newComment],
    }));
    setChatText("");
    setReplyTo(null);
    setTimeout(() => {
      commentListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const closeOffer = () => {
    setOfferRequest(null);
    setOfferPrice("");
  };

  const submitOffer = () => {
    if (!offerRequest) return;
    const amount = offerPrice.replace(/[^\d]/g, "");
    if (!amount) return;
    const request = offerRequest as RequestWithUser;
    const currentUserId = getCurrentUserId();
    const recipientId =
      request.createdByUserId &&
      String(request.createdByUserId) !== String(currentUserId)
        ? request.createdByUserId
        : currentUserId;
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
    const likesDisplay = (item.likesCount || 0) + (liked ? 1 : 0);
    const comments = getComments(item);
    const commentCount = comments.length;
    const firstComment = comments[0];
    const posterUserId = getRequestUserId(item);

    const openPosterProfile = () => {
      openUserProfile({ userId: posterUserId, userName: item.posterName });
    };

    const openFirstCommentProfile = () => {
      if (!firstComment) return;
      openUserProfile({
        userId: getCommentUserId(firstComment),
        userName: firstComment.userName,
      });
    };

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.posterRow}
          activeOpacity={0.75}
          onPress={openPosterProfile}
        >
          <View style={styles.posterAvatarWrap}>
            <Image source={item.posterAvatar} style={styles.posterAvatar} />
          </View>
          <View style={styles.posterInfo}>
            <Text style={styles.posterName} numberOfLines={1}>
              {item.posterName}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}, {item.city}
              </Text>
            </View>
          </View>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          ) : null}
        </View>

        {item.images?.length ? (
          <RequestImageSlider images={item.images} height={180} />
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

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

          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => openChat(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
            <Text style={styles.engagementText}>{commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => shareRequest(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={18} color="#6B7280" />
            <Text style={styles.engagementText}>Share</Text>
          </TouchableOpacity>
        </View>

        {firstComment ? (
          <View style={styles.commentPreview}>
            <TouchableOpacity activeOpacity={0.75} onPress={openFirstCommentProfile}>
              <Image
                source={firstComment.userAvatar}
                style={styles.commentAvatar}
              />
            </TouchableOpacity>
            <View style={styles.commentBody}>
              <TouchableOpacity activeOpacity={0.75} onPress={openFirstCommentProfile}>
                <Text style={styles.commentName}>{firstComment.userName}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => openChat(item)}>
                <Text style={styles.commentText} numberOfLines={2}>
                  {firstComment.text}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.writeCommentHint}
            onPress={() => openChat(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={16}
              color={GREEN}
            />
            <Text style={styles.writeCommentHintText}>Write a comment…</Text>
          </TouchableOpacity>
        )}

        {commentCount > 1 ? (
          <TouchableOpacity onPress={() => openChat(item)} activeOpacity={0.7}>
            <Text style={styles.viewMoreComments}>
              View {commentCount - 1} more comment
              {commentCount - 1 === 1 ? "" : "s"}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.sendOfferBtn}
          onPress={() => setOfferRequest(item)}
          activeOpacity={0.85}
        >
          <Ionicons name="paper-plane" size={18} color="#fff" />
          <Text style={styles.sendOfferText}>Send Offer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const chatComments = chatRequest ? getComments(chatRequest) : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Service requests</Text>
          <TouchableOpacity
            style={styles.headerLocationRow}
            onPress={() => setShowLocationModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location" size={14} color={GREEN} />
            {loadingLocation ? (
              <ActivityIndicator size="small" color={GREEN} style={{ marginLeft: 5 }} />
            ) : (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {locationName || "All Nigeria"}
              </Text>
            )}
            <Ionicons name="chevron-down" size={14} color="#6B7280" style={styles.dropdownIcon} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setCreateVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
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
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={42} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>Try another filter or create a job.</Text>
          </View>
        }
      />

      <CreateJobModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSaved={() => {
          refreshRequests();
          setCreateVisible(false);
        }}
      />

      {/* Offer modal */}
      <Modal visible={!!offerRequest} transparent animationType="slide" onRequestClose={closeOffer}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={closeOffer}>
            <Pressable style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Send Offer</Text>
              <Text style={styles.modalSub} numberOfLines={2}>
                {offerRequest?.title}
              </Text>
              <View style={styles.offerField}>
                <Text style={styles.naira}>₦</Text>
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
                style={[styles.sendOfferBtn, !offerPrice.replace(/\D/g, "") && { opacity: 0.5 }]}
                disabled={!offerPrice.replace(/\D/g, "")}
                onPress={submitOffer}
                activeOpacity={0.85}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.sendOfferText}>Send Offer</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments modal */}
      <Modal visible={!!chatRequest} transparent animationType="slide" onRequestClose={closeChat}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.chatSheet}>
            <View style={styles.chatHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {chatRequest?.title}
              </Text>
              <TouchableOpacity onPress={closeChat}>
                <Ionicons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>
            <FlatList
              ref={commentListRef}
              data={chatComments}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ padding: 16, flexGrow: 1 }}
              renderItem={({ item: c }) => (
                <View style={styles.chatBubble}>
                  <Image source={c.userAvatar} style={styles.commentAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentName}>{c.userName}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                    <Text style={styles.timeAgo}>{c.timeAgo}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No comments yet. Be the first.</Text>
              }
            />
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Write a comment..."
                placeholderTextColor="#9CA3AF"
                value={chatText}
                onChangeText={setChatText}
                multiline
              />
              <TouchableOpacity onPress={sendChatMessage} activeOpacity={0.8}>
                <Ionicons name="send" size={22} color={GREEN} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Location modals simplified via existing handlers */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLocationModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose location</Text>
            <TouchableOpacity style={styles.locOption} onPress={getUserLocation}>
              <Ionicons name="navigate" size={22} color={GREEN} />
              <Text style={styles.locOptionText}>Use current location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locOption}
              onPress={() => {
                setShowLocationModal(false);
                setShowCityPicker(true);
              }}
            >
              <Ionicons name="list-outline" size={22} color={GREEN} />
              <Text style={styles.locOptionText}>Select a city</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locOption} onPress={viewAllInNigeria}>
              <Ionicons name="globe-outline" size={22} color={GREEN} />
              <Text style={styles.locOptionText}>View all in Nigeria</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showCityPicker} transparent animationType="slide" onRequestClose={closeCityPicker}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "70%" }]}>
            <Text style={styles.modalTitle}>Select a city</Text>
            <TextInput
              style={styles.citySearch}
              placeholder="Filter cities..."
              placeholderTextColor="#9CA3AF"
              value={citySearch}
              onChangeText={setCitySearch}
            />
            <FlatList
              data={filteredCities}
              keyExtractor={(c) => c}
              renderItem={({ item: city }) => (
                <TouchableOpacity style={styles.locOption} onPress={() => selectCity(city)}>
                  <Ionicons name="location-outline" size={20} color={GREEN} />
                  <Text style={styles.locOptionText}>{city}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={closeCityPicker} style={{ paddingVertical: 12 }}>
              <Text style={{ textAlign: "center", color: "#6B7280", fontWeight: "600" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerLocationRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 },
  headerSubtitle: { fontSize: 13, color: "#6B7280", maxWidth: 180 },
  dropdownIcon: { marginLeft: 2 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#111" },
  filtersRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: "#DCFCE7" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: GREEN },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  posterRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  posterAvatarWrap: { marginRight: 10 },
  posterAvatar: { width: 40, height: 40, borderRadius: 20 },
  posterInfo: { flex: 1, minWidth: 0 },
  posterName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  locationText: { fontSize: 12, color: "#6B7280", flex: 1 },
  timeAgo: { fontSize: 11, color: "#9CA3AF" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111827" },
  newBadge: {
    backgroundColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  newBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  metaRow: { marginBottom: 8 },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: GREEN },
  description: { fontSize: 14, color: "#4B5563", lineHeight: 20, marginBottom: 10 },
  engagementRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  engagementBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  engagementText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  commentPreview: { flexDirection: "row", gap: 8, marginBottom: 8 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentBody: { flex: 1 },
  commentName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  commentText: { fontSize: 13, color: "#4B5563", marginTop: 2 },
  writeCommentHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  writeCommentHintText: { fontSize: 13, color: GREEN, fontWeight: "600" },
  viewMoreComments: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 10,
  },
  sendOfferBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendOfferText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 10 },
  emptyText: { fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
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
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 6 },
  modalSub: { fontSize: 13, color: "#6B7280", marginBottom: 14 },
  offerField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  naira: { fontSize: 16, color: "#9CA3AF", marginRight: 6 },
  offerInput: { flex: 1, fontSize: 16, color: "#111", paddingVertical: 12 },
  chatSheet: {
    flex: 1,
    marginTop: 80,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  chatBubble: { flexDirection: "row", gap: 10, marginBottom: 14 },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#111",
  },
  locOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  locOptionText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  citySearch: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
    color: "#111",
  },
});
