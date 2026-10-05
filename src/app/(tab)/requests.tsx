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

import {
  listServiceRequests,
  listServiceRequestsAsync,
  canSendOfferOnRequest,
  submitServiceRequestOffer,
  addServiceRequestComment,
  deleteServiceRequestComment,
  type ServiceRequest,
  type ServiceRequestComment,
} from "@/services/serviceRequests";
import {
  getCurrentUserId,
  addInAppNotification,
} from "@/services/inAppNotifications";
import { createOfferConversation } from "@/services/chat";
import { getLoggedInProfessionalId } from "@/services/savedProviders";
import { listProfessionals, getProfessionalById } from "@/services/professionals";
import { SERVICE_CATEGORIES } from "@/data/serviceCategories";
import { NIGERIA_CITIES } from "@/data/cities";
import { useLocation } from "@/context/LocationContext";
import CreateJobModal from "@/components/CreateJobModal";
import RequestImageSlider from "@/components/RequestImageSlider";

const GREEN = "#159447";
const MY_AVATAR = require("@/assets/profile_1.jpg");
const CATEGORY_FILTERS = [
  "All",
  ...Array.from(new Set(SERVICE_CATEGORIES.map((c) => c.name))),
];
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
    createdByUserId?: string | number;
    authorId?: string | number;
    posterUserId?: string | number;
  };
  return (
    c.professionalId ??
    c.userId ??
    c.createdByUserId ??
    c.authorId ??
    c.posterUserId
  );
};

export default function RequestsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <Text style={{ padding: 20 }}>Loading requests… Pull to refresh after update.</Text>
    </SafeAreaView>
  );
}
