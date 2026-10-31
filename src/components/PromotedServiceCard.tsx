import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { trackPromotionEvent } from "@/services/promotionAnalytics";
import { supabase } from "@/lib/supabase";
import { listConversationsAsync } from "@/services/chat";

const GREEN = "#159447";

type PromotedServiceCardProps = {
  professionalId: string;
  serviceId: string;
  promotionId: string;
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
  cardRef?: (node: View | null) => void;
  onCardLayout?: () => void;
};

export function PromotedServiceCard({
  professionalId,
  serviceId,
  promotionId,
  serviceName,
  serviceDescription = "",
  city = "",
  price,
  priceValue = 0,
  avatarUrl,
  cardStyle,
  DescriptionComponent,
  cardRef,
  onCardLayout,
}: PromotedServiceCardProps) {
  const [isOwner, setIsOwner] = useState(false);
    const openingDestinationRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      openingDestinationRef.current = false;
    }, []),
  );

  useEffect(() => {
    let active = true;

    const checkPromotionOwner = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!active || authError) return;
        if (!user) {
          setIsOwner(false);
          return;
        }

        const { data: professional, error: professionalError } = await supabase
          .from("professionals")
          .select("user_id")
          .eq("id", professionalId)
          .maybeSingle();

        if (!active || professionalError || !professional) return;
        setIsOwner(professional.user_id === user.id);
      } catch {
        // Fail closed if ownership cannot be verified.
      }
    };

    void checkPromotionOwner();
    return () => {
      active = false;
    };
  }, [professionalId]);

  const priceLabel =
    price ||
    (priceValue > 0
      ? `₦${priceValue.toLocaleString("en-NG")}`
      : "Contact for price");

  return (
    <View ref={cardRef} onLayout={onCardLayout} style={[cardStyle, styles.card]}>
      <View style={styles.badgeWrap}>
        <Text style={styles.badgeText}>PROMOTED</Text>
      </View>

      <TouchableOpacity
        style={styles.profileTapArea}
        activeOpacity={0.85}
        onPress={() => {
          void trackPromotionEvent(serviceId, "service_views");
          router.push({
            pathname: "/professional/[id]",
            params: { id: professionalId, from: "home" },
          });
        }}
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
            <View style={styles.descriptionSlot}>
              <DescriptionComponent
                text={serviceDescription.trim()}
                color="rgba(255,255,255,0.82)"
              />
            </View>
          ) : (
            <Text style={styles.description} numberOfLines={3}>
              {serviceDescription.trim()}
            </Text>
          ))}

        {!!city.trim() && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {city.trim()}
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
        onPress={async () => {
          // Lock synchronously so rapid taps cannot stack multiple routes or queries.
          if (openingDestinationRef.current) return;
          openingDestinationRef.current = true;

          try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;

            if (user) {
              const { data: professional, error: professionalError } = await supabase
                .from("professionals")
                .select("user_id")
                .eq("id", professionalId)
                .maybeSingle();
              if (professionalError) throw professionalError;

              if (professional?.user_id === user.id) {
                const conversations = await listConversationsAsync();
                const conversation = conversations.find((item) => item.participant.isSystem);
                if (!conversation?.id) {
                  Alert.alert("Doovly Chat", "Your promotion results chat is not available yet. Please try again shortly.");
                  openingDestinationRef.current = false;
                  return;
                }

                router.push({
                  pathname: "/chat/[id]",
                  params: { id: conversation.id, promotionId },
                });
                return;
              }
            }

            router.push({
              pathname: "/bookme/[id]",
              params: {
                id: professionalId,
                serviceId,
                serviceName,
                price: price || String(priceValue || ""),
              },
            });
          } catch (error) {
            console.warn("Could not open promotion results or booking:", error);
            Alert.alert("Please try again", "Doovly could not open this promotion right now.");
            openingDestinationRef.current = false;
          }
        }}
      >
        <Text style={styles.bookText}>{isOwner ? "View Results" : "Book Now"}</Text>
        {!isOwner && <Ionicons name="arrow-forward" size={13} color={GREEN} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: GREEN,
    borderRadius: 12,
    borderWidth: 0,
    padding: 7,
    overflow: "hidden",
  },
  badgeWrap: {
    alignSelf: "flex-end",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 1,
  },
  badgeText: {
    color: GREEN,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  profileTapArea: {
    alignItems: "stretch",
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  descriptionSlot: {
    height: 24,
    overflow: "hidden",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignSelf: "center",
    marginTop: 1,
    marginBottom: 3,
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
    marginBottom: 2,
  },
  nameUnderline: {
    width: "48%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignSelf: "center",
    marginBottom: 3,
  },
  description: {
    minHeight: 24,
    maxHeight: 24,
    fontSize: 9,
    lineHeight: 12,
    color: "rgba(255,255,255,0.82)",
    textAlign: "center",
    marginBottom: 1,
    overflow: "hidden",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginTop: 1,
  },
  locationText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    fontWeight: "600",
    flexShrink: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 2,
    flexShrink: 0,
  },
  bookButton: {
    marginTop: 4,
    flexShrink: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  bookText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "800",
  },
});
