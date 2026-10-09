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
  city?: string;
  price?: string;
  priceValue?: number;
  avatarUrl?: string | null;
  cardStyle?: object;
  category?: string;
  rating?: number;
  reviewCount?: number;
  DescriptionComponent?: React.ComponentType<{ text: string; color?: string }>;
};

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
        style={styles.profileTapArea}
        activeOpacity={0.85}
        onPress={() =>
          router.push({
            pathname: "/professional/[id]",
            params: { id: professionalId, from: "home" },
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
              <Ionicons name="person" size={22} color={GREEN} />
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {serviceName}
        </Text>
        <View style={styles.nameUnderline} />

        {!!serviceDescription.trim() &&
          (DescriptionComponent ? (
            <DescriptionComponent
              text={serviceDescription.trim()}
              color="rgba(255,255,255,0.82)"
            />
          ) : (
            <Text style={styles.description} numberOfLines={3}>
              {serviceDescription.trim()}
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
        <Ionicons name="arrow-forward" size={13} color={GREEN} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GREEN,
    borderRadius: 12,
    borderWidth: 0,
    padding: 8,
    overflow: "hidden",
  },
  badgeWrap: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 2,
  },
  badgeText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  profileTapArea: {
    flex: 1,
    alignItems: "stretch",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: "center",
    marginTop: 1,
    marginBottom: 5,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  name: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  nameUnderline: {
    width: "48%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignSelf: "center",
    marginBottom: 5,
  },
  description: {
    minHeight: 33,
    fontSize: 10,
    lineHeight: 12,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    marginBottom: 3,
    overflow: "hidden",
  },
  price: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
  },
  bookButton: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  bookText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "800",
  },
});
