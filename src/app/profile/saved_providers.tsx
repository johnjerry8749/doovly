import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  getSavedProviders,
  toggleSave,
  getRemainingSlots,
  getSaveLimit,
  MOCK_USER,
  type SaveResult,
} from "@/services/savedProviders";
import type { Professional } from "@/services/professionals";

const PRIMARY = "#159447";

export default function SavedProviders() {
  const [list, setList] = useState<Professional[]>([]);

  const refresh = useCallback(() => {
    setList(getSavedProviders());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onUnsave = (id: string) => {
    const result: SaveResult = toggleSave(id);
    if (result.ok) refresh();
  };

  const remaining = getRemainingSlots();
  const limit = getSaveLimit();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Professionals</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!MOCK_USER.subscribed && limit != null && (
        <Text style={styles.limitHint}>
          {remaining} of {limit} free saves left
          {remaining === 0 ? " · Upgrade to Pro for unlimited" : ""}
        </Text>
      )}

      {MOCK_USER.subscribed && (
        <Text style={styles.limitHint}>Pro · Unlimited saves</Text>
      )}

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>No saved professionals yet</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/professional/[id]",
                params: { id: item.id },
              })
            }
          >
            <Image source={item.image} style={styles.avatar} />
            <View style={styles.cardBody}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.profession} · {item.city}
              </Text>
              <Text style={styles.price}>{item.priceFrom}</Text>
            </View>
            <TouchableOpacity
              hitSlop={12}
              onPress={() => onUnsave(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="heart" size={22} color="#EF4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerSpacer: {
    width: 40,
  },
  limitHint: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#9CA3AF",
    fontSize: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E7EB",
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  meta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
    marginTop: 4,
  },
});
