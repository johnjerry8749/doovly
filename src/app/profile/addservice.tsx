import React, { useState } from "react";
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

import { SERVICE_CATEGORIES } from "@/data/serviceCategories";

const PRIMARY = "#16A34A";
const LIGHT_GREEN = "#EAF8F0";
const BORDER = "#E5E7EB";
const TEXT = "#111827";
const SECONDARY = "#6B7280";

type Service = {
  id: string;
  category: string | null;
  name: string;
  description: string;
  price: string;
  active: boolean;
};

const INITIAL_SERVICES: Service[] = [
  {
    id: "s1",
    category: "Plumber",
    name: "Plumbing Installation",
    description:
      "Professional installation of pipes, taps, fixtures and fittings.",
    price: "8000",
    active: true,
  },
  {
    id: "s2",
    category: "Plumber",
    name: "Drain Cleaning",
    description: "Professional drain cleaning and blockage removal.",
    price: "10000",
    active: true,
  },
  {
    id: "s3",
    category: "Plumber",
    name: "Water Heater Repair",
    description: "Repair and maintenance of electric and gas water heaters.",
    price: "12000",
    active: true,
  },
];

function getServiceIcon(category: string | null, name: string) {
  const lower = (name + " " + (category || "")).toLowerCase();
  if (lower.includes("plumb") || lower.includes("pipe") || lower.includes("install"))
    return "pipe";
  if (lower.includes("drain") || lower.includes("leak")) return "pipe-leak";
  if (lower.includes("water") || lower.includes("heater") || lower.includes("boiler"))
    return "water-boiler";
  if (lower.includes("nail")) return "nail";
  if (lower.includes("electric") || lower.includes("wiring") || lower.includes("light"))
    return "flash";
  if (lower.includes("barber") || lower.includes("hair") || lower.includes("cut"))
    return "content-cut";
  if (lower.includes("mechanic") || lower.includes("engine") || lower.includes("car"))
    return "car-wrench";
  if (lower.includes("spa") || lower.includes("massage")) return "spa";
  return "briefcase-outline";
}

export default function AddService() {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const resetForm = () => {
    setSelectedCategory(null);
    setServiceName("");
    setDescription("");
    setPrice("");
    setEditingServiceId(null);
    setCategoryOpen(false);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingServiceId(service.id);
    setSelectedCategory(service.category);
    setServiceName(service.name);
    setDescription(service.description);
    setPrice(service.price);
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

  const handleSave = () => {
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

    if (editingServiceId) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingServiceId
            ? {
                ...s,
                category: selectedCategory,
                name: serviceName.trim(),
                description: description.trim(),
                price: price.trim(),
              }
            : s,
        ),
      );
      Alert.alert("Service Updated", "Your service has been updated.");
    } else {
      const newService: Service = {
        id: Date.now().toString(),
        category: selectedCategory,
        name: serviceName.trim(),
        description: description.trim(),
        price: price.trim(),
        active: true,
      };
      setServices((prev) => [...prev, newService]);
      Alert.alert("Service Added", "Your service has been added.");
    }

    closeModal();
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
          onPress: () => {
            setServices((prev) => prev.filter((s) => s.id !== id));
            if (editingServiceId === id) closeModal();
          },
        },
      ],
    );
  };

  const activeCount = services.filter((s) => s.active).length;

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
                {activeCount === 1 ? "" : "s"}. Keep your services updated to
                get more bookings.
              </Text>
            </View>
          </View>
          <View style={styles.growthIcon}>
            <Ionicons name="trending-up" size={20} color={PRIMARY} />
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Added Services</Text>
          <Text style={styles.sectionCount}>
            {services.length} service{services.length === 1 ? "" : "s"}
          </Text>
        </View>

        {/* Service cards */}
        {services.map((service) => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceCardTop}>
              <View style={styles.serviceIconWrap}>
                <MaterialCommunityIcons
                  name={
                    getServiceIcon(service.category, service.name) as keyof typeof MaterialCommunityIcons.glyphMap
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
                    ₦{Number(service.price).toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.serviceDesc} numberOfLines={2}>
                  {service.description}
                </Text>

                <View style={styles.badgeRow}>
                  {service.active && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
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
                style={styles.deleteBtn}
                onPress={() => handleDelete(service.id)}
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* Add New Service dashed button */}
        <Pressable
          style={({ pressed }) => [
            styles.addNewBox,
            pressed && styles.addNewBoxPressed,
          ]}
          onPress={openAddModal}
        >
          <View style={styles.addNewContent}>
            <Ionicons name="add-circle-outline" size={26} color={PRIMARY} />
            <Text style={styles.addNewTitle}>Add New Service</Text>
          </View>
          <Text style={styles.addNewSubtitle}>
            Offer more services and attract more customers.
          </Text>
        </Pressable>

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
                        ((SERVICE_CATEGORIES.find(
                          (c) => c.name === selectedCategory,
                        )?.icon as keyof typeof MaterialCommunityIcons.glyphMap) ||
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
                  {SERVICE_CATEGORIES.map((cat) => {
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
                  pressed && { opacity: 0.9 },
                ]}
                onPress={handleSave}
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
                  {editingServiceId ? "Update Service" : "Add Service"}
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

  // Status banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    marginBottom: 24,
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

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  // Service card
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

  // Add New dashed box
  addNewBox: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  addNewBoxPressed: {
    backgroundColor: "#F0FDF4",
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
  addNewSubtitle: {
    fontSize: 13,
    color: SECONDARY,
    marginTop: 6,
    textAlign: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
    borderColor: BORDER,
    borderRadius: 14,
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
});
