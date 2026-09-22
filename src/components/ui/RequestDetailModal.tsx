import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { ServiceRequest } from "@/services/serviceRequests";
import {
  addInAppNotification,
  getCurrentUserId,
} from "@/services/inAppNotifications";

const GREEN = "#159447";

type RequestDetailModalProps = {
  request: ServiceRequest | null;
  onClose: () => void;
};

export default function RequestDetailModal({
  request,
  onClose,
}: RequestDetailModalProps) {
  const { width } = useWindowDimensions();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showOffer, setShowOffer] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const images = request?.images ?? [];

  const closeOffer = () => {
    setShowOffer(false);
    setOfferPrice("");
  };

  const sendOffer = () => {
    if (!request) return;
    const amount = offerPrice.replace(/[^\d]/g, "");
    if (!amount) return;

    const recipientId =
      request.createdByUserId &&
      request.createdByUserId !== getCurrentUserId()
        ? request.createdByUserId
        : getCurrentUserId();
    addInAppNotification({
      userId: recipientId,
      type: "general",
      title: "New Offer",
      body: `Someone sent an offer of \u20a6${Number(amount).toLocaleString()} on "${request.title}".`,
    });
    closeOffer();
    onClose();
  };

  return (
    <Modal
      visible={!!request}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        setActiveImageIndex(0);
        closeOffer();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {request && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.imageContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const pageWidth = event.nativeEvent.layoutMeasurement.width;
                    const currentIndex = Math.round(
                      event.nativeEvent.contentOffset.x / pageWidth,
                    );
                    setActiveImageIndex(currentIndex);
                  }}
                >
                  {images.map((imageSource, index) => (
                    <Image
                      key={`${request.id}-image-${index}`}
                      source={{ uri: imageSource }}
                      style={[styles.image, { width }]}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={22} color="#111827" />
                </TouchableOpacity>

                <View style={styles.dotsContainer}>
                  {images.map((_, index) => (
                    <View
                      key={`dot-${index}`}
                      style={[
                        styles.dot,
                        index === activeImageIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.contentWrap}>
                <View style={styles.headerRow}>
                  <View
                    style={[
                      styles.headerIcon,
                      { backgroundColor: request.iconBackground },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={request.icon}
                      size={26}
                      color={GREEN}
                    />
                  </View>

                  <View style={styles.titleBlock}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={2}>
                        {request.title}
                      </Text>
                      {request.isNew && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>NEW</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.locationRow}>
                      <Ionicons
                        name="location-outline"
                        size={15}
                        color="#6B7280"
                      />
                      <Text style={styles.locationText}>
                        {request.location}, {request.city}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={18} color="#6B7280" />
                    <View style={styles.metaTextWrap}>
                      <Text style={styles.metaLabel}>Posted</Text>
                      <Text style={styles.metaValue}>{request.timeAgo}</Text>
                    </View>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#6B7280"
                    />
                    <View style={styles.metaTextWrap}>
                      <Text style={styles.metaLabel}>Preferred date</Text>
                      <Text style={styles.metaValue}>
                        {request.preferredDate}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="radio-button-on-outline"
                      size={18}
                      color="#6B7280"
                    />
                    <View style={styles.metaTextWrap}>
                      <Text style={styles.metaLabel}>Service type</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>
                        {request.category}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{request.description}</Text>

                <Text style={styles.sectionTitle}>Photos ({images.length})</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbRow}
                >
                  {images.map((imageSource, index) => (
                    <Image
                      key={`thumb-${index}`}
                      source={{ uri: imageSource }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.ctaButton}
                  activeOpacity={0.85}
                  onPress={() => setShowOffer(true)}
                >
                  <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                  <Text style={styles.ctaText}>Send Offer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          <Modal
            visible={showOffer}
            transparent
            animationType="slide"
            onRequestClose={closeOffer}
          >
            <KeyboardAvoidingView
              style={styles.offerBackdrop}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <Pressable style={styles.offerBackdrop} onPress={closeOffer}>
                <Pressable style={styles.offerSheet}>
                  <View style={styles.offerHeader}>
                    <TouchableOpacity
                      style={styles.offerBack}
                      onPress={closeOffer}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-back" size={22} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.offerTitle}>Send Offer</Text>
                    <View style={styles.offerBack} />
                  </View>

                  <Text style={styles.offerLabel}>Your price</Text>
                  <View style={styles.offerField}>
                    <Text style={styles.offerNaira}>₦</Text>
                    <TextInput
                      value={offerPrice}
                      onChangeText={setOfferPrice}
                      placeholder="Enter amount"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      style={styles.offerInput}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.ctaButton,
                      !offerPrice.replace(/[^\d]/g, "") && styles.ctaDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={!offerPrice.replace(/[^\d]/g, "")}
                    onPress={sendOffer}
                  >
                    <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                    <Text style={styles.ctaText}>Send Offer</Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    paddingTop: 56,
    flex: 1,
    backgroundColor: "#000",
  },
  sheet: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 16,
  },
  imageContainer: {
    width: "100%",
    height: 280,
    backgroundColor: "#E5E7EB",
  },
  image: {
    height: 280,
  },
  closeButton: {
    position: "absolute",
    top: 54,
    left: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  contentWrap: {
    marginTop: -8,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 22,
  },
  badge: {
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  metaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    paddingBottom: 4,
  },
  metaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  metaTextWrap: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
    marginBottom: 20,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  thumb: {
    width: 88,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  ctaButton: {
    backgroundColor: GREEN,
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  offerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  offerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  offerHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  offerBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  offerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  offerLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  offerField: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offerNaira: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  offerInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 12,
  },
});
