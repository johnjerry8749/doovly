import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import {
  getProfessionalById,
  getDistanceKm,
  ProService,
} from "@/data/professionals";

type TabKey = "services" | "reviews";

export default function ProfessionalProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pro = useMemo(() => getProfessionalById(id ?? ""), [id]);

  const [tab, setTab] = useState<TabKey>("services");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loadingDistance, setLoadingDistance] = useState(true);

  // Calculate distance from user GPS to pro
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!pro) {
        setLoadingDistance(false);
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mounted) setLoadingDistance(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const km = getDistanceKm(
          loc.coords.latitude,
          loc.coords.longitude,
          pro.latitude,
          pro.longitude,
        );
        if (mounted) setDistanceKm(km);
      } catch (e) {
        console.log("Distance error:", e);
      } finally {
        if (mounted) setLoadingDistance(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [pro]);

  if (!pro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Professional not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const onBook = (service?: ProService) => {
    // Booking form can be wired later — pass pro + optional service
    router.push({
      pathname: "/(tab)/bookings",
      params: {
        proId: pro.id,
        serviceId: service?.id ?? "",
        serviceName: service?.name ?? "",
        price: service?.price ?? pro.priceFrom,
      },
    });
  };

  const distanceLabel = loadingDistance
    ? "Getting distance..."
    : distanceKm != null
      ? `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km away`
      : `${pro.city}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#16A34A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <Image source={pro.image} style={styles.avatar} />
          {pro.verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={16} color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.name}>{pro.name}</Text>

        {/* Stars */}
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={i <= Math.round(pro.rating) ? "star" : "star-outline"}
              size={18}
              color="#16A34A"
            />
          ))}
          <Text style={styles.ratingText}>
            {" "}
            {pro.rating.toFixed(1)} ({pro.reviewCount} reviews)
          </Text>
        </View>

        {/* Distance */}
        <View style={styles.distanceRow}>
          <Ionicons name="location" size={16} color="#16A34A" />
          {loadingDistance ? (
            <ActivityIndicator
              size="small"
              color="#16A34A"
              style={{ marginLeft: 6 }}
            />
          ) : (
            <Text style={styles.distanceText}>{distanceLabel}</Text>
          )}
        </View>

        {/* Tabs: Services | Reviews (no Portfolio) */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === "services" && styles.tabActive]}
            onPress={() => setTab("services")}
          >
            <Text
              style={[styles.tabText, tab === "services" && styles.tabTextActive]}
            >
              Services
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "reviews" && styles.tabActive]}
            onPress={() => setTab("reviews")}
          >
            <Text
              style={[styles.tabText, tab === "reviews" && styles.tabTextActive]}
            >
              Reviews
            </Text>
          </TouchableOpacity>
        </View>

        {/* Services tab */}
        {tab === "services" && (
          <View style={styles.listCard}>
            {pro.services.map((svc, index) => (
              <TouchableOpacity
                key={svc.id}
                style={[
                  styles.serviceRow,
                  index < pro.services.length - 1 && styles.serviceBorder,
                ]}
                activeOpacity={0.7}
                onPress={() => onBook(svc)}
              >
                <View style={styles.serviceIcon}>
                  <MaterialCommunityIcons
                    name={svc.icon as any}
                    size={22}
                    color="#16A34A"
                  />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {svc.description}
                  </Text>
                </View>
                <Text style={styles.servicePrice}>{svc.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reviews tab */}
        {tab === "reviews" && (
          <View style={styles.reviewsWrap}>
            {pro.reviews.length === 0 ? (
              <Text style={styles.emptyReviews}>No reviews yet</Text>
            ) : (
              pro.reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewInitial}>
                        {rev.userName.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewName}>{rev.userName}</Text>
                      <Text style={styles.reviewDate}>{rev.date}</Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons
                          key={i}
                          name={i <= rev.rating ? "star" : "star-outline"}
                          size={12}
                          color="#16A34A"
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Book Now sticky */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.85}
          onPress={() => onBook()}
        >
          <Ionicons name="calendar" size={20} color="#fff" />
          <Text style={styles.bookBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 16, color: "#6B7280", marginBottom: 12 },
  backLink: { color: "#16A34A", fontWeight: "600" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },

  content: { paddingHorizontal: 20, alignItems: "center" },

  avatarWrap: {
    marginTop: 8,
    marginBottom: 14,
    position: "relative",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#E5E7EB",
  },
  verifiedBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    textAlign: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingText: { fontSize: 14, color: "#6B7280", marginLeft: 4 },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  distanceText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },

  tabs: {
    flexDirection: "row",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#16A34A",
  },
  tabText: { fontSize: 15, fontWeight: "600", color: "#9CA3AF" },
  tabTextActive: { color: "#16A34A" },

  listCard: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  serviceBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceInfo: { flex: 1, marginRight: 8 },
  serviceName: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 3 },
  serviceDesc: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
  servicePrice: { fontSize: 15, fontWeight: "700", color: "#16A34A" },

  reviewsWrap: { width: "100%", gap: 12 },
  emptyReviews: {
    textAlign: "center",
    color: "#9CA3AF",
    paddingVertical: 30,
  },
  reviewCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reviewInitial: { color: "#fff", fontWeight: "700", fontSize: 15 },
  reviewName: { fontSize: 14, fontWeight: "700", color: "#111" },
  reviewDate: { fontSize: 12, color: "#9CA3AF", marginTop: 1 },
  reviewStars: { flexDirection: "row", gap: 1 },
  reviewComment: { fontSize: 13, color: "#374151", lineHeight: 19 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  bookBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
