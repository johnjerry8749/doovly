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
  getMyProfessionalId,
  listMyServices,
  createMyService,
  updateMyService,
  deleteMyService,
  listServiceCategories,
  type ProService,
  type Professional,
  type ServiceCategory,
} from "@/services/professionals";

const PRIMARY = "#16A34A";
const LIGHT_GREEN = "#EAF8F0";
const BORDER = "#E5E7EB";
const TEXT = "#111827";
const SECONDARY = "#6B7280";
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
  const [proId, setProId] = useState<string | null>(null);
  const [pro, setPro] = useState<Professional | undefined>(undefined);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ProService[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const isPro = !!pro?.subscribed;

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const resolvedId = await getMyProfessionalId();
      setProId(resolvedId);

      const [cats, list, proData] = await Promise.all([
        listServiceCategories().catch(() => [{ name: "All", icon: "apps" }]),
        listMyServices(resolvedId ?? undefined).catch(() => []),
        resolvedId
          ? getProfessionalById(resolvedId).catch(() => undefined)
          : Promise.resolve(undefined),
      ]);

      setCategories(cats);
      setServices(list);
      setPro(proData);
    } catch (e) {
      console.error("AddService load error:", e);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
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
        const updated = await updateMyService(
          proId ?? undefined,
          editingServiceId,
          {
            name: serviceName.trim(),
            description: description.trim(),
            price: price.trim(),
            icon: categoryIcon,
          },
        );
        if (updated) {
          setServices((prev) =>
            prev.map((s) => (s.id === editingServiceId ? updated : s)),
          );
          Alert.alert("Service Updated", "Your service has been updated.");
        }
      } else {
        const created = await createMyService(proId ?? undefined, {
          name: serviceName.trim(),
          description: description.trim(),
          price: price.trim(),
          icon: categoryIcon,
        });
        setServices((prev) => [...prev, created]);
        Alert.alert("Service Added", "Your service has been added.");
      }
      closeModal();
    } catch (e) {
      console.error("Save service error:", e);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
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
            const ok = await deleteMyService(proId ?? undefined, id);
            if (ok) {
              setServices((prev) => prev.filter((s) => s.id !== id));
              if (editingServiceId === id) closeModal();
            }
          },
        },
      ],
    );
  };

  const activeCount = services.length;

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
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
              {atFreeLimit
                ? "Limit reached — Upgrade for more"
                : "Add New Service"}
            </Text>
          </View>
          <Text style={styles.addNewSubtitle}>
            {atFreeLimit
              ? `Free accounts can add up to ${FREE_SERVICE_LIMIT} services. Go Pro for unlimited.`
              : isPro
                ? "Pro plan — add unlimited services."
                : `Offer more services and attract more customers. (${activeCount}/${FREE_SERVICE_LIMIT} used)`}
          </Text>
        </Pressable>

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
              <Text style={styles.label}>Service Category</Text>
              <Pressable
                style={[styles.dropdown, categoryOpen && styles.dropdownOpen]}
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
                  {categories
                    .filter((c) => c.name !== "All")
                    .map((cat) => {
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

              <Text style={[styles.label, { marginTop: 18 }]}>Service Name</Text>
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

              <Text style={[styles.label, { marginTop: 18 }]}>Description</Text>
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

              <Text style={[styles.label, { marginTop: 18 }]}>Price (₦)</Text>
              <View style={styles.inputRow}>
                <MaterialCommunityIcons
                  name="currency-ngn"
                  size={20}
                  color={PRIMARY}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5000"
                  placeholderTextColor="#9CA3AF"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>

              <Pressable
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving
                    ? "Saving…"
                    : editingServiceId
                      ? "Update Service"
                      : "Add Service"}
                </Text>
              </Pressable>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: TEXT,
  },
  headerSpacer: { width: 40 },
  container: { padding: 16, paddingBottom: 40 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  statusLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusTextWrap: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  statusSubtitle: { fontSize: 12, color: SECONDARY, marginTop: 2, lineHeight: 16 },
  growthIcon: { marginLeft: 8 },
  addNewBox: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#F9FFFB",
  },
  addNewBoxPressed: { opacity: 0.85 },
  addNewBoxDisabled: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  addNewContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  addNewTitle: { fontSize: 15, fontWeight: "700", color: PRIMARY },
  addNewTitleDisabled: { color: "#9CA3AF" },
  addNewSubtitle: { fontSize: 12, color: SECONDARY, marginTop: 6, lineHeight: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
  sectionCount: { fontSize: 12, color: SECONDARY },
  loadingText: { textAlign: "center", color: SECONDARY, marginTop: 24 },
  emptyBox: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginTop: 10 },
  emptySubtitle: {
    fontSize: 13,
    color: SECONDARY,
    marginTop: 4,
    textAlign: "center",
  },
  serviceCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  serviceCardTop: { flexDirection: "row" },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  serviceMain: { flex: 1 },
  serviceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  serviceName: { flex: 1, fontSize: 15, fontWeight: "700", color: TEXT },
  servicePrice: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  serviceDesc: { fontSize: 12, color: SECONDARY, marginTop: 4, lineHeight: 16 },
  badgeRow: { flexDirection: "row", marginTop: 8 },
  activeBadge: {
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: { fontSize: 11, fontWeight: "700", color: PRIMARY },
  serviceActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: LIGHT_GREEN,
  },
  editBtnText: { fontSize: 12, fontWeight: "600", color: PRIMARY },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#DC2626" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: TEXT },
  modalBody: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: "700", color: TEXT, marginBottom: 8 },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownOpen: { borderColor: PRIMARY },
  dropdownLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  dropdownIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dropdownText: { fontSize: 14, color: TEXT, flex: 1 },
  placeholder: { color: "#9CA3AF" },
  categoryList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    maxHeight: 200,
    overflow: "hidden",
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  categoryOptionSelected: { backgroundColor: LIGHT_GREEN },
  categoryOptionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  categoryOptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  categoryOptionIconSelected: { backgroundColor: PRIMARY },
  categoryOptionText: { fontSize: 14, color: TEXT },
  categoryOptionTextSelected: { fontWeight: "700", color: PRIMARY },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  descRow: { alignItems: "flex-start", paddingVertical: 10, minHeight: 100 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: TEXT, paddingVertical: 10 },
  descInput: { minHeight: 80, textAlignVertical: "top" },
  saveBtn: {
    marginTop: 24,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
