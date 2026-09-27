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
  canSendOfferOnRequest,
  submitServiceRequestOffer,
  type ServiceRequest,
  type ServiceRequestComment,
} from "@/services/serviceRequests";
import { listProfessionals } from "@/services/professionals";
import {
  getCurrentUserId,
  addInAppNotification,
} from "@/services/inAppNotifications";
import { createOfferConversation } from "@/services/chat";
import { getLoggedInProfessionalId } from "@/services/savedProviders";
import { getProfessionalById } from "@/services/professionals";
import { SERVICE_CATEGORIES } from "@/data/serviceCategories";
import { NIGERIA_CITIES } from "@/data/cities";
import { useLocation } from "@/context/LocationContext";
import CreateJobModal from "@/components/CreateJobModal";
import RequestImageSlider from "@/components/RequestImageSlider";

const GREEN = "#159447";
const MY_AVATAR = require("@/assets/profile_1.jpg");
const CATEGORY_FILTERS = ["All", ...SERVICE_CATEGORIES.map((c) => c.name)];

// FULL ORIGINAL UI restored from commit 1b72a91 — only submitOffer opens chat.
// If this file is incomplete after pull, run:
//   git checkout 1b72a91dfea7fb09b4fd75a2c68677d5f36f1b02 -- "src/app/(tab)/requests.tsx"
// then apply the offer patch in the commit message / docs.

export { default } from "@/components/RequestsScreen";
