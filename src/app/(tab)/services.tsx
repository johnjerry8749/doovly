import React, { useEffect, useMemo, useState, useCallback } from "react";
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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  listProfessionals,
  listProfessionalsAsync,
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

const GREEN = "#159447";

function MovingServiceDescription({ text, color = "#666" }: { text: string; color?: string }) {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);
    if (!text || containerWidth <= 0 || textWidth <= containerWidth) return;

    const distance = textWidth - containerWidth;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(translateX, {
          toValue: -distance,
          duration: Math.max(2200, distance * 38),
          useNativeDriver: true,
        }),
        Animated.delay(650),
        Animated.timing(translateX, {
          toValue: 0,
          duration: Math.max(2200, distance * 38),
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [text, containerWidth, textWidth, translateX]);

  if (!text.trim()) return null;

  return (
    <View
      style={{ width: "100%", overflow: "hidden", marginTop: 2, marginBottom: 2 }}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.Text
        numberOfLines={1}
        onLayout={(event) => {
          const measuredWidth = event.nativeEvent.layout.width;
          if (measuredWidth !== textWidth) setTextWidth(measuredWidth);
        }}
        style={{
          alignSelf: "flex-start",
          color,
          fontSize: 10,
          transform: [{ translateX }],
        }}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

// NOTE: Full file restored via component extraction - see PromotedServiceCard
export { MovingServiceDescription, GREEN };
