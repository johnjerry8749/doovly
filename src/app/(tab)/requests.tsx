import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listServiceRequests,
  listServiceRequestsAsync,
  invalidateServiceRequestsCache,
  subscribeServiceRequests,
  canSendOfferOnRequest,
  submitServiceRequestOffer,
  addServiceRequestComment,
  deleteServiceRequestComment,
  likeServiceRequest,
  listLikedServiceRequestIds,
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
  listServiceCategoriesAsync,
} from "@/services/professionals";
import { listCitiesAsync } from "@/services/cities";
import { useLocation } from "@/context/LocationContext";
import CreateJobModal from "@/components/CreateJobModal";
import RequestImageSlider from "@/components/RequestImageSlider";
import { SearchBar, TextCategoryChips } from "@/components/home";
import { PullToRefresh } from "@/components/PullToRefresh";

const GREEN = "#159447";
const MY_AVATAR = require("@/assets/profile_1.jpg");
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
    r.userId ??
    null
  );
};

const getCommentUserId = (comment: ServiceRequestComment) => {
  const c = comment as ServiceRequestComment & {
    authUserId?: string | number;
    userId?: string | number;
    posterId?: string | number;
  };
  // Resolve the real auth UUID first; userId can be a public/mapped ID.
  return c.authUserId ?? c.userId ?? c.posterId ?? null;
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
  const [categoryFilters, setCategoryFilters] = useState<string[]>(["All"]);
  const [cities, setCities] = useState<string[]>([]);
  const [allRequests, setAllRequests] = useState(() => listServiceRequests());
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [createVisible, setCreateVisible] = useState(false);
  const [offerRequest, setOfferRequest] = useState<ServiceRequest | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSending, setOfferSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chatRequest, setChatRequest] = useState<ServiceRequest | null>(null);
  const [chatText, setChatText] = useState("");
  const lastProfileNavAt = useRef(0);

  useEffect(() => {
    let active = true;
    listLikedServiceRequestIds()
      .then((ids) => {
        if (!active) return;
        const map: Record<string, boolean> = {};
        ids.forEach((id) => {
          map[id] = true;
        });
        setLikedIds(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([listServiceCategoriesAsync(), listCitiesAsync()])
      .then(([categories, nextCities]) => {
        if (!active) return;
        setCategoryFilters(categories.map((category) => category.name));
        setCities(nextCities);
      })
      .catch((error) => console.warn("[Requests] failed to load filters:", error));
    return () => {
      active = false;
    };
  }, []);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.toLowerCase().includes(q));
  }, [citySearch, cities]);

  const matchesLocationCity = (itemCity?: string, itemArea?: string) => {
    if (
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

  const loadRequests = async () => {
    try {
      const next = await listServiceRequestsAsync();
      setAllRequests(next);
    } catch (error) {
      console.warn("[Requests] refresh failed:", error);
    }
  };

  const refreshRequests = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      invalidateServiceRequestsCache();
      await loadRequests();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    return subscribeServiceRequests((next) => {
      setAllRequests(next);
    });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadRequests();
    }, []),
  );

  const toggleLike = async (id: string) => {
    const liked = !likedIds[id];
    setLikedIds((prev) => ({ ...prev, [id]: liked }));

    try {
      const likesCount = await likeServiceRequest(id, liked);
      setAllRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, likesCount } : request,
        ),
      );
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

  const openUserProfile = async ({
    userId,
    userName,
  }: {
    userId?: string | number | null;
    userName?: string;
  }) => {
    const rawUserId = String(userId ?? "").trim();
    if (!rawUserId) {
      Alert.alert("Profile unavailable", "This user's profile could not be identified.");
      return;
    }

    const now = Date.now();
    if (now - lastProfileNavAt.current < PROFILE_NAV_COOLDOWN_MS) return;
    lastProfileNavAt.current = now;

    try {
      // Comments store auth.users.id, while the profile route requires professionals.id.
      // Resolve that relationship before navigating instead of passing the wrong UUID.
      const { data: byUserId, error: userLookupError } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", rawUserId)
        .maybeSingle();

      if (userLookupError) throw userLookupError;

      let professionalId = byUserId?.id as string | undefined;
      if (!professionalId) {
        const { data: byProfessionalId, error: professionalLookupError } = await supabase
          .from("professionals")
          .select("id")
          .eq("id", rawUserId)
          .maybeSingle();

        if (professionalLookupError) throw professionalLookupError;
        professionalId = byProfessionalId?.id;
      }

      if (!professionalId) {
        Alert.alert(
          "Profile unavailable",
          userName
            ? `${userName} does not have a professional profile yet.`
            : "This user does not have a professional profile yet.",
        );
        return;
      }

      router.push({
        pathname: "/professional/[id]",
        params: { id: String(professionalId) },
      });
    } catch (error) {
      console.warn("[Requests] Could not open commenter profile:", error);
      Alert.alert("Could not open profile", "Please try again.");
    }
  };

  const deleteComment = async (
    requestId: string,
    comment: ServiceRequestComment,
  ) => {
    Alert.alert("Delete comment", "Remove this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteServiceRequestComment(requestId, comment.id);
            const removeComment = (request: ServiceRequest) =>
              request.id === requestId
                ? {
                    ...request,
                    comments: request.comments.filter(
                      (entry) => entry.id !== comment.id,
                    ),
                  }
                : request;
            setAllRequests((current) => current.map(removeComment));
            if (chatRequest?.id === requestId) {
              setChatRequest((current) =>
                current ? removeComment(current) : current,
              );
            }
          } catch (error) {
            Alert.alert(
              "Could not delete",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        },
      },
    ]);
  };

  const sendComment = async () => {
    if (!chatRequest || !chatText.trim()) return;
    const text = chatText.trim();
    const optimistic: ServiceRequestComment = {
      id: `temp-${Date.now()}`,
      userName: "You",
      userAvatar: MY_AVATAR,
      text,
      createdAt: new Date().toISOString(),
    } as ServiceRequestComment;

    setChatText("");
    setAllRequests((current) =>
      current.map((request) =>
        request.id === chatRequest.id
          ? { ...request, comments: [...(request.comments || []), optimistic] }
          : request,
      ),
    );
    setChatRequest((current) =>
      current
        ? { ...current, comments: [...(current.comments || []), optimistic] }
        : current,
    );

    try {
      const comment = await addServiceRequestComment({ requestId: chatRequest.id, text });
      if (!comment) throw new Error("Comment could not be saved.");
      setAllRequests((current) =>
        current.map((request) =>
          request.id === chatRequest.id
            ? {
                ...request,
                comments: [
                  ...(request.comments || []).filter((x) => x.id !== optimistic.id),
                  comment,
                ],
              }
            : request,
        ),
      );
      setChatRequest((current) =>
        current
          ? {
              ...current,
              comments: [
                ...(current.comments || []).filter((x) => x.id !== optimistic.id),
                comment,
              ],
            }
          : current,
      );
    } catch {
      setAllRequests((current) =>
        current.map((request) =>
          request.id === chatRequest.id
            ? {
                ...request,
                comments: (request.comments || []).filter(
                  (x) => x.id !== optimistic.id,
                ),
              }
            : request,
        ),
      );
      setChatRequest((current) =>
        current
          ? {
              ...current,
              comments: (current.comments || []).filter(
                (x) => x.id !== optimistic.id,
              ),
            }
          : current,
      );
      Alert.alert("Could not send", "Please try again.");
    }
  };

  const submitOffer = async () => {
    if (!offerRequest || offerSending) return;
    const amount = Number(String(offerAmount).replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid offer amount.");
      return;
    }
    setOfferSending(true);
    try {
      const can = await canSendOfferOnRequest(offerRequest.id);
      if (!can.ok) {
        Alert.alert("Cannot send offer", can.reason || "Not allowed.");
        setOfferSending(false);
        return;
      }
      await submitServiceRequestOffer(offerRequest.id, amount);
      const proId = await getLoggedInProfessionalId();
      if (proId) {
        await createOfferConversationAsync({
          professionalId: String(proId),
          requestId: offerRequest.id,
          amount,
        });
      }
      setOfferRequest(null);
      setOfferAmount("");
      Alert.alert("Offer sent", "Your offer was submitted.");
      void refreshRequests();
    } catch (error) {
      Alert.alert(
        "Offer failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setOfferSending(false);
    }
  };

  const renderOfferButton = (item: ServiceRequest) => (
    <TouchableOpacity
      style={styles.sendOfferBtn}
      onPress={() => setOfferRequest(item)}
      activeOpacity={0.85}
    >
      <Ionicons name="paper-plane" size={18} color="#fff" />
      <Text style={styles.sendOfferText}>Send Offer</Text>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: ServiceRequest }) => {
    const liked = !!likedIds[item.id];
    const likesDisplay = item.likesCount || 0;
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
              <Ionicons name="location-outline" size={12} color={GREEN} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}
                {item.city ? `, ${item.city}` : ""}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          {item.category} · {item.profession}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={3}>
          {item.description}
        </Text>

        {item.images && item.images.length > 0 ? (
          <RequestImageSlider images={item.images} />
        ) : null}

        <View style={styles.engagementRow}>
          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => toggleLike(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={18}
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
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search requests…"
          iconName="search"
          containerStyle={styles.searchRow}
          inputStyle={styles.searchInput}
        />
        <TextCategoryChips
          categories={categoryFilters}
          selected={categoryFilter}
          onSelect={setCategoryFilter}
        />
      </View>

      <FlatList
        refreshControl={<PullToRefresh refreshing={refreshing} onRefresh={() => void refreshRequests()} />}
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
        onSaved={(created) => {
          setAllRequests((current) => [created, ...current]);
          setCreateVisible(false);
        }}
      />

      <Modal
        visible={!!offerRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setOfferRequest(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOfferRequest(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Send offer</Text>
            <Text style={styles.modalSub}>{offerRequest?.title}</Text>
            <View style={styles.offerField}>
              <Text style={styles.naira}>₦</Text>
              <TextInput
                style={styles.offerInput}
                placeholder="Enter amount"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={offerAmount}
                onChangeText={setOfferAmount}
              />
            </View>
            <TouchableOpacity
              style={styles.sendOfferBtn}
              onPress={submitOffer}
              disabled={offerSending}
              activeOpacity={0.85}
            >
              <Text style={styles.sendOfferText}>
                {offerSending ? "Sending…" : "Submit offer"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!chatRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setChatRequest(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setChatRequest(null)}>
            <Pressable
              style={styles.commentModalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.commentModalHandle} />
              <Text style={styles.modalTitle}>Comments</Text>
              <FlatList
                data={chatComments}
                keyExtractor={(item) => item.id}
                style={styles.commentList}
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() =>
                        openUserProfile({
                          userId: getCommentUserId(item),
                          userName: item.userName,
                        })
                      }
                    >
                      <Image source={item.userAvatar} style={styles.commentAvatar} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() =>
                          openUserProfile({
                            userId: getCommentUserId(item),
                            userName: item.userName,
                          })
                        }
                      >
                        <Text style={styles.commentName}>{item.userName}</Text>
                      </TouchableOpacity>
                      <Text style={styles.commentText}>{item.text}</Text>
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
                <TouchableOpacity style={styles.commentSend} onPress={sendComment}>
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
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

      <Modal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={closeCityPicker}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "80%" }]}>
            <Text style={styles.modalTitle}>Select a city</Text>
            <TextInput
              style={styles.citySearch}
              placeholder="Search city…"
              placeholderTextColor="#9CA3AF"
              value={citySearch}
              onChangeText={setCitySearch}
            />
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.locOption} onPress={() => selectCity(item)}>
                  <Ionicons name="location-outline" size={20} color={GREEN} />
                  <Text style={styles.locOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={closeCityPicker} style={{ paddingVertical: 12 }}>
              <Text style={{ textAlign: "center", color: "#888", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB", marginBottom: 30,},
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
  headerLocationRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  headerSubtitle: { fontSize: 13, color: "#6B7280", flexShrink: 1 },
  dropdownIcon: { marginLeft: 2 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
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
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  posterRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  posterAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
  posterInfo: { flex: 1, marginLeft: 10 },
  posterName: { fontSize: 14, fontWeight: "700", color: "#111" },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 3 },
  locationText: { fontSize: 12, color: "#6B7280", flexShrink: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  cardDesc: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 8 },
  engagementRow: { flexDirection: "row", gap: 16, marginTop: 8, marginBottom: 8 },
  engagementBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  engagementText: { fontSize: 13, color: "#6B7280", fontWeight: "600" },
  commentPreview: { flexDirection: "row", gap: 8, marginTop: 4 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#E5E7EB" },
  commentBody: { flex: 1 },
  commentName: { fontSize: 12, fontWeight: "700", color: "#111" },
  commentText: { fontSize: 13, color: "#374151", marginTop: 2 },
  writeCommentHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  writeCommentHintText: { fontSize: 13, color: GREEN, fontWeight: "600" },
  viewMoreComments: { fontSize: 12, color: "#6B7280", marginTop: 6, fontWeight: "600" },
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
