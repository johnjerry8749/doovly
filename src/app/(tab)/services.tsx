import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listProfessionals,
  listProfessionalsAsync,
  invalidateProfessionalsCache,
  listActivePromotedServicesAsync,
  listServiceCategories,
  listServiceCategoriesAsync,
  getDistanceKm,
  starsFromReviewCount,
  type Professional,
  type PromotedService,
} from "@/services/professionals";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { isSaved, toggleSave } from "@/services/savedProviders";
import { listCities, listCitiesAsync } from "@/services/cities";
import { useLocation } from "@/context/LocationContext";
import { PromotedServiceCard } from "@/components/PromotedServiceCard";
import { trackPromotionEvent } from "@/services/promotionAnalytics";
import {
  MovingServiceDescription,
  HomeSearchBar,
  ServiceCategoryScroller,
} from "@/components/home";

const GREEN = "#159447";

export default function Services() {
  // NOTE: full body restored in next commit if truncated
  return null;
}
