import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import {
  invalidateProfessionalsCache,
  listMyServicesAsync,
  type ProService,
} from "@/services/professionals";
import { getLoggedInProfessionalId } from "@/services/savedProviders";
import {
  getProfessionalPromotionLockAsync,
  listPromotionPackagesAsync,
  promoteServiceAsync,
  type PromotionPackage,
} from "@/services/servicePromotions";

const PRIMARY = "#16A34A";
const LIGHT_GREEN = "#EAF8F0";
const BORDER = "#E5E7EB";
const TEXT = "#111827";
const SECONDARY = "#6B7280";

export default function PromoteServiceScreen() {
  const professionalId = getLoggedInProfessionalId();
  const [services, setServices] = useState<ProService[]>([]);
  const [packages, setPackages] = useState<PromotionPackage[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [activePromotion, setActivePromotion] = useState<Awaited<ReturnType<typeof getProfessionalPromotionLockAsync>>>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const load = useCallback(async () => {
    if (!professionalId) {
      setServices([]);
      setPackages([]);
      setActivePromotion(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      invalidateProfessionalsCache();
      const [myServices, availablePackages, lock] = await Promise.all([
        listMyServicesAsync(professionalId),
        listPromotionPackagesAsync(),
        getProfessionalPromotionLockAsync(professionalId),
      ]);
      setServices(myServices);
      setPackages(availablePackages);
      setActivePromotion(lock);
      setSelectedServiceId((current) =>
        current && myServices.some((service) => service.id === current && !service.promotionActive)
          ? current
          : myServices.find((service) => !service.promotionActive)?.id ?? null,
      );
      setSelectedPackageId((current) =>
        current && availablePackages.some((item) => item.id === current)
          ? current
          : availablePackages[0]?.id ?? null,
      );
    } catch (error) {
      console.warn("[Promotion] could not load promotion screen:", error);
      Alert.alert("Promotion unavailable", "Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useFocusEffect(
    React.useCallback(() => {
      void load();
    }, [load]),
  );

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;
  const hasActivePromotion = Boolean(activePromotion && activePromotion.status === "active");
  const hasPendingPromotion = Boolean(activePromotion && activePromotion.status === "pending");

  const purchase = async () => {
    if (!professionalId || !selectedService || !selectedPackageId) {
      Alert.alert("Choose a service", "Select the service you want to promote first.");
      return;
    }
    if (activePromotion) {
      Alert.alert(
        hasActivePromotion ? "Promotion already active" : "Promotion processing",
        hasActivePromotion
          ? "You can promote another service after your current promotion expires."
          : "Please wait for your current promotion purchase to finish.",
      );
      return;
    }

    setPurchasing(true);
    try {
      const result = await promoteServiceAsync(selectedService, professionalId, selectedPackageId);
      invalidateProfessionalsCache();
      await load();
      if (result.activated) {
        Alert.alert("Promotion active", "Your service is now promoted and will appear higher in relevant searches.");
      } else {
        Alert.alert("Payment processing", "Your purchase is being confirmed. Promotion will activate when the payment is verified.");
      }
    } catch (error: any) {
      if (error?.message !== "PURCHASE_CANCELLED") {
        Alert.alert("Promotion", error?.message || "We could not complete the promotion. Please try again.");
      }
      await load();
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} disabled={purchasing}>
          <Ionicons name="chevron-back" size={28} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Promote a Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading your services…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons name="megaphone" size={22} color={PRIMARY} />
            </View>
            <View style={styles.introCopy}>
              <Text style={styles.title}>Get more visibility</Text>
              <Text style={styles.subtitle}>Choose one of your services, then select a promotion duration.</Text>
            </View>
          </View>

          {activePromotion ? (
            <View style={styles.lockNotice}>
              <Ionicons name={hasActivePromotion ? "checkmark-circle" : "time-outline"} size={20} color={PRIMARY} />
              <View style={styles.lockCopy}>
                <Text style={styles.lockTitle}>{hasActivePromotion ? "Promotion currently active" : "Promotion purchase processing"}</Text>
                <Text style={styles.lockText}>
                  {hasActivePromotion
                    ? "Your current promoted service stays prioritized until its promotion ends. You can promote another service after that."
                    : "Please wait while your current purchase is confirmed before starting another promotion."}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>1. Select a service</Text>
          {services.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="briefcase-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No services yet</Text>
              <Text style={styles.emptyText}>Add a service before starting a promotion.</Text>
              <Pressable style={styles.addServiceButton} onPress={() => router.push("/profile/addservice")}>
                <Text style={styles.addServiceButtonText}>Add Service</Text>
              </Pressable>
            </View>
          ) : (
            services.map((service) => {
              const selected = selectedServiceId === service.id;
              const isPromoted = Boolean(service.promotionActive || activePromotion?.serviceId === service.id);
              const disabled = Boolean(activePromotion) || isPromoted;
              return (
                <Pressable
                  key={service.id}
                  style={[
                    styles.serviceOption,
                    selected && styles.serviceOptionSelected,
                    disabled && styles.optionDisabled,
                  ]}
                  onPress={() => setSelectedServiceId(service.id)}
                  disabled={disabled || purchasing}
                >
                  <View style={styles.serviceCardTop}>
                    <View style={[styles.serviceIcon, selected && styles.serviceIconSelected]}>
                      <MaterialCommunityIcons name={(service.icon || "briefcase-outline") as any} size={23} color={PRIMARY} />
                    </View>
                    {isPromoted ? (
                      <View style={styles.promotedBadge}>
                        <Ionicons name="trending-up" size={12} color={PRIMARY} />
                        <Text style={styles.promotedBadgeText}>Promoted</Text>
                      </View>
                    ) : (
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                    )}
                  </View>

                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>
                    {service.description?.trim() || "No description added for this service yet."}
                  </Text>

                  <View style={styles.serviceCardFooter}>
                    <View style={styles.pricePill}>
                      <Text style={styles.servicePrice}>{service.price}</Text>
                    </View>
                    <Text style={[styles.selectionLabel, selected && styles.selectionLabelSelected]}>
                      {isPromoted ? "Currently promoted" : selected ? "Selected for promotion" : "Tap to select"}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}

          <Text style={styles.sectionTitle}>2. Choose a package</Text>
          {packages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Packages unavailable</Text>
              <Text style={styles.emptyText}>Promotion packages are not available right now. Please try again later.</Text>
            </View>
          ) : (
            packages.map((item) => {
              const selected = selectedPackageId === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.packageOption, selected && styles.packageOptionSelected, (Boolean(activePromotion) || purchasing) && styles.optionDisabled]}
                  onPress={() => setSelectedPackageId(item.id)}
                  disabled={Boolean(activePromotion) || purchasing}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.packageCopy}>
                    <Text style={styles.packageName}>{item.name}</Text>
                    <Text style={styles.packageDuration}>{item.durationDays} {item.durationDays === 1 ? "day" : "days"} of priority visibility</Text>
                  </View>
                  <Text style={styles.packagePrice}>{item.priceString || "Price unavailable"}</Text>
                </Pressable>
              );
            })
          )}

          <Text style={styles.priceNote}>Price is supplied by the App Store or Google Play.</Text>
          <Pressable
            style={[styles.continueButton, (!selectedService || !selectedPackageId || Boolean(activePromotion) || purchasing) && styles.continueDisabled]}
            onPress={() => void purchase()}
            disabled={!selectedService || !selectedPackageId || Boolean(activePromotion) || purchasing || services.every((service) => service.promotionActive)}
          >
            <Text style={styles.continueText}>{purchasing ? "Processing…" : hasActivePromotion ? "Promotion already active" : hasPendingPromotion ? "Payment processing" : "Continue to payment"}</Text>
            {!purchasing && !activePromotion ? <Ionicons name="arrow-forward" size={19} color="#FFFFFF" /> : null}
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#FFFFFF",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: TEXT },
  headerSpacer: { width: 40 },
  container: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  loadingText: { fontSize: 14, color: SECONDARY },
  introCard: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 16, padding: 16, marginBottom: 20,
  },
  introIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: LIGHT_GREEN },
  introCopy: { flex: 1 },
  title: { fontSize: 16, fontWeight: "800", color: TEXT },
  subtitle: { fontSize: 13, color: SECONDARY, lineHeight: 18, marginTop: 4 },
  lockNotice: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: LIGHT_GREEN, borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 14, padding: 12, marginBottom: 18 },
  lockCopy: { flex: 1 },
  lockTitle: { fontSize: 14, fontWeight: "700", color: TEXT },
  lockText: { fontSize: 12, color: SECONDARY, lineHeight: 17, marginTop: 3 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: TEXT, marginBottom: 10, marginTop: 8 },
  serviceOption: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#F4FCF7",
    shadowColor: PRIMARY,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  optionDisabled: { opacity: 0.65 },
  serviceCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  serviceIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LIGHT_GREEN,
  },
  serviceIconSelected: { backgroundColor: "#D1FAE5" },
  serviceName: { fontSize: 15, fontWeight: "800", color: TEXT, lineHeight: 21 },
  serviceDescription: {
    fontSize: 13,
    color: SECONDARY,
    lineHeight: 19,
    marginTop: 6,
  },
  serviceCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  pricePill: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  servicePrice: { fontSize: 13, fontWeight: "800", color: PRIMARY },
  selectionLabel: { fontSize: 11, fontWeight: "600", color: SECONDARY },
  selectionLabelSelected: { color: PRIMARY },
  promotedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  promotedBadgeText: { fontSize: 11, fontWeight: "700", color: PRIMARY },
  radio: { width: 20, height: 20, borderWidth: 1.5, borderColor: "#9CA3AF", borderRadius: 10, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: PRIMARY },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  packageOption: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, marginBottom: 10 },
  packageOptionSelected: { borderColor: PRIMARY, backgroundColor: LIGHT_GREEN },
  packageCopy: { flex: 1 },
  packageName: { fontSize: 14, fontWeight: "700", color: TEXT },
  packageDuration: { fontSize: 12, color: SECONDARY, marginTop: 3 },
  packagePrice: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  emptyCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 20, marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: TEXT, marginTop: 8, textAlign: "center" },
  emptyText: { fontSize: 13, color: SECONDARY, lineHeight: 18, textAlign: "center", marginTop: 4 },
  addServiceButton: { marginTop: 12, backgroundColor: PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  addServiceButtonText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  priceNote: { fontSize: 11, color: SECONDARY, marginTop: 4, marginBottom: 12, textAlign: "center" },
  continueButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  continueDisabled: { opacity: 0.5 },
  continueText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
