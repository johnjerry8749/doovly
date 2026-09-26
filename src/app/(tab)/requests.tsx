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

// ============================================================
// CONSTANTS
// ============================================================

const GREEN = "#159447";

const MY_AVATAR = require("@/assets/profile_1.jpg");

const CATEGORY_FILTERS = [
  "All",
  ...SERVICE_CATEGORIES.map((category) => category.name),
];

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// HELPERS
// ============================================================

const normalize = (value?: string | number | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const categoryMatches = (
  request: ServiceRequest,
  selectedCategory: string,
) => {
  if (selectedCategory === "All") return true;

  const selected = normalize(selectedCategory);

  const requestCategories = [
    request.category,
    request.profession,
  ]
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
    return professionals.find(
      (p) => normalize(p.name) === normalizedUserName,
    );
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
    params: {
      id: String(professional.id),
      from: "requests",
    },
  });
};

// ============================================================
// SCREEN
// ============================================================

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

    if (!query) {
      return [...NIGERIA_CITIES];
    }

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

  const [allRequests, setAllRequests] = useState(() =>
    listServiceRequests(),
  );

  const [createVisible, setCreateVisible] = useState(false);

  const [offerRequest, setOfferRequest] =
    useState<ServiceRequest | null>(null);

  const [offerPrice, setOfferPrice] = useState("");

  const [chatRequest, setChatRequest] =
    useState<ServiceRequest | null>(null);

  const [chatText, setChatText] = useState("");

  const [replyTo, setReplyTo] =
    useState<ServiceRequestComment | null>(null);

  const commentListRef =
    useRef<FlatList<ServiceRequestComment>>(null);

  const refreshRequests = () => {
    setAllRequests(listServiceRequests());
  };

  const getComments = (
    item: ServiceRequest,
  ): ServiceRequestComment[] => [
    ...(item.comments || []),
    ...(extraComments[item.id] || []),
  ];

  const matchesLocationCity = (
    itemCity?: string,
    itemArea?: string,
  ) => {
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

    const city = locationName
      .split(",")[0]
      .trim()
      .toLowerCase();

    if (!city || city === "nigeria") {
      return true;
    }

    const requestCity = normalize(itemCity);
    const requestArea = normalize(itemArea);

    if (!requestCity && !requestArea) {
      return true;
    }

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

      if (seen.has(req.id)) {
        return false;
      }

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
    setLikedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
      // Share cancelled.
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

    const body = replyTo
      ? `@${replyTo.userName} ${text}`
      : text;

    const currentProfessional =
      findProfessionalForUser(currentUserId);

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
      [chatRequest.id]: [
        ...(prev[chatRequest.id] || []),
        newComment,
      ],
    }));

    setChatText("");
    setReplyTo(null);

    setTimeout(() => {
      commentListRef.current?.scrollToEnd({
        animated: true,
      });
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
      String(request.createdByUserId) !==
        String(currentUserId)
        ? request.createdByUserId
        : currentUserId;

    addInAppNotification({
      userId: recipientId,
      type: "general",
      title: "New Offer",
      body: `Someone sent an offer of ₦${Number(
        amount,
      ).toLocaleString()} on "${offerRequest.title}".`,
    });

    closeOffer();
  };

  // PLACEHOLDER_CONTINUE - truncated intentionally will fail validation if incomplete
