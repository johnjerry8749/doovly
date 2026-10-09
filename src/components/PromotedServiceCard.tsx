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
  DescriptionComponent?: React.ComponentType<{ text: string; color?: string }>;
};

/** Promoted card UI only; outer card dimensions come from the normal professional card style. */
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
      <View style={styles.cardTop}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PROMOTED</Text>
        </View>
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
              <Ionicons name="person" size={25} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {serviceName}
        </Text>
        <View style={styles.nameUnderline} />

        {serviceDescription.trim() ? (
          DescriptionComponent ? (
            <DescriptionComponent
              text={serviceDescription.trim()}
              color="rgba(255,255,255,0.82)"
            />
          ) : (
            <Text style={styles.description} numberOfLines={3}>
              {serviceDescription.trim()}
            </Text>
          )
        ) : (
          <Text style={styles.description} numberOfLines={3}>
            Professional service tailored to your needs.
          </Text>
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
        <Ionicons name="arrow-forward" size={15} color={GREEN} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GREEN,
    borderColor: GREEN,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    overflow: "hidden",
    justifyContent: "flex-start",
  },
  cardTop: {
    width: "100%",
    alignItems: "flex-end",
    marginBottom: 2,
  },
  badge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.45,
  },
  profileTapArea: {
    alignItems: "stretch",
    flex: 1,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignSelf: "center",
    marginTop: 1,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 29,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  name: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 1,
  },
  nameUnderline: {
    width: "48%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  description: {
    minHeight: 32,
    maxHeight: 36,
    fontSize: 9,
    lineHeight: 11,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    overflow: "hidden",
  },
  price: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: "auto",
    paddingTop: 5,
  },
  bookButton: {
    marginTop: 7,
    minHeight: 29,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 7,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  bookText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: "800",
  },
});
