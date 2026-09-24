import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import {
  createServiceRequest,
  updateServiceRequest,
  type ServiceRequest,
  type ServiceRequestIcon,
} from "@/services/serviceRequests";

import { SERVICE_CATEGORIES } from "@/data/serviceCategories";
import { NIGERIA_CITIES } from "@/data/cities";

const GREEN = "#159447";
const TEXT = "#111827";
const MUTED = "#6B7280";
const MAX_IMAGES = 4;

const DEFAULT_ICON: ServiceRequestIcon = "briefcase-outline";
const DEFAULT_ICON_BACKGROUND = "#E8F5ED";

type Props = {
  visible: boolean;
  onClose: () => void;
  request?: ServiceRequest | null;
  onSaved?: (request: ServiceRequest) => void;
};

export default function CreateJobModal({
  visible,
  onClose,
  request = null,
  onSaved,
}: Props) {
  const isEditing = !!request;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [images, setImages] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showCities, setShowCities] = useState(false);

  const categories = useMemo(() => SERVICE_CATEGORIES, []);
  const cities = useMemo(() => NIGERIA_CITIES, []);

  useEffect(() => {
    if (!visible) return;

    setShowCategories(false);
    setShowCities(false);

    if (request) {
      setTitle(request.title || "");
      setDescription(request.description || "");
      setCategory(request.category || request.profession || "");
      setCity(request.city || "");
      setLocation(request.location || "");
      setPreferredDate(request.preferredDate || request.date || "");
      setImages(request.images?.length ? [...request.images] : []);
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("");
    setCity("");
    setLocation("");
    setPreferredDate("");
    setImages([]);
  }, [visible, request]);

  const canSave = useMemo(
    () =>
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      category.trim().length > 0 &&
      city.trim().length > 0 &&
      location.trim().length > 0 &&
      preferredDate.trim().length > 0,
    [title, description, category, city, location, preferredDate],
  );

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      Alert.alert("Limit reached", `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo access to add photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const next = result.assets.map((asset) => ({ uri: asset.uri }));
    setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  };

  const removeImageAt = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getCategoryName = (item: any): string => {
    if (typeof item === "string") return item;
    return String(
      item?.name ?? item?.title ?? item?.label ?? item?.category ?? "",
    ).trim();
  };

  const getCategoryIcon = (selectedCategory: string): ServiceRequestIcon => {
    const found = categories.find(
      (item: any) =>
        getCategoryName(item).toLowerCase() ===
        selectedCategory.trim().toLowerCase(),
    ) as any;

    return (found?.icon ?? found?.iconName ?? DEFAULT_ICON) as ServiceRequestIcon;
  };

  const getCategoryBackground = (selectedCategory: string): string => {
    const found = categories.find(
      (item: any) =>
        getCategoryName(item).toLowerCase() ===
        selectedCategory.trim().toLowerCase(),
    ) as any;

    return (
      found?.iconBackground ??
      found?.backgroundColor ??
      found?.color ??
      DEFAULT_ICON_BACKGROUND
    );
  };

  const handleSave = () => {
    if (!canSave || saving) return;

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        city: city.trim(),
        location: location.trim(),
        preferredDate: preferredDate.trim(),
        images,
        icon: getCategoryIcon(category),
        iconBackground: getCategoryBackground(category),
      };

      if (isEditing && request) {
        const updated = updateServiceRequest(request.id, payload);

        if (!updated) {
          Alert.alert(
            "Could not update",
            "Only your own service requests can be edited.",
          );
          return;
        }

        onSaved?.(updated);
        onClose();
        return;
      }

      const created = createServiceRequest(payload);
      onSaved?.(created);
      onClose();
    } catch (error) {
      console.error("[CreateJobModal] Save error:", error);
      Alert.alert(
        isEditing ? "Could not update request" : "Could not create request",
        "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderCategoryPicker = () => (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowCategories((p) => !p)}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.pickerText, !category && styles.placeholderText]}
            numberOfLines={1}
          >
            {category || "Select a category"}
          </Text>
          <Ionicons
            name={showCategories ? "chevron-up" : "chevron-down"}
            size={18}
            color={MUTED}
          />
        </TouchableOpacity>
      </View>

      {showCategories ? (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.dropdownScroll}
          >
            {categories.map((item: any, index: number) => {
              const name = getCategoryName(item);
              if (!name) return null;
              const selected = category.toLowerCase() === name.toLowerCase();

              return (
                <TouchableOpacity
                  key={`${name}-${index}`}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCategory(name);
                    setShowCategories(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      selected && styles.dropdownTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={GREEN} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </>
  );

  const renderCityPicker = () => (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>City</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowCities((p) => !p)}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.pickerText, !city && styles.placeholderText]}
            numberOfLines={1}
          >
            {city || "Select your city"}
          </Text>
          <Ionicons
            name={showCities ? "chevron-up" : "chevron-down"}
            size={18}
            color={MUTED}
          />
        </TouchableOpacity>
      </View>

      {showCities ? (
        <View style={styles.dropdown}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.dropdownScroll}
          >
            {cities.map((item: any, index: number) => {
              const name =
                typeof item === "string"
                  ? item
                  : String(item?.name ?? item?.city ?? item?.label ?? "").trim();
              if (!name) return null;
              const selected = city.toLowerCase() === name.toLowerCase();

              return (
                <TouchableOpacity
                  key={`${name}-${index}`}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCity(name);
                    setShowCities(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      selected && styles.dropdownTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={GREEN} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>
                {isEditing ? "Edit Service Request" : "Create Job"}
              </Text>
              <Text style={styles.subtitle}>
                {isEditing
                  ? "Update your service request"
                  : "Tell professionals what you need"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={TEXT} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <View style={styles.field}>
              <Text style={styles.label}>Job title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What service do you need?"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                maxLength={100}
              />
            </View>

            {renderCategoryPicker()}

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the job and what you need..."
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textArea]}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.counter}>{description.length}/1000</Text>
            </View>

            {renderCityPicker()}

            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Area, street or neighbourhood"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                maxLength={150}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Preferred date</Text>
              <TextInput
                value={preferredDate}
                onChangeText={setPreferredDate}
                placeholder="e.g. 25 September 2026"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                maxLength={50}
              />
            </View>

            {/* PHOTOS — up to 4 */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Photos ({images.length}/{MAX_IMAGES})
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesRow}
              >
                {images.map((img, index) => (
                  <View key={`img-${index}`} style={styles.thumbWrap}>
                    <Image
                      source={img}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => removeImageAt(index)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {images.length < MAX_IMAGES ? (
                  <TouchableOpacity
                    style={styles.addThumb}
                    onPress={pickImages}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={28} color={GREEN} />
                    <Text style={styles.addThumbText}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </ScrollView>

              {images.length === 0 ? (
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={pickImages}
                  activeOpacity={0.8}
                >
                  <View style={styles.uploadIcon}>
                    <Ionicons name="image-outline" size={25} color={GREEN} />
                  </View>
                  <Text style={styles.uploadTitle}>Add photos</Text>
                  <Text style={styles.uploadSub}>
                    Up to {MAX_IMAGES} images
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!canSave || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!canSave || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isEditing ? "checkmark" : "add"}
                    size={19}
                    color="#fff"
                  />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? "Save Changes" : "Create Job"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "94%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: TEXT,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: MUTED,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 20,
    paddingBottom: 35,
  },
  field: {
    marginBottom: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    minHeight: 115,
    paddingTop: 13,
    paddingBottom: 13,
  },
  counter: {
    textAlign: "right",
    marginTop: 4,
    fontSize: 11,
    color: "#9CA3AF",
  },
  picker: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  dropdown: {
    marginTop: -9,
    marginBottom: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 230,
  },
  dropdownItem: {
    minHeight: 45,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownText: {
    fontSize: 14,
    color: TEXT,
  },
  dropdownTextActive: {
    color: GREEN,
    fontWeight: "700",
  },
  imagesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    position: "relative",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  addThumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#B7DCC5",
    backgroundColor: "#F7FCF9",
    alignItems: "center",
    justifyContent: "center",
  },
  addThumbText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: GREEN,
  },
  uploadBox: {
    minHeight: 145,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#B7DCC5",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7FCF9",
    marginTop: 4,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT,
  },
  uploadSub: {
    marginTop: 3,
    fontSize: 12,
    color: MUTED,
  },
  saveButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#A7CDB5",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  cancelButton: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 9,
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
});