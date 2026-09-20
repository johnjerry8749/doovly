import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
};

export default function AddService() {
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [categoryOpen, setCategoryOpen] = useState(false);

  const [serviceName, setServiceName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [editingServiceId, setEditingServiceId] =
    useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setCategoryOpen(false);
  };

  const resetForm = () => {
    setSelectedCategory(null);
    setServiceName("");
    setDescription("");
    setPrice("");
    setEditingServiceId(null);
    setCategoryOpen(false);
  };

  const handleSave = () => {
    if (!serviceName.trim()) {
      Alert.alert(
        "Missing service name",
        "Please enter your service name.",
      );
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
      Alert.alert(
        "Missing price",
        "Please enter the price for this service.",
      );
      return;
    }

    if (editingServiceId) {
      // Update existing service
      setServices((currentServices) =>
        currentServices.map((service) =>
          service.id === editingServiceId
            ? {
                ...service,
                category: selectedCategory,
                name: serviceName.trim(),
                description: description.trim(),
                price: price.trim(),
              }
            : service,
        ),
      );

      Alert.alert("Service Updated", "Your service has been updated.");

      resetForm();
      return;
    }

    // Add new service
    const newService: Service = {
      id: Date.now().toString(),
      category: selectedCategory,
      name: serviceName.trim(),
      description: description.trim(),
      price: price.trim(),
    };

    setServices((currentServices) => [
      ...currentServices,
      newService,
    ]);

    Alert.alert("Service Added", "Your service has been added.");

    resetForm();
  };

  const handleEdit = (service: Service) => {
    setEditingServiceId(service.id);
    setSelectedCategory(service.category);
    setServiceName(service.name);
    setDescription(service.description);
    setPrice(service.price);

    setCategoryOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setServices((currentServices) =>
              currentServices.filter(
                (service) => service.id !== id,
              ),
            );

            if (editingServiceId === id) {
              resetForm();
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === "ios" ? "padding" : undefined
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={TEXT}
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            {editingServiceId
              ? "Edit Service"
              : "Add Service"}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro */}
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <MaterialCommunityIcons
                name={
                  editingServiceId
                    ? "briefcase-edit-outline"
                    : "briefcase-plus-outline"
                }
                size={27}
                color={PRIMARY}
              />
            </View>

            <View style={styles.introContent}>
              <Text style={styles.introTitle}>
                {editingServiceId
                  ? "Edit your service"
                  : "Add a new service"}
              </Text>

              <Text style={styles.introText}>
                {editingServiceId
                  ? "Update your service details below."
                  : "Tell customers what you offer and set your service details."}
              </Text>
            </View>
          </View>

          {/* Service Category */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>
                Service Category
              </Text>
            </View>

            <Text style={styles.helperText}>
              Select a category that best matches your service.
            </Text>

            <Pressable
              style={[
                styles.categoryDropdown,
                categoryOpen &&
                  styles.categoryDropdownOpen,
              ]}
              onPress={() =>
                setCategoryOpen((prev) => !prev)
              }
            >
              <View style={styles.categoryDropdownLeft}>
                <View style={styles.categoryDropdownIcon}>
                  {selectedCategory ? (
                    <MaterialCommunityIcons
                      name={
                        (SERVICE_CATEGORIES.find(
                          (category) =>
                            category.name ===
                            selectedCategory,
                        )?.icon ||
                          "shape-outline") as keyof typeof MaterialCommunityIcons.glyphMap
                      }
                      size={21}
                      color={PRIMARY}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="shape-outline"
                      size={21}
                      color={PRIMARY}
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.categoryDropdownText,
                    !selectedCategory &&
                      styles.categoryDropdownPlaceholder,
                  ]}
                >
                  {selectedCategory ||
                    "Select a service category"}
                </Text>
              </View>

              <Ionicons
                name={
                  categoryOpen
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={20}
                color="#6B7280"
              />
            </Pressable>

            {/* Category List */}
            {categoryOpen && (
              <View style={styles.categoryListContainer}>
                {SERVICE_CATEGORIES.length > 0 ? (
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    style={styles.categoryList}
                    keyboardShouldPersistTaps="handled"
                  >
                    {SERVICE_CATEGORIES.map(
                      (category) => {
                        const isSelected =
                          selectedCategory ===
                          category.name;

                        return (
                          <Pressable
                            key={category.name}
                            style={[
                              styles.categoryOption,
                              isSelected &&
                                styles.categoryOptionSelected,
                            ]}
                            onPress={() =>
                              handleSelectCategory(
                                category.name,
                              )
                            }
                          >
                            <View
                              style={
                                styles.categoryOptionLeft
                              }
                            >
                              <View
                                style={[
                                  styles.categoryOptionIcon,
                                  isSelected &&
                                    styles.categoryOptionIconSelected,
                                ]}
                              >
                                <MaterialCommunityIcons
                                  name={
                                    category.icon as keyof typeof MaterialCommunityIcons.glyphMap
                                  }
                                  size={20}
                                  color={
                                    isSelected
                                      ? "#FFFFFF"
                                      : PRIMARY
                                  }
                                />
                              </View>

                              <Text
                                style={[
                                  styles.categoryOptionText,
                                  isSelected &&
                                    styles.categoryOptionTextSelected,
                                ]}
                              >
                                {category.name}
                              </Text>
                            </View>

                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={PRIMARY}
                              />
                            )}
                          </Pressable>
                        );
                      },
                    )}
                  </ScrollView>
                ) : (
                  <View style={styles.noCategories}>
                    <MaterialCommunityIcons
                      name="shape-outline"
                      size={24}
                      color="#9CA3AF"
                    />

                    <Text
                      style={styles.noCategoriesText}
                    >
                      No service categories are available
                      yet.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Service Name */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Service Name
            </Text>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="briefcase-outline"
                size={22}
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
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Description
            </Text>

            <View
              style={[
                styles.inputContainer,
                styles.descriptionContainer,
              ]}
            >
              <MaterialCommunityIcons
                name="text-box-outline"
                size={22}
                color={PRIMARY}
                style={styles.descriptionIcon}
              />

              <TextInput
                style={[
                  styles.input,
                  styles.descriptionInput,
                ]}
                placeholder="Describe what this service includes..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            <Text style={styles.characterHint}>
              Give customers enough information to
              understand your service.
            </Text>
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.label}>Price</Text>

            <View style={styles.inputContainer}>
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
          </View>

          {/* Save / Update */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
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

            <Text style={styles.saveButtonText}>
              {editingServiceId
                ? "Update Service"
                : "Add Service"}
            </Text>
          </Pressable>

          {/* Cancel / Cancel Edit */}
          <Pressable
            style={styles.cancelButton}
            onPress={() => {
              if (editingServiceId) {
                resetForm();
              } else {
                router.back();
              }
            }}
          >
            <Text style={styles.cancelButtonText}>
              {editingServiceId
                ? "Cancel Edit"
                : "Cancel"}
            </Text>
          </Pressable>

          {/* Added Services */}
          {services.length > 0 && (
            <View style={styles.addedServicesSection}>
              <View
                style={styles.addedServicesHeader}
              >
                <View>
                  <Text
                    style={styles.addedServicesTitle}
                  >
                    Added Services
                  </Text>

                  <Text
                    style={styles.addedServicesSubtitle}
                  >
                    Manage the services you offer
                  </Text>
                </View>

                <View style={styles.serviceCount}>
                  <Text
                    style={styles.serviceCountText}
                  >
                    {services.length}
                  </Text>
                </View>
              </View>

              {services.map((service) => (
                <View
                  key={service.id}
                  style={styles.serviceCard}
                >
                  {/* Service Header */}
                  <View
                    style={styles.serviceCardHeader}
                  >
                    <View style={styles.serviceIcon}>
                      <MaterialCommunityIcons
                        name="briefcase-outline"
                        size={22}
                        color={PRIMARY}
                      />
                    </View>

                    <View
                      style={
                        styles.serviceCardTitleContainer
                      }
                    >
                      <Text
                        style={styles.serviceCardTitle}
                        numberOfLines={1}
                      >
                        {service.name}
                      </Text>

                      {service.category && (
                        <Text
                          style={
                            styles.serviceCardCategory
                          }
                        >
                          {service.category}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Description */}
                  <Text
                    style={styles.serviceCardDescription}
                    numberOfLines={3}
                  >
                    {service.description}
                  </Text>

                  {/* Price */}
                  <View style={styles.serviceDetails}>
                    <View
                      style={styles.serviceDetailItem}
                    >
                      <MaterialCommunityIcons
                        name="cash"
                        size={18}
                        color={PRIMARY}
                      />

                      <Text
                        style={styles.serviceDetailText}
                      >
                        ₦
                        {Number(
                          service.price,
                        ).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.serviceActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => handleEdit(service)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color={PRIMARY}
                      />
                      <Text style={styles.editButtonText}>
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteButton}
                      onPress={() =>
                        handleDelete(service.id)
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#DC2626"
                      />
                      <Text style={styles.deleteButtonText}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  keyboard: {
    flex: 1,
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

  intro: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LIGHT_GREEN,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },

  introIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
  },

  introText: {
    fontSize: 13,
    color: SECONDARY,
    marginTop: 4,
    lineHeight: 18,
  },

  section: {
    marginBottom: 20,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 8,
  },

  helperText: {
    fontSize: 12,
    color: SECONDARY,
    marginBottom: 10,
  },

  categoryDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  categoryDropdownOpen: {
    borderColor: PRIMARY,
  },

  categoryDropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  categoryDropdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  categoryDropdownText: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT,
    flex: 1,
  },

  categoryDropdownPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "500",
  },

  categoryListContainer: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    maxHeight: 260,
  },

  categoryList: {
    maxHeight: 260,
  },

  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  categoryOptionIconSelected: {
    backgroundColor: PRIMARY,
  },

  categoryOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT,
  },

  categoryOptionTextSelected: {
    color: PRIMARY,
  },

  noCategories: {
    padding: 24,
    alignItems: "center",
  },

  noCategoriesText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT,
    paddingVertical: 14,
  },

  descriptionContainer: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },

  descriptionIcon: {
    marginTop: 2,
    marginRight: 10,
  },

  descriptionInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },

  characterHint: {
    fontSize: 12,
    color: SECONDARY,
    marginTop: 8,
  },

  currency: {
    fontSize: 16,
    fontWeight: "700",
    color: PRIMARY,
    marginRight: 8,
  },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },

  saveButtonPressed: {
    opacity: 0.9,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },

  cancelButtonText: {
    color: SECONDARY,
    fontSize: 15,
    fontWeight: "600",
  },

  addedServicesSection: {
    marginTop: 28,
  },

  addedServicesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  addedServicesTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT,
  },

  addedServicesSubtitle: {
    fontSize: 13,
    color: SECONDARY,
    marginTop: 2,
  },

  serviceCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },

  serviceCountText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "800",
  },

  serviceCard: {
    borderWidth: 1,
    borderColor: "#E5EDE8",
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },

  serviceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  serviceCardTitleContainer: {
    flex: 1,
  },

  serviceCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },

  serviceCardCategory: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: "600",
    marginTop: 4,
  },

  serviceCardDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: SECONDARY,
    marginTop: 14,
  },

  serviceDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },

  serviceDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  serviceDetailText: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
    marginLeft: 6,
  },

  serviceActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },

  editButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  editButtonText: {
    color: PRIMARY,
    fontSize: 14,
    fontWeight: "700",
  },

  deleteButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  deleteButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
});
