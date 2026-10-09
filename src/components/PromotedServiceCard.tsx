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

        <Text style={styles.name} numberOfLines={1}>
          {serviceName}
        </Text>
        <View style={styles.nameUnderline} />

        {!!serviceDescription.trim() &&
          (DescriptionComponent ? (
            <DescriptionComponent
              text={serviceDescription}
              color="rgba(255,255,255,0.85)"
            />
          ) : (
            <Text style={styles.description} numberOfLines={1}>
              {serviceDescription}
            </Text>
          ))}

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
    padding: 10,
    overflow: "hidden",
  },
  badgeWrap: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
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
    marginTop: 4,
    marginBottom: 8,
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
  description: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
  },
  bookButton: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 10,
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
