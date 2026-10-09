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
import type { PromotedService } from "@/services/professionals";

type Props = {
  item: PromotedService;
};

const GREEN = "#159447";
const FALLBACK_AVATAR = require("@/assets/profile_1.jpg");

/**
 * Separate promoted-service card. Keeps the existing professional-card
 * footprint and rounded border while showing the exact promoted service.
 */
export default function PromotedServiceCard({ item }: Props) {
  const imageSource = item.avatarUrl && /^https?:\/\//i.test(item.avatarUrl)
    ? { uri: item.avatarUrl }
    : FALLBACK_AVATAR;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/professional/[id]",
          params: {
            id: item.professionalId,
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            price: item.price,
          },
        })
      }
    >
      <View style={styles.promotedBadge}>
        <Text style={styles.promotedBadgeText}>PROMOTED</Text>
      </View>

      <Image source={imageSource} style={styles.profileImage} resizeMode="cover" />

      <Text style={styles.professionalName} numberOfLines={1}>
        {item.professionalName}
      </Text>

      <Text style={styles.serviceName} numberOfLines={2}>
        {item.serviceName}
      </Text>

      <Text style={styles.city} numberOfLines={1}>
        <Ionicons name="location" size={10} color={GREEN} /> {item.city}
      </Text>

      <Text style={styles.price} numberOfLines={1}>
        {item.price || (item.priceValue > 0 ? `₦${item.priceValue.toLocaleString("en-NG")}` : "Contact for price")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "31.5%",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    padding: 10,
    position: "relative",
    marginBottom: 10,
  },
  promotedBadge: {
    position: "absolute",
    top: 7,
    left: 7,
    zIndex: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
  },
  promotedBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 8,
    backgroundColor: "#E5E7EB",
  },
  professionalName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111",
    marginBottom: 3,
  },
  serviceName: {
    fontSize: 11,
    color: "#555",
    fontWeight: "600",
    marginBottom: 3,
  },
  city: {
    fontSize: 10,
    color: "#777",
    marginBottom: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: "800",
    color: GREEN,
  },
});
