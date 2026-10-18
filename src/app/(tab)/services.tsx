import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

const GREEN = "#159447";

// TEMPORARY STUB — full file restore required
// The shared components (HomeSearchBar, ServiceCategoryScroller, MovingServiceDescription)
// are ready on this branch. Re-apply the services wiring from artifacts or next commit.
export default function Services() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 16, color: "#111", textAlign: "center", padding: 24 }}>
        Services screen temporarily unavailable on this branch.{"\n"}
        Shared components are ready — restore services.tsx from master and wire HomeSearchBar + ServiceCategoryScroller.
      </Text>
    </SafeAreaView>
  );
}
