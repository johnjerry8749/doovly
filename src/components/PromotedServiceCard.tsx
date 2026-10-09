import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const GREEN = "#159447";

type PromotedServiceCardProps = {
  professionalId: string;
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  city?: string;
  price?: string;
  priceValue?: number;
  avatarUrl?: string | null;
  cardStyle?: object;
  DescriptionComponent?: React.ComponentType<{ text: string; color?: string }>;
};

/**
 * Green promoted service card — same grid size as normal professional cards.
 * Matches the full-green promo design (white PROMOTED badge + white Book Now).
 */
export function PromotedServiceCard({
  professionalId,
  serviceId,
  serviceName,
  serviceDescription = "",
  category = "",
  rating = 0,
  reviewCount = 0,
  city = "",
  price,
  priceValue = 0,
  avatarUrl,
  cardStyle,
  DescriptionComponent,
}: PromotedServiceCardProps) {
  const priceLabel =
    price ||
    (priceValue > 0
      ? `₦${priceValue.toLocaleString("en-NG")}`
      : "Contact for price");

  return (
    <View style={[cardStyle, styles.card]}>
      <View style={styles.badgeWrap}>
        <Text style={styles.badgeText}>PROMOTED</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/professional/[id]",
            params: { id: professionalId },
          })
        }
      >
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={22} color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {serviceName}
        </Text>
        <View style={styles.nameUnderline} />

        {!!category.trim() && (
          <Text style={styles.category} numberOfLines={1}>
            {category}
          </Text>
        )}

        <View style={styles.ratingRow}>
          {Array.from({ length: 5 }, (_, index) => (
            <Ionicons
              key={"rating-" + professionalId + "-" + index}
              name={index < Math.round(Math.max(0, Math.min(5, rating))) ? "star" : "star-outline"}
              size={10}
              color="#FDE68A"
            />
          ))}
          <Text style={styles.reviewCount} numberOfLines={1}>
            {rating > 0 ? rating.toFixed(1) : "New"}{reviewCount > 0 ? " (" + reviewCount + ")" : ""}
          </Text>
        </View>

        {!!serviceDescription.trim() && (
          <Text style={styles.description} numberOfLines={3}>
            {serviceDescription.trim()}
          </Text>
        )}
        {!!city.trim() && (
          <View style={styles.cityRow}>
            <Ionicons name="location" size={10} color="#000000" />
            <Text style={styles.city} numberOfLines={1}>
              {city}
            </Text>
          </View>
        )}

        <Text style={styles.price} numberOfLines={1}>
          {priceLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.bookButton}
        activeOpacity={0.8}
        onPress={() =>
          router.push({
            pathname: "/bookme/[id]",
            params: {
              id: professionalId,
              serviceId,
              serviceName,
              price: price || String(priceValue || ""),
            },
          })
        }
      >
        <Text style={styles.bookText}>Book Now</Text>
        <Ionicons name="arrow-forward" size={12} color={GREEN} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GREEN,
    borderRadius: 12,
    borderWidth: 0,
    padding: 6,
    overflow: "hidden",
  },
  badgeWrap: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 3,
  },
  badgeText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: "center",
    marginTop: 2,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  name: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 3,
  },
  nameUnderline: {
    width: "48%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignSelf: "center",
    marginBottom: 5,
  },
  category: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    marginBottom: 3,
  },
  reviewCount: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    marginLeft: 3,
    flexShrink: 1,
  },
  description: {
    height: 35,
    fontSize: 10,
    lineHeight: 11,
    color: "rgba(255,255,255,0.85)",
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: 2,
    overflow: "hidden",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 3,
    marginTop: 3,
    marginBottom: 1,
  },
  city: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 9,
    textAlign: "left",
    flexShrink: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "left",
    marginTop: 4,
  },
  bookButton: {
    marginTop: 9,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  bookText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "700",
  },
});
