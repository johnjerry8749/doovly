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
import { listServiceCategories } from "@/services/professionals";
import {
  addInAppNotification,
  getCurrentUserId,
} from "@/services/inAppNotifications";
import { useLocation } from "@/context/LocationContext";
import { NIGERIA_CITIES } from "@/data/cities";

const GREEN = "#159447";
const MY_AVATAR = require("@/assets/profile_1.jpg");

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
    return NIGERIA_CITIES.filter((c) => c.toLowerCase().includes(query));
  }, [citySearch]);

  // Same mock categories as Home/Services (listServiceCategories)
  const categoryFilters = useMemo(() => listServiceCategories(), []);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [extraComments, setExtraComments] = useState<
    Record<string, ServiceRequestComment[]>
  >({});
  const [offerRequest, setOfferRequest] = useState<ServiceRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [chatRequest, setChatRequest] = useState<ServiceRequest | null>(null);
  const [chatText, setChatText] = useState("");
  const [replyTo, setReplyTo] = useState<ServiceRequestComment | null>(null);
  const commentListRef = useRef<FlatList>(null);

  const allRequests = useMemo(() => listServiceRequests(), []);

  const getComments = (item: ServiceRequest): ServiceRequestComment[] => [
    ...(item.comments || []),
    ...(extraComments[item.id] || []),
  ];

  const matchesLocationCity = (itemCity: string, itemArea?: string) => {
    if (
      loadingLocation ||
      showAllNigeria ||
      !locationName ||
      locationName === "All Nigeria" ||
      locationName.toLowerCase().includes("unavailable") ||
      locationName.toLowerCase().includes("click here") ||
      locationName.toLowerCase().includes("getting")
    )
      return true;
    const city = locationName.split(",")[0].trim().toLowerCase();
    if (!city || city === "nigeria") return true;
    const c = itemCity.toLowerCase();
    const area = (itemArea || "").toLowerCase();
    return c.includes(city) || city.includes(c) || area.includes(city);
  };

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    const seen = new Set<string>();
    return allRequests.filter((req) => {
      if (seen.has(req.id)) return false;
      seen.add(req.id);
      const matchesSearch =
        !query ||
        req.title.toLowerCase().includes(query) ||
        req.category.toLowerCase().includes(query) ||
        req.location.toLowerCase().includes(query) ||
        req.city.toLowerCase().includes(query) ||
        req.description.toLowerCase().includes(query);
      const matchesLocation = matchesLocationCity(req.city, req.location);
      const matchesCategory = (() => {
        if (categoryFilter === "All") return true;
        const cat = categoryFilter.toLowerCase();
        const reqCat = (req.category || "").toLowerCase();
        const reqProf = (req.profession || "").toLowerCase();
        if (reqCat === cat || reqProf === cat) return true;
        if (reqCat.includes(cat) || reqProf.includes(cat)) return true;
        if (cat === "plumber" && (reqCat.includes("plumb") || reqProf.includes("plumb"))) return true;
        if (cat === "electrician" && (reqCat.includes("electric") || reqProf.includes("electric"))) return true;
        if (cat === "spa" && (reqCat.includes("massage") || reqProf.includes("massage") || reqCat.includes("spa"))) return true;
        if (cat === "nail tech" && (reqCat.includes("nail") || reqProf.includes("nail"))) return true;
        if (cat === "barber" && (reqCat.includes("barber") || reqProf.includes("barber") || reqCat.includes("hair"))) return true;
        if (cat === "mechanic" && (reqCat.includes("mechanic") || reqProf.includes("mechanic") || reqCat.includes("car"))) return true;
        return false;
      })();
      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [allRequests, search, categoryFilter, locationName, loadingLocation, showAllNigeria]);

  const toggleLike = (id: string) =>
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const shareRequest = async (item: ServiceRequest) => {
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n${item.category} @ ${item.location}, ${item.city}\n\n${item.description}\n\n— Shared from Doovly`,
      });
    } catch {}
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
    const body = replyTo ? `@${replyTo.userName} ${text}` : text;
    const newComment: ServiceRequestComment = {
      id: `local-${Date.now()}`,
      userName: "You",
      userAvatar: MY_AVATAR,
      text: body,
      timeAgo: "Just now",
    };
    setExtraComments((prev) => ({
      ...prev,
      [chatRequest.id]: [...(prev[chatRequest.id] || []), newComment],
    }));
    setChatText("");
    setReplyTo(null);
    setTimeout(() => commentListRef.current?.scrollToEnd({ animated: true }), 100);
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
    const comments = getComments(item);
    const commentCount = comments.length;
    const firstComment = comments[0];
    const coverImage = item.images?.[0];
    return (
      <View style={styles.card}>
        <View style={styles.posterRow}>
          <View style={styles.posterAvatarWrap}>
            <Image source={item.posterAvatar} style={styles.posterAvatar} />
            {item.posterVerified ? (
              <View style={styles.posterVerifiedBadge}>
                <Image
                  source={require("@/assets/premium/checkmark.png")}
                  style={styles.posterCheckmark}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </View>
          <View style={styles.posterInfo}>
            <View style={styles.posterNameRow}>
              <Text style={styles.posterName} numberOfLines={1}>
                {item.posterName}
              </Text>
              {item.posterVerified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={GREEN}
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="#6B7280" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}, {item.city}
              </Text>
            </View>
          </View>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        </View>
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
        {coverImage ? (
          <Image source={coverImage} style={styles.coverImage} resizeMode="cover" />
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
          >
            <Ionicons name="chatbubble-outline" size={18} color="#6B7280" />
            <Text style={styles.engagementText}>{commentCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => shareRequest(item)}
          >
            <Ionicons name="share-outline" size={18} color="#6B7280" />
            <Text style={styles.engagementText}>Share</Text>
          </TouchableOpacity>
        </View>
        {firstComment ? (
          <TouchableOpacity
            style={styles.commentPreview}
            onPress={() => openChat(item)}
          >
            <Image
              source={firstComment.userAvatar}
              style={styles.commentAvatar}
            />
            <View style={styles.commentBody}>
              <Text style={styles.commentName}>{firstComment.userName}</Text>
              <Text style={styles.commentText} numberOfLines={2}>
                {firstComment.text}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.writeCommentHint}
            onPress={() => openChat(item)}
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
          <TouchableOpacity onPress={() => openChat(item)}>
            <Text style={styles.viewMoreComments}>
              View {commentCount - 1} more comment
              {commentCount - 1 === 1 ? "" : "s"}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.sendOfferBtn}
          onPress={() => setOfferRequest(item)}
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
              <ActivityIndicator
                size="small"
                color={GREEN}
                style={{ marginLeft: 4 }}
              />
            ) : (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {locationName || "All Nigeria"}
              </Text>
            )}
            <Ionicons name="chevron-down" size={14} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/profile/createjob")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {categoryFilters.map((item) => {
            const active = categoryFilter === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setCategoryFilter(item.name)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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

      <Modal
        visible={!!chatRequest}
        transparent
        animationType="slide"
        onRequestClose={closeChat}
      >
        <KeyboardAvoidingView
          style={styles.cmBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.cmDim} onPress={closeChat} />
          <View style={styles.cmSheet}>
            <View style={styles.cmHandle} />
            <View style={styles.cmHeader}>
              <Text style={styles.cmHeaderTitle}>Comments</Text>
              <TouchableOpacity style={styles.cmCloseBtn} onPress={closeChat}>
                <Ionicons name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>
            <FlatList
              ref={commentListRef}
              data={chatComments}
              keyExtractor={(item) => item.id}
              renderItem={({ item: c }) => (
                <View style={styles.cmRow}>
                  <Image source={c.userAvatar} style={styles.cmAvatar} />
                  <View style={styles.cmContent}>
                    <Text style={styles.cmMeta}>
                      <Text style={styles.cmName}>{c.userName}</Text>
                      <Text style={styles.cmTime}>  {c.timeAgo}</Text>
                    </Text>
                    <Text style={styles.cmText}>{c.text}</Text>
                    <TouchableOpacity onPress={() => setReplyTo(c)}>
                      <Text style={styles.cmReply}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              style={styles.cmList}
              contentContainerStyle={
                chatComments.length === 0
                  ? styles.cmListEmptyContent
                  : styles.cmListContent
              }
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.cmEmpty}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={40}
                    color="#D1D5DB"
                  />
                  <Text style={styles.cmEmptyTitle}>No comments yet</Text>
                  <Text style={styles.cmEmptyText}>
                    Be the first to share your thoughts.
                  </Text>
                </View>
              }
            />
            {replyTo ? (
              <View style={styles.cmReplyBar}>
                <Text style={styles.cmReplyBarText} numberOfLines={1}>
                  Replying to{" "}
                  <Text style={styles.cmReplyBarName}>{replyTo.userName}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.cmInputRow}>
              <Image source={MY_AVATAR} style={styles.cmInputAvatar} />
              <TextInput
                style={styles.cmInput}
                placeholder={
                  replyTo
                    ? `Reply to ${replyTo.userName}…`
                    : "What do you think of this?"
                }
                placeholderTextColor="#9CA3AF"
                value={chatText}
                onChangeText={setChatText}
                multiline
                maxLength={500}
              />
              {chatText.trim() ? (
                <TouchableOpacity
                  style={styles.cmPostBtn}
                  onPress={sendChatMessage}
                >
                  <Text style={styles.cmPostText}>Post</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
            <Pressable
              style={styles.offerSheet}
              onPress={(e) => e.stopPropagation()}
            >
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
                  !offerPrice.replace(/[^\d]/g, "") &&
                    styles.offerSubmitDisabled,
                ]}
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

      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable
          style={styles.locOverlay}
          onPress={() => setShowLocationModal(false)}
        >
          <View style={styles.locSheet}>
            <View style={styles.locHandle} />
            <Text style={styles.locTitle}>Choose location</Text>
            <TouchableOpacity style={styles.locOption} onPress={getUserLocation}>
              <Ionicons name="navigate" size={24} color={GREEN} />
              <View style={styles.locOptionText}>
                <Text style={styles.locOptionTitle}>Use current location</Text>
                <Text style={styles.locOptionSub}>
                  Allow access to detect your position
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locOption}
              onPress={() => {
                setShowLocationModal(false);
                setShowCityPicker(true);
              }}
            >
              <Ionicons name="list-outline" size={24} color={GREEN} />
              <View style={styles.locOptionText}>
                <Text style={styles.locOptionTitle}>Select a city</Text>
                <Text style={styles.locOptionSub}>
                  Pick from popular cities in Nigeria
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locOption} onPress={viewAllInNigeria}>
              <Ionicons name="globe-outline" size={24} color={GREEN} />
              <View style={styles.locOptionText}>
                <Text style={styles.locOptionTitle}>View all in Nigeria</Text>
                <Text style={styles.locOptionSub}>
                  See requests from every city
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locCancel}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.locCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={closeCityPicker}
      >
        <View style={styles.locOverlay}>
          <View style={[styles.locSheet, styles.locCitySheet]}>
            <View style={styles.locHandle} />
            <Text style={styles.locTitle}>Select a city</Text>
            <View style={styles.locSearchBox}>
              <Ionicons name="search-outline" size={20} color="#888" />
              <TextInput
                style={styles.locSearchInput}
                placeholder="Filter cities..."
                placeholderTextColor="#888"
                value={citySearch}
                onChangeText={setCitySearch}
                autoCorrect={false}
              />
              {citySearch.length > 0 ? (
                <TouchableOpacity onPress={() => setCitySearch("")}>
                  <Ionicons name="close-circle" size={20} color="#aaa" />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.locCityList}
              ListEmptyComponent={
                <Text style={styles.locEmptyCities}>No city found.</Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locCityItem}
                  onPress={() => selectCity(item)}
                >
                  <Ionicons name="location-outline" size={20} color={GREEN} />
                  <Text style={styles.locCityItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.locCancel} onPress={closeCityPicker}>
              <Text style={styles.locCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111" },
  headerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: { fontSize: 13, color: "#777", flex: 1 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  searchContainer: {
    height: 46,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111",
    marginHorizontal: 8,
    paddingVertical: 0,
  },
  filtersWrap: { height: 44, marginBottom: 8 },
  filtersContent: { paddingHorizontal: 16, alignItems: "center", gap: 8 },
  filterChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  filterChipActive: { backgroundColor: GREEN },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20, gap: 14 },
  card: {
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#fff",
  },
  posterRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  posterAvatarWrap: { width: 40, height: 40, position: "relative" },
  posterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  posterVerifiedBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    zIndex: 2,
  },
  posterCheckmark: { width: 18, height: 18 },
  posterNameRow: { flexDirection: "row", alignItems: "center" },
  posterInfo: { flex: 1, marginLeft: 10, minWidth: 0 },
  posterName: { fontSize: 14, fontWeight: "700", color: "#111", flexShrink: 1 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  locationText: { fontSize: 12, color: "#6B7280", flex: 1 },
  timeAgo: { fontSize: 11, color: "#9CA3AF", marginLeft: 8 },
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
  newBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  coverImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginBottom: 10,
  },
  metaRow: { flexDirection: "row", marginBottom: 8 },
  categoryChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
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
  engagementBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  engagementText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
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
  commentText: { fontSize: 12, color: "#4B5563", lineHeight: 17 },
  viewMoreComments: {
    fontSize: 12,
    color: GREEN,
    fontWeight: "600",
    marginBottom: 12,
    marginLeft: 36,
  },
  writeCommentHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  writeCommentHintText: { fontSize: 13, color: GREEN, fontWeight: "600" },
  sendOfferBtn: {
    backgroundColor: GREEN,
    borderRadius: 24,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendOfferText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyContainer: { alignItems: "center", paddingVertical: 60 },
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
  cmBackdrop: { flex: 1, justifyContent: "flex-end" },
  cmDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cmSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "78%",
    minHeight: "55%",
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  cmHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  cmHeader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  cmHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  cmCloseBtn: {
    position: "absolute",
    right: 14,
    top: 8,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  cmList: { flexGrow: 1 },
  cmListContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  cmListEmptyContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },
  cmEmpty: { alignItems: "center", paddingVertical: 40 },
  cmEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginTop: 12,
  },
  cmEmptyText: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
  cmRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  cmAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    marginRight: 12,
  },
  cmContent: { flex: 1, minWidth: 0 },
  cmMeta: { marginBottom: 2 },
  cmName: { fontSize: 13, fontWeight: "700", color: "#111" },
  cmTime: { fontSize: 12, color: "#9CA3AF" },
  cmText: { fontSize: 14, color: "#1F2937", lineHeight: 20 },
  cmReply: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 6,
  },
  cmReplyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  cmReplyBarText: { fontSize: 13, color: "#6B7280", flex: 1 },
  cmReplyBarName: { fontWeight: "700", color: "#111" },
  cmInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  cmInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    marginBottom: 4,
  },
  cmInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: "#111",
    paddingVertical: 10,
  },
  cmPostBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  cmPostText: { fontSize: 15, fontWeight: "700", color: GREEN },
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
  offerNaira: { fontSize: 16, color: "#9CA3AF", fontWeight: "600" },
  offerInput: { flex: 1, fontSize: 16, color: "#111827", paddingVertical: 12 },
  offerSubmitBtn: {
    backgroundColor: GREEN,
    borderRadius: 26,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  offerSubmitDisabled: { opacity: 0.45 },
  offerSubmitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  locOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  locSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
  },
  locCitySheet: { maxHeight: "80%" },
  locHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 16,
  },
  locTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 18,
  },
  locOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  locOptionText: { marginLeft: 14, flex: 1 },
  locOptionTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  locOptionSub: { fontSize: 12, color: "#777", marginTop: 2 },
  locCancel: { marginTop: 16, alignItems: "center", paddingVertical: 12 },
  locCancelText: { fontSize: 15, fontWeight: "600", color: "#888" },
  locSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  locSearchInput: { flex: 1, fontSize: 15, color: "#111", marginLeft: 8 },
  locCityList: { maxHeight: 320 },
  locCityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  locCityItemText: { flex: 1, fontSize: 15, color: "#111", marginLeft: 12 },
  locEmptyCities: {
    textAlign: "center",
    color: "#888",
    marginTop: 30,
    fontSize: 14,
  },
});
