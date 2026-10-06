import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from "@/lib/supabase";

import {
  listServiceRequests,
  canSendOfferOnRequest,
  submitServiceRequestOffer,
  addServiceRequestComment,
  deleteServiceRequestComment,
  likeServiceRequest,
  type ServiceRequest,
  type ServiceRequestComment,
} from "@/services/serviceRequests";
import {
  getCurrentUserId,
} from "@/services/inAppNotifications";
import { createOfferConversationAsync } from "@/services/chat";
import { getLoggedInProfessionalId } from "@/services/savedProviders";
import {
  listProfessionals,
  listProfessionalsAsync,
  getProfessionalById,
} from "@/services/professionals";
import { SERVICE_CATEGORIES } from "@/data/serviceCategories";
import { NIGERIA_CITIES } from "@/data/cities";
import { useLocation } from "@/context/LocationContext";
import CreateJobModal from "@/components/CreateJobModal";
import RequestImageSlider from "@/components/RequestImageSlider";

const GREEN = "#159447";
const MY_AVATAR = require("@/assets/profile_1.jpg");
const CATEGORY_FILTERS = ["All", ...SERVICE_CATEGORIES.map((c) => c.name)];
const PROFILE_NAV_COOLDOWN_MS = 4500;

const normalize = (value?: string | number | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const categoryMatches = (request: ServiceRequest, selected: string) => {
  if (selected === "All") return true;
  const sel = normalize(selected);
  return [request.category, request.profession]
    .filter(Boolean)
    .map(normalize)
    .some((v) => v === sel || v.includes(sel) || sel.includes(v));
};

const getRequestUserId = (request: ServiceRequest) => {
  const r = request as ServiceRequest & {
    professionalId?: string | number;
    posterUserId?: string | number;
    posterId?: string | number;
    createdByUserId?: string | number;
    userId?: string | number;
  };
  return (
    r.professionalId ??
    r.posterUserId ??
    r.posterId ??
    r.createdByUserId ??
    r.userId
  );
};

const getCommentUserId = (comment: ServiceRequestComment) => {
  const c = comment as ServiceRequestComment & {
    professionalId?: string | number;
    userId?: string | number;
    authUserId?: string | number;
    createdByUserId?: string | number;
    authorId?: string | number;
    posterUserId?: string | number;
  };
  return (
    c.professionalId ??
    c.authUserId ??
    c.userId ??
    c.createdByUserId ??
    c.authorId
  );
};

const findProfessionalForUser = (
  userId?: string | number | null,
  userName?: string | null,
  professionals = listProfessionals(),
) => {
  if (!professionals.length) return undefined;

  const id = normalize(userId);
  const name = normalize(userName);

  if (id) {
    const baseId = id.replace(/^[up]/, "");
    const variants = [id, baseId, `u${baseId}`, `p${baseId}`];
    const byId = professionals.find((p) => variants.includes(normalize(p.id)));
    if (byId) return byId;

    const byUser = professionals.find((p) => {
      const extra = p as typeof p & {
        userId?: string | number;
        profileId?: string | number;
      };
      return variants.some(
        (v) =>
          normalize(extra.userId) === v || normalize(extra.profileId) === v,
      );
    });
    if (byUser) return byUser;
  }

  if (name) return professionals.find((p) => normalize(p.name) === name);
  return undefined;
};

let lastProfileNavAt = 0;

const openUserProfile = async ({
  userId,
  userName,
  beforeNavigate,
}: {
  userId?: string | number | null;
  userName?: string | null;
  beforeNavigate?: () => void;
}) => {
  const now = Date.now();
  if (now - lastProfileNavAt < PROFILE_NAV_COOLDOWN_MS) return;

  let professionals;
  try {
    professionals = await listProfessionalsAsync();
  } catch {
    return;
  }

  const professional = findProfessionalForUser(userId, userName, professionals);
  if (!professional) return;

  lastProfileNavAt = now;
  beforeNavigate?.();
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

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [allRequests, setAllRequests] = useState(() => listServiceRequests());
  const [createVisible, setCreateVisible] = useState(false);
  const [offerRequest, setOfferRequest] = useState<ServiceRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [chatRequest, setChatRequest] = useState<ServiceRequest | null>(null);
  const [chatText, setChatText] = useState("");
  const commentListRef = useRef<FlatList<ServiceRequestComment>>(null);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return [...NIGERIA_CITIES];
    return NIGERIA_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [citySearch]);

  const matchesLocationCity = (itemCity?: string, itemArea?: string) => {
    if (
      loadingLocation ||
      showAllNigeria ||
      !locationName ||
      locationName === "All Nigeria" ||
      /unavailable|click here|getting/i.test(locationName)
    ) {
      return true;
    }
    const city = locationName.split(",")[0].trim().toLowerCase();
    if (!city || city === "nigeria") return true;
    const reqCity = normalize(itemCity);
    const reqArea = normalize(itemArea);
    if (!reqCity && !reqArea) return true;
    return (
      reqCity.includes(city) ||
      city.includes(reqCity) ||
      reqArea.includes(city)
    );
  };

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const seen = new Set<string>();

    return allRequests.filter((req) => {
      if (seen.has(req.id)) return false;
      seen.add(req.id);

      const matchesSearch =
        !q ||
        [
          req.title,
          req.category,
          req.profession,
          req.location,
          req.city,
          req.description,
          req.posterName,
        ].some((f) => normalize(f).includes(q));

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

  const getComments = (item: ServiceRequest): ServiceRequestComment[] =>
    item.comments || [];

  const refreshRequests = () => setAllRequests(listServiceRequests());

  const toggleLike = async (id: string) => {
    const liked = !likedIds[id];
    setLikedIds((prev) => ({ ...prev, [id]: liked }));

    try {
      await likeServiceRequest(id, liked);

      if (liked) {
        const request = allRequests.find((item) => item.id === id);
        const currentUserId = getCurrentUserId();
        if (request && String(request.createdByUserId) !== String(currentUserId)) {
          void supabase.functions.invoke("send-booking-notification", {
            body: {
              kind: "like",
              requestId: id,
              title: "Request Liked",
              message: "Someone liked your service request.",
              data: { type: "like", screen: "requests", requestId: id },
            },
          });
        }
      }
    } catch {
      setLikedIds((prev) => ({ ...prev, [id]: !liked }));
    }
  };

  const shareRequest = async (item: ServiceRequest) => {
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n${item.category} @ ${item.location}, ${item.city}\n\n${item.description}\n\n— Shared from Doovly`,
      });
    } catch {
      // cancelled
    }
  };

  const openChat = (item: ServiceRequest) => {
    setChatRequest(item);
    setChatText("");
  };

  const closeChat = () => {
    setChatRequest(null);
    setChatText("");
  };

  const deleteComment = (requestId: string, comment: ServiceRequestComment) => {
    if (!requestId || !comment.userId || comment.userId !== getCurrentUserId()) return;

    Alert.alert("Delete comment?", "This comment will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const deleted = await deleteServiceRequestComment(comment.id);
            if (!deleted) {
              Alert.alert("Could not delete comment", "Please try again.");
              return;
            }

            const removeComment = (request: ServiceRequest) =>
              request.id === requestId
                ? { ...request, comments: request.comments.filter((entry) => entry.id !== comment.id) }
                : request;

            setAllRequests((current) => current.map(removeComment));
            setChatRequest((current) => current?.id === requestId ? removeComment(current) : current);
          } catch {
            Alert.alert("Could not delete comment", "Please try again.");
          }
        },
      },
    ]);
  };

  const sendChatMessage = async () => {
    if (!chatRequest) return;
    const text = chatText.trim();
    if (!text) return;

    const currentUserId = getCurrentUserId();
    const currentProfessional = findProfessionalForUser(currentUserId);
    const optimistic = {
      id: `local-${Date.now()}`,
      userId: currentUserId,
      userName: currentProfessional?.name || "You",
      userAvatar: currentProfessional?.image || MY_AVATAR,
      text,
      time: "Just now",
    } as ServiceRequestComment;

    const previousRequest = chatRequest;
    setChatText("");
    setChatRequest({
      ...chatRequest,
      comments: [...(chatRequest.comments || []), optimistic],
    });
    setAllRequests((current) =>
      current.map((request) =>
        request.id === chatRequest.id
          ? { ...request, comments: [...(request.comments || []), optimistic] }
          : request,
      ),
    );

    try {
      const comment = await addServiceRequestComment({
        requestId: chatRequest.id,
        text,
        userName: currentProfessional?.name || "You",
        userAvatar: currentProfessional?.image || MY_AVATAR,
      });

      if (!comment) throw new Error("Comment could not be posted.");

      setAllRequests((current) =>
        current.map((request) =>
          request.id === previousRequest.id
            ? { ...request, comments: [...(request.comments || []).filter((x) => x.id !== optimistic.id), comment] }
            : request,
        ),
      );
      setChatRequest((current) =>
        current?.id === previousRequest.id
          ? { ...current, comments: [...(current.comments || []).filter((x) => x.id !== optimistic.id), comment] }
          : current,
      );
      requestAnimationFrame(() => commentListRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setAllRequests((current) =>
        current.map((request) =>
          request.id === previousRequest.id
            ? { ...request, comments: (request.comments || []).filter((x) => x.id !== optimistic.id) }
            : request,
        ),
      );
      setChatRequest((current) =>
        current?.id === previousRequest.id
          ? { ...current, comments: (current.comments || []).filter((x) => x.id !== optimistic.id) }
          : current,
      );
      Alert.alert("Could not post comment", "Please try again.");
    }
  };

  const closeOffer = () => {
    setOfferRequest(null);
    setOfferPrice("");
  };

  const submitOffer = async () => {
    if (!offerRequest) return;
    const amountNum = Number(offerPrice.replace(/[^\d]/g, ""));
    if (!amountNum) return;

    const result = await submitServiceRequestOffer({
      requestId: offerRequest.id,
      amount: amountNum,
    });

    if (!result?.ok) {
      const messages: Record<string, string> = {
        own: "You cannot send an offer on your own request.",
        already: "You already sent an offer on this request.",
        full: "This request is no longer accepting offers.",
      };
      Alert.alert(
        result?.reason === "own" ? "Not allowed" : result?.reason === "already" ? "Already sent" : "Error",
        messages[result?.reason ?? ""] || "Could not send offer. Try again.",
      );
      return;
    }


    const offererProId = getLoggedInProfessionalId() ?? getCurrentUserId();
    const offererPro = getProfessionalById(String(offererProId));
    const locationLabel = [offerRequest.location, offerRequest.city]
      .filter(Boolean)
      .join(", ");

    const conv = await createOfferConversationAsync({
      requestId: offerRequest.id,
      requestTitle: offerRequest.title,
      requestCategory: offerRequest.category,
      requestLocation: locationLabel,
      requestDescription: offerRequest.description,
      amount: amountNum,
      requestOwnerId: String(
        offerRequest.createdByUserId ?? result.recipientUserId,
      ),
      requestOwnerName: offerRequest.posterName || "Provider",
      requestOwnerImage: offerRequest.posterAvatar as number,
      offererProfessionalId: String(offererProId),
      offererName: offererPro?.name ?? "You",
      offererImage:
        (offererPro?.image as number) ??
        (require("@/assets/profile_1.jpg") as number),
    });

    setAllRequests(listServiceRequests());
    closeOffer();
    router.push({ pathname: "/chat/[id]", params: { id: conv.id } });
  };

  const renderOfferButton = (item: ServiceRequest) => {
    const check = canSendOfferOnRequest(item);
    if (!check.ok) {
      if (check.reason === "already") {
        return (
          <View style={[styles.sendOfferBtn, { opacity: 0.55 }]}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.sendOfferText}>Offer sent</Text>
          </View>
        );
      }
      return null;
    }
    return (
      <TouchableOpacity
        style={styles.sendOfferBtn}
        onPress={() => setOfferRequest(item)}
        activeOpacity={0.85}
      >
        <Ionicons name="paper-plane" size={18} color="#fff" />
        <Text style={styles.sendOfferText}>Send Offer</Text>
      </TouchableOpacity>
    );
  };

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const liked = !!likedIds[item.id];
    const likesDisplay = (item.likesCount || 0) + (liked ? 1 : 0);
    const comments = getComments(item);
    const commentCount = comments.length;
    const firstComment = comments[0];
    const posterUserId = getRequestUserId(item);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.posterRow}
          activeOpacity={0.75}
          onPress={() =>
            openUserProfile({ userId: posterUserId, userName: item.posterName })
          }
        >
          <Image source={item.posterAvatar} style={styles.posterAvatar} />
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
          <RequestImageSlider images={item.images} height={180} borderRadius={0} />
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
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                openUserProfile({
                  userId: getCommentUserId(firstComment),
                  userName: firstComment.userName,
                })
              }
            >
              <Image source={firstComment.userAvatar} style={styles.commentAvatar} />
            </TouchableOpacity>
            <View style={styles.commentBody}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() =>
                  openUserProfile({
                    userId: getCommentUserId(firstComment),
                    userName: firstComment.userName,
                  })
                }
              >
                <Text style={styles.commentName}>{firstComment.userName}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openChat(item)}
                onLongPress={() => deleteComment(item.id, firstComment)}
                delayLongPress={450}
              >
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
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={GREEN} />
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

        {renderOfferButton(item)}
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

      <View style={styles.topControls}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersRow}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORY_FILTERS.map((category) => {
            const active = categoryFilter === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setCategoryFilter(category)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {category}
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>Try another category or location.</Text>
          </View>
        }
      />

      <CreateJobModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={() => {
          setCreateVisible(false);
          refreshRequests();
        }}
      />

      {/* Offer modal */}
      <Modal visible={!!offerRequest} transparent animationType="slide" onRequestClose={closeOffer}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={closeOffer}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
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
                onPress={submitOffer}
                disabled={!offerPrice.replace(/\D/g, "")}
                activeOpacity={0.85}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.sendOfferText}>Send Offer</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments modal (half screen) */}
      <Modal visible={!!chatRequest} transparent animationType="slide" onRequestClose={closeChat}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={closeChat}>
            <Pressable style={styles.commentModalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.commentModalHandle} />
              <Text style={styles.modalTitle}>Comments</Text>
              <FlatList
                ref={commentListRef}
                data={chatComments}
                keyExtractor={(c) => c.id}
                style={styles.commentList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: c }) => (
                  <View style={styles.commentRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() =>
                        openUserProfile({
                          userId: getCommentUserId(c),
                          userName: c.userName,
                          beforeNavigate: closeChat,
                        })
                      }
                    >
                      <Image source={c.userAvatar} style={styles.commentAvatar} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() =>
                          openUserProfile({
                            userId: getCommentUserId(c),
                            userName: c.userName,
                            beforeNavigate: closeChat,
                          })
                        }
                      >
                        <Text style={styles.commentName}>{c.userName}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={1}
                        onLongPress={() => deleteComment(chatRequest?.id ?? "", c)}
                        delayLongPress={450}
                      >
                        <Text style={styles.commentText}>{c.text}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment…"
                  placeholderTextColor="#9CA3AF"
                  value={chatText}
                  onChangeText={setChatText}
                />
                <TouchableOpacity onPress={sendChatMessage} style={styles.commentSend}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Location modal */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowLocationModal(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Location</Text>
            <TouchableOpacity style={styles.locOption} onPress={getUserLocation}>
              <Ionicons name="navigate" size={20} color={GREEN} />
              <Text style={styles.locOptionText}>Use my location</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locOption}
              onPress={() => {
                setShowLocationModal(false);
                setShowCityPicker(true);
              }}
            >
              <Ionicons name="business" size={20} color={GREEN} />
              <Text style={styles.locOptionText}>Choose city</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.locOption} onPress={viewAllInNigeria}>
              <Ionicons name="globe" size={20} color={GREEN} />
              <Text style={styles.locOptionText}>All Nigeria</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* City picker */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closeCityPicker}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select city</Text>
            <TextInput
              style={styles.citySearch}
              placeholder="Search city…"
              placeholderTextColor="#9CA3AF"
              value={citySearch}
              onChangeText={setCitySearch}
            />
            <FlatList
              data={filteredCities}
              keyExtractor={(c) => c}
              style={{ maxHeight: 320 }}
              renderItem={({ item: city }) => (
                <TouchableOpacity style={styles.locOption} onPress={() => selectCity(city)}>
                  <Text style={styles.locOptionText}>{city}</Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },
  headerTextWrap: { flex: 1, marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerLocationRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  headerSubtitle: { fontSize: 13, color: "#6B7280", marginLeft: 4, maxWidth: 180 },
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
  topControls: { backgroundColor: "#F9FAFB", paddingBottom: 4, zIndex: 2 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#111" },
  filtersScroll: { maxHeight: 44, marginBottom: 6 },
  filtersRow: { paddingHorizontal: 16, paddingVertical: 4, alignItems: "center", gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100, flexGrow: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  posterRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  posterAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB", marginRight: 10 },
  posterInfo: { flex: 1, minWidth: 0 },
  posterName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  locationText: { fontSize: 12, color: "#6B7280", flex: 1 },
  timeAgo: { fontSize: 12, color: "#9CA3AF" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#111827" },
  newBadge: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  newBadgeText: { fontSize: 10, fontWeight: "800", color: GREEN },
  metaRow: { flexDirection: "row", marginTop: 8, marginBottom: 6 },
  categoryChip: { backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: GREEN },
  description: { fontSize: 14, color: "#4B5563", lineHeight: 20, marginBottom: 10 },
  engagementRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  engagementBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  engagementText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  commentPreview: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 4 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB" },
  commentBody: { flex: 1 },
  commentName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  commentText: { fontSize: 13, color: "#4B5563" },
  writeCommentHint: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  writeCommentHintText: { fontSize: 13, color: GREEN, fontWeight: "600" },
  viewMoreComments: { fontSize: 13, color: GREEN, fontWeight: "600", marginTop: 4 },
  sendOfferBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  sendOfferText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginTop: 12 },
  emptyText: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 6 },
  modalSub: { fontSize: 14, color: "#6B7280", marginBottom: 14 },
  offerField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  naira: { fontSize: 18, fontWeight: "700", color: "#111", marginRight: 6 },
  offerInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: "#111" },
  commentRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  commentInputRow: { flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  locOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
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
  commentModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    height: "50%",
    maxHeight: "50%",
  },
  commentModalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  commentList: { flex: 1, marginBottom: 8 },
});