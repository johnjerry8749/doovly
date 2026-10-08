import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  getProfessionalById,
  listMyServicesAsync,
  createMyService,
  updateMyService,
  deleteMyService,
  listServiceCategoriesAsync,
  invalidateProfessionalsCache,
  type ProService,
} from "@/services/professionals";
import {
  getLoggedInProfessionalId,
  isCurrentUserPro,
} from "@/services/savedProviders";
import {
  listPromotionPackagesAsync,
  promoteServiceAsync,
} from "@/services/servicePromotions";

const PRIMARY = "#16A34A";
const LIGHT_GREEN = "#EAF8F0";
const BORDER = "#E5E7EB";
const TEXT = "#111827";
const SECONDARY = "#6B7280";

/** Free users can add at most this many services. Pro (subscribed) = unlimited. */
const FREE_SERVICE_LIMIT = 5;

function priceToInput(price: string): string {
  return String(price).replace(/[^0-9.]/g, "");
}

function formatPrice(value: string): string {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n)) return value;
  return `₦${n.toLocaleString()}`;
}

export default function AddService() {
  const proId = getLoggedInProfessionalId();
  const pro = proId ? getProfessionalById(proId) : undefined;
  const isPro = isCurrentUserPro();
  const [categories, setCategories] = useState<{ name: string; icon?: string }[]>([]);

  const [services, setServices] = useState<ProService[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [promotionModalVisible, setPromotionModalVisible] = useState(false);
  const [promotionPackages, setPromotionPackages] = useState<Awaited<ReturnType<typeof listPromotionPackagesAsync>>>([]);
  const [promotionService, setPromotionService] = useState<ProService | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [selectedPromotionPackageId, setSelectedPromotionPackageId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const loadServices = useCallback(async () => {
    if (!proId) {
      setServices([]);
      setLoading(false);
      return;
    }
    try {
      const [list, nextCategories] = await Promise.all([
        listMyServicesAsync(proId),
        listServiceCategoriesAsync(),
      ]);
      setServices(list);
      setCategories(nextCategories.filter((item) => item.name !== "All"));
    } catch (error) {
      console.warn("My services load failed:", error);
      Alert.alert(
        "Could not load services",
        "Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [proId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const atFreeLimit = !isPro && services.length >= FREE_SERVICE_LIMIT;

  const resetForm = () => {
    setSelectedCategory(null);
    setServiceName("");
    setDescription("");
    setPrice("");
    setEditingServiceId(null);
    setCategoryOpen(false);
  };

  const openAddModal = () => {
    if (atFreeLimit) {
      Alert.alert(
        "Service limit reached",
        `Free accounts can add up to ${FREE_SERVICE_LIMIT} services. Upgrade to Doovly Pro for unlimited services.`,
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Upgrade",
            onPress: () =>
              router.push("/profile/subscription/subscription"),
          },
        ],
      );
      return;
    }
    resetForm();
    setSelectedCategory(pro?.profession ?? null);
    setModalVisible(true);
  };

  const openEditModal = (service: ProService) => {
    setEditingServiceId(service.id);
    setSelectedCategory(pro?.profession ?? null);
    setServiceName(service.name);
    setDescription(service.description);
    setPrice(priceToInput(service.price));
    setCategoryOpen(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setCategoryOpen(false);
  };

  const handleSave = async () => {
    if (!serviceName.trim()) {
      Alert.alert("Missing service name", "Please enter your service name.");
      return;
    }
    if (!description.trim()) {
      Alert.alert(
        "Missing description",
        "Please describe the service you provide.",
      );
      return;
    }
    if (!price.trim()) {
      Alert.alert("Missing price", "Please enter the price for this service.");
      return;
    }

    // Block new services for free users at limit (edit is always allowed)
    if (!editingServiceId && atFreeLimit) {
      Alert.alert(
        "Service limit reached",
        `Free accounts can add up to ${FREE_SERVICE_LIMIT} services. Upgrade to Doovly Pro for unlimited services.`,
      );
      return;
    }

    setSaving(true);
    try {
      const categoryIcon =
        categories.find((c) => c.name === selectedCategory)?.icon ||
        "briefcase-outline";

      if (editingServiceId) {
        if (!proId) return;
        const updated = await updateMyService(
          proId,
          editingServiceId,
          {
            name: serviceName.trim(),
            description: description.trim(),
            price: price.trim(),
            icon: categoryIcon,
          },
        );
        if (!updated) {
          throw new Error("The service could not be found or updated.");
        }

        setServices((prev) =>
          prev.map((s) => (s.id === editingServiceId ? updated : s)),
        );
        Alert.alert("Service Updated", "Your service has been updated.");
      } else {
        if (!proId) return;
        const created = await createMyService(proId, {
          name: serviceName.trim(),
          description: description.trim(),
          price: price.trim(),
          icon: categoryIcon,
        });
        setServices((prev) => [...prev, created]);
        Alert.alert("Service Added", "Your service has been added.");
      }
      closeModal();
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (service: ProService) => {
    if (!proId) {
      Alert.alert("Promotion unavailable", "Your professional profile could not be loaded.");
      return;
    }

    if (service.promotionActive) {
      Alert.alert("Already promoted", "This service is currently being promoted.");
      return;
    }

    try {
      const packages = await listPromotionPackagesAsync();
      if (!packages.length) {
        Alert.alert(
          "Promotion unavailable",
          "Promotion packages are not available yet. Please try again later.",
        );
        return;
      }

      setPromotionService(service);
      setPromotionPackages(packages);
      setSelectedPromotionPackageId(packages[0]?.id ?? null);
      setPromotionModalVisible(true);
    } catch {
      Alert.alert(
        "Promotion unavailable",
        "Please check your connection and try again.",
      );
    }
  };

  const closePromotionModal = () => {
    if (promotionLoading) return;
    setPromotionModalVisible(false);
    setPromotionService(null);
    setPromotionPackages([]);
    setSelectedPromotionPackageId(null);
  };

  const handlePromotionPurchase = async () => {
    if (!promotionService || !proId || !selectedPromotionPackageId) return;

    setPromotionLoading(true);
    try {
      const result = await promoteServiceAsync(
        promotionService,
        proId,
        selectedPromotionPackageId,
      );

      if (result.activated) {
        invalidateProfessionalsCache();
        const refreshed = await listMyServicesAsync(proId);
        setServices(refreshed);
      }

      closePromotionModal();
    } catch (error: any) {
      if (error?.message !== "PURCHASE_CANCELLED") {
        Alert.alert(
          "Promotion",
          error?.message ||
            "We could not complete the promotion. Please try again.",
        );
      }
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!proId) return;
            const ok = await deleteMyService(proId, id);
            if (!ok) {
              Alert.alert(
                "Could not delete",
                "The service could not be deleted. Please check your connection and try again.",
              );
              return;
            }

            setServices((prev) => prev.filter((s) => s.id !== id));
            if (editingServiceId === id) closeModal();
          },
        },
      ],
    );
  };

  const activeCount = services.length;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>My Services</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusLeft}>
            <View style={styles.statusIconWrap}>
              <MaterialCommunityIcons
                name="briefcase-check"
                size={28}
                color={PRIMARY}
              />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitle}>You're all set!</Text>
              <Text style={styles.statusSubtitle}>
                You have {activeCount} active service
                {activeCount === 1 ? "" : "s"}
                {!isPro
                  ? ` · Free plan: ${activeCount}/${FREE_SERVICE_LIMIT}`
                  : ""}.{" "}
                Keep your services updated to get more bookings.
              </Text>
            </View>
          </View>
          <View style={styles.growthIcon}>
            <Ionicons name="trending-up" size={20} color={PRIMARY} />
          </View>
        </View>

        {/* Add New Service — top so users don't scroll */}
        <Pressable
          style={({ pressed }) => [
            styles.addNewBox,
            pressed && styles.addNewBoxPressed,
            atFreeLimit && styles.addNewBoxDisabled,
          ]}
          onPress={openAddModal}
        >
          <View style={styles.addNewContent}>
            <Ionicons
              name={atFreeLimit ? "lock-closed-outline" : "add-circle-outline"}
              size={26}
              color={atFreeLimit ? "#9CA3AF" : PRIMARY}
            />
            <Text
              style={[
                styles.addNewTitle,
                atFreeLimit && styles.addNewTitleDisabled,
              ]}
            >
              {atFreeLimit ? "Limit reached — Upgrade for more" : "Add New Service"}
            </Text>
          </View>
          <Text style={styles.addNewSubtitle}>
            {atFreeLimit              ? `Free accounts can add up to ${FREE_SERVICE_LIMIT} services. Go Pro for unlimited.`
              : isPro
                ? "Pro plan — add unlimited services."
                : `Offer more services and attract more customers. (${activeCount}/${FREE_SERVICE_LIMIT} used)`}
          </Text>
        </Pressable>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Added Services</Text>
          <Text style={styles.sectionCount}>
            {services.length} service{services.length === 1 ? "" : "s"}
            {!isPro ? ` · max ${FREE_SERVICE_LIMIT}` : ""}
          </Text>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Loading services…</Text>
        ) : services.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="briefcase-outline"
              size={36}
              color="#9CA3AF"
            />
            <Text style={styles.emptyTitle}>No services yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first service to start getting bookings.
            </Text>
          </View>
        ) : (
          services.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceCardTop}>
                <View style={styles.serviceIconWrap}>
                  <MaterialCommunityIcons
                    name={
                      (service.icon ||
                        "briefcase-outline") as keyof typeof MaterialCommunityIcons.glyphMap
                    }
                    size={24}
                    color={PRIMARY}
                  />
                </View>

                <View style={styles.serviceMain}>
                  <View style={styles.serviceNameRow}>
                    <Text style={styles.serviceName} numberOfLines={1}>
                      {service.name}
                    </Text>
                    <Text style={styles.servicePrice}>
                      {service.price.startsWith("₦")
                        ? service.price
                        : formatPrice(service.price)}
                    </Text>
                  </View>

                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {service.description}
                  </Text>

                  <View style={styles.badgeRow}>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                    {service.promotionActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Promoted</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.serviceActions}>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => openEditModal(service)}
                >
                  <Ionicons name="pencil" size={14} color={PRIMARY} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>

                <Pressable
                  style={styles.editBtn}
                  onPress={() => void handlePromote(service)}
                  disabled={service.promotionActive}
                >
                  <Ionicons
                    name={service.promotionActive ? "checkmark-circle" : "megaphone-outline"}
                    size={14}
                    color={PRIMARY}
                  />
                  <Text style={styles.editBtnText}>
                    {service.promotionActive ? "Promoted" : "Promote"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(service.id)}
                >
                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ===================== ADD / EDIT MODAL ===================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingServiceId ? "Edit Service" : "Add New Service"}
              </Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={24} color={SECONDARY} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalBody}
            >
              {/* Category */}
              <Text style={styles.label}>Service Category</Text>
              <Pressable
                style={[
                  styles.dropdown,
                  categoryOpen && styles.dropdownOpen,
                ]}
                onPress={() => setCategoryOpen((p) => !p)}
              >
                <View style={styles.dropdownLeft}>
                  <View style={styles.dropdownIcon}>
                    <MaterialCommunityIcons
                      name={
                        ((categories.find((c) => c.name === selectedCategory)
                          ?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ||
                          "shape-outline")
                      }
                      size={20}
                      color={PRIMARY}
                    />
                  </View>
                  <Text
                    style={[
                      styles.dropdownText,
                      !selectedCategory && styles.placeholder,
                    ]}
                  >
                    {selectedCategory || "Select a service category"}
                  </Text>
                </View>
                <Ionicons
                  name={categoryOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={SECONDARY}
                />
              </Pressable>

              {categoryOpen && (
                <View style={styles.categoryList}>
                  {categories.map((cat) => {
                    const selected = selectedCategory === cat.name;
                    return (
                      <Pressable
                        key={cat.name}
                        style={[
                          styles.categoryOption,
                          selected && styles.categoryOptionSelected,
                        ]}
                        onPress={() => handleSelectCategory(cat.name)}
                      >
                        <View style={styles.categoryOptionLeft}>
                          <View
                            style={[
                              styles.categoryOptionIcon,
                              selected && styles.categoryOptionIconSelected,
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={
                                cat.icon as keyof typeof MaterialCommunityIcons.glyphMap
                              }
                              size={18}
                              color={selected ? "#FFFFFF" : PRIMARY}
                            />
                          </View>
                          <Text
                            style={[
                              styles.categoryOptionText,
                              selected && styles.categoryOptionTextSelected,
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </View>
                        {selected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={PRIMARY}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Service Name */}
              <Text style={[styles.label, { marginTop: 18 }]}>
                Service Name
              </Text>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons
                  name="briefcase-outline"
                  size={20}
                  color={PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Plumbing Repair"
                  placeholderTextColor="#9CA3AF"
                  value={serviceName}
                  onChangeText={setServiceName}
                  autoCapitalize="words"
                />
              </View>

              {/* Description */}
              <Text style={[styles.label, { marginTop: 18 }]}>
                Description
              </Text>
              <View style={[styles.inputRow, styles.descRow]}>
                <MaterialCommunityIcons
                  name="text-box-outline"
                  size={20}
                  color={PRIMARY}
                  style={[styles.inputIcon, { marginTop: 2 }]}
                />
                <TextInput
                  style={[styles.input, styles.descInput]}
                  placeholder="Describe what this service includes..."
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Price */}
              <Text style={[styles.label, { marginTop: 18 }]}>Price</Text>
              <View style={styles.inputRow}>
                <Text style={styles.currency}>₦</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter price"
                  placeholderTextColor="#9CA3AF"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>

              {/* Save button */}
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  (pressed || saving) && { opacity: 0.85 },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                <Ionicons
                  name={
                    editingServiceId
                      ? "checkmark-circle-outline"
                      : "add-circle-outline"
                  }
                  size={22}
                  color="#FFFFFF"
                />
                <Text style={styles.saveBtnText}>
                  {saving
                    ? "Saving…"
                    : editingServiceId
                      ? "Update Service"
                      : "Add Service"}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelBtn} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={promotionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closePromotionModal}
      >
        <View style={styles.promotionOverlay}>
          <Pressable
            style={styles.promotionBackdrop}
            onPress={closePromotionModal}
          />

          <View style={styles.promotionCard}>
            <View style={styles.promotionTopBar}>
              <View style={styles.promotionTopIcon}>
                <Ionicons name="megaphone" size={20} color="#FFFFFF" />
              </View>

              <Pressable
                style={styles.promotionClose}
                onPress={closePromotionModal}
                disabled={promotionLoading}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color={TEXT} />
              </Pressable>
            </View>

            <Text style={styles.promotionTitle}>Boost your service</Text>
            <Text style={styles.promotionSubtitle} numberOfLines={2}>
              {promotionService?.name || "Choose a promotion package"}
            </Text>

            <View style={styles.promotionBenefits}>
              <View style={styles.promotionBenefit}>
                <View style={styles.promotionBenefitIcon}>
                  <Ionicons name="trending-up" size={16} color={PRIMARY} />
                </View>
                <View style={styles.promotionBenefitText}>
                  <Text style={styles.promotionBenefitTitle}>More visibility</Text>
                  <Text style={styles.promotionBenefitDescription}>
                    Appear higher in relevant searches.
                  </Text>
                </View>
              </View>

              <View style={[styles.promotionBenefit, { marginTop: 10 }]}>
                <View style={styles.promotionBenefitIcon}>
                  <Ionicons name="people-outline" size={16} color={PRIMARY} />
                </View>
                <View style={styles.promotionBenefitText}>
                  <Text style={styles.promotionBenefitTitle}>Reach more customers</Text>
                  <Text style={styles.promotionBenefitDescription}>
                    Put your service in front of more people.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.promotionSectionRow}>
              <Text style={styles.promotionSectionTitle}>Choose a package</Text>
              <Text style={styles.promotionSectionHint}>One-time payment</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.promotionOptions}
            >
              {promotionPackages.map((pkg) => {
                const selected = selectedPromotionPackageId === pkg.id;
                const recommended = pkg.durationDays === 30;

                return (
                  <Pressable
                    key={pkg.id}
                    style={[
                      styles.promotionOption,
                      selected && styles.promotionOptionSelected,
                    ]}
                    onPress={() => setSelectedPromotionPackageId(pkg.id)}
                    disabled={promotionLoading}
                  >
                    <View
                      style={[
                        styles.promotionRadio,
                        selected && styles.promotionRadioSelected,
                      ]}
                    >
                      {selected && <View style={styles.promotionRadioDot} />}
                    </View>

                    <View style={styles.promotionOptionMain}>
                      <View style={styles.promotionOptionTitleRow}>
                        <Text style={styles.promotionOptionName}>{pkg.name}</Text>
                        {recommended && (
                          <View style={styles.promotionRecommended}>
                            <Text style={styles.promotionRecommendedText}>
                              BEST VALUE
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.promotionOptionDuration}>
                        {pkg.durationDays} {pkg.durationDays === 1 ? "day" : "days"} of priority visibility
                      </Text>
                    </View>

                    <Text style={styles.promotionOptionPrice}>
                      {pkg.priceString || "Price unavailable"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.promotionFooter}>
              <Text style={styles.promotionPriceNote}>
                Price is supplied by the App Store or Google Play.
              </Text>

              <Pressable
                style={[
                  styles.promotionContinue,
                  (!selectedPromotionPackageId || promotionLoading) &&
                    styles.promotionContinueDisabled,
                ]}
                onPress={() => void handlePromotionPurchase()}
                disabled={!selectedPromotionPackageId || promotionLoading}
              >
                <Text style={styles.promotionContinueText}>
                  {promotionLoading ? "Processing…" : "Continue to payment"}
                </Text>
                {!promotionLoading && (
                  <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT,
  },
  headerSpacer: {
    width: 40,
  },

  container: {
    padding: 16,
  },

  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 16,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },
  statusSubtitle: {
    fontSize: 13,
    color: SECONDARY,
    marginTop: 3,
    lineHeight: 18,
  },
  growthIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
  },
  sectionCount: {
    fontSize: 13,
    color: SECONDARY,
    fontWeight: "500",
  },

  loadingText: {
    fontSize: 14,
    color: SECONDARY,
    textAlign: "center",
    marginVertical: 24,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: SECONDARY,
    marginTop: 4,
    textAlign: "center",
  },

  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5EDE8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  serviceCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  serviceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceMain: {
    flex: 1,
    minWidth: 0,
  },
  serviceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
    flex: 1,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: "700",
    color: PRIMARY,
  },
  serviceDesc: {
    fontSize: 13,
    color: SECONDARY,
    lineHeight: 18,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  activeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
  },
  serviceActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },

  addNewBox: {
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  addNewBoxPressed: {
    backgroundColor: "#F0FDF4",
  },
  addNewBoxDisabled: {
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  addNewContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addNewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
  },
  addNewTitleDisabled: {
    color: "#6B7280",
  },
  addNewSubtitle: {
    fontSize: 13,
    color: SECONDARY,
    marginTop: 6,
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 10 : 0,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 8,
  },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownOpen: {
    borderColor: PRIMARY,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT,
    flex: 1,
  },
  placeholder: {
    color: "#9CA3AF",
    fontWeight: "500",
  },

  categoryList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categoryOptionSelected: {
    backgroundColor: LIGHT_GREEN,
  },
  categoryOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  categoryOptionIconSelected: {
    backgroundColor: PRIMARY,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },
  categoryOptionTextSelected: {
    color: PRIMARY,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    paddingVertical: 13,
  },
  descRow: {
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  descInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  currency: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
    marginRight: 6,
  },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 24,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelBtnText: {
    color: SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },

  promotionOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  promotionBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17,24,39,0.58)",
  },
  promotionCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 18 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  promotionTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promotionTopIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  promotionClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  promotionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: TEXT,
    marginTop: 14,
  },
  promotionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: SECONDARY,
    marginTop: 4,
  },
  promotionBenefits: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
  },
  promotionBenefit: {
    flexDirection: "row",
    alignItems: "center",
  },
  promotionBenefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  promotionBenefitText: {
    flex: 1,
  },
  promotionBenefitTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
  },
  promotionBenefitDescription: {
    fontSize: 11,
    color: SECONDARY,
    marginTop: 2,
  },
  promotionSectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  promotionSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
  },
  promotionSectionHint: {
    fontSize: 11,
    color: SECONDARY,
    fontWeight: "600",
  },
  promotionOptions: {
    paddingBottom: 4,
  },
  promotionOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 9,
    backgroundColor: "#FFFFFF",
  },
  promotionOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#F0FDF4",
  },
  promotionRadio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  promotionRadioSelected: {
    borderColor: PRIMARY,
  },
  promotionRadioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: PRIMARY,
  },
  promotionOptionMain: {
    flex: 1,
    minWidth: 0,
  },
  promotionOptionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  promotionOptionName: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
    flexShrink: 1,
  },
  promotionRecommended: {
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  promotionRecommendedText: {
    fontSize: 8,
    fontWeight: "800",
    color: PRIMARY,
    letterSpacing: 0.3,
  },
  promotionOptionDuration: {
    fontSize: 11,
    color: SECONDARY,
    marginTop: 4,
  },
  promotionOptionPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: PRIMARY,
    marginLeft: 8,
  },
  promotionFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginTop: 8,
    paddingTop: 12,
  },
  promotionContinue: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 15,
    minHeight: 50,
    paddingHorizontal: 16,
    gap: 9,
  },
  promotionContinueDisabled: {
    opacity: 0.55,
  },
  promotionContinueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  promotionPriceNote: {
    fontSize: 10,
    color: SECONDARY,
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 14,
  },
});