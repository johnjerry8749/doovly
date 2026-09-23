import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getLoggedInProfessionalId } from "@/services/savedProviders";
import { getProfessionalById } from "@/services/professionals";
import { isCurrentUserPro } from "@/services/savedProviders";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = 16;
const GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GAP) / 2;

/**
 * Portfolio limit:
 * Free → 5 images | Pro → 20 images
 * LATER: enforce on backend too
 */
const FREE_PORTFOLIO_LIMIT = 5;
const PRO_PORTFOLIO_LIMIT = 20;

export default function PortfolioGallery() {
  const proId = getLoggedInProfessionalId();
  const pro = proId ? getProfessionalById(proId) : undefined;
  const isPro = isCurrentUserPro();
  const limit = isPro ? PRO_PORTFOLIO_LIMIT : FREE_PORTFOLIO_LIMIT;

  // Local mirror so UI can feel responsive; source of truth remains professional.portfolio
  const [items, setItems] = useState(() => pro?.portfolio ?? []);

  const canAdd = items.length < limit;

  const onAdd = () => {
    if (!canAdd) {
      Alert.alert(
        "Limit reached",
        isPro
          ? `Pro users can upload up to ${PRO_PORTFOLIO_LIMIT} photos.`
          : `Free users can upload up to ${FREE_PORTFOLIO_LIMIT} photos. Upgrade to Pro for more.`,
        isPro
          ? [{ text: "OK" }]
          : [
              { text: "Not now", style: "cancel" },
              {
                text: "Upgrade",
                onPress: () => router.push("/profile/subscription/subscription"),
              },
            ],
      );
      return;
    }

    // TODO backend: image picker + POST /me/portfolio
    Alert.alert(
      "Add photo",
      "Image picker will be wired with expo-image-picker. For now this is a mock add.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add mock photo",
          onPress: () => {
            const next = {
              id: `local-${Date.now()}`,
              description: "New portfolio item",
              image: pro?.image ?? require("@/assets/profile_1.jpg"),
            };
            setItems((prev) => [...prev, next]);
            if (pro) {
              pro.portfolio = [...pro.portfolio, next];
            }
          },
        },
      ],
    );
  };

  const filters = useMemo(() => ["All", "Services", "Repairs"], []);
  const [filter, setFilter] = useState("All");

  // Mock filter does nothing special yet — keeps UI ready for tags later
  const visible = items;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Portfolio</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={onAdd}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={40} color={PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptySub}>
              Add photos of completed work to build your portfolio
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={onAdd}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={PRIMARY} />
              <Text style={styles.emptyBtnText}>Add Your First Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {visible.map((item) => (
              <View key={item.id} style={styles.card}>
                <Image
                  source={item.image}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.limitHint}>
          {items.length} / {limit} photos
          {!isPro ? " · Upgrade to Pro for more" : ""}
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
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
    color: TEXT_DARK,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: H_PAD,
    gap: 10,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  chipActive: {
    backgroundColor: LIGHT_GREEN,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  chipTextActive: {
    color: PRIMARY,
  },
  content: {
    paddingHorizontal: H_PAD,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 0.85,
    backgroundColor: "#E5E7EB",
  },
  cardBody: {
    padding: 10,
  },
  cardDesc: {
    fontSize: 12,
    color: TEXT_DARK,
    lineHeight: 16,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  emptyBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },
  limitHint: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    color: TEXT_MUTED,
  },
});
