import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import {
  uploadImageFull,
  UPLOAD_FOLDERS,
} from "@/services/cloudinary";

import {
  getLoggedInProfessionalId,
  getProfessionalById,
  invalidateProfessionalsCache,
  isCurrentUserPro,
} from "@/services/savedProviders";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const H_PAD = 16;
const GAP = 12;

const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GAP) / 2;

const FREE_PORTFOLIO_LIMIT = 5;
const PRO_PORTFOLIO_LIMIT = 20;

type PortfolioImage = number | { uri: string };

type PortfolioItem = {
  id: string;
  description: string;
  image: PortfolioImage;
  storageKey?: string | null;
};

export default function PortfolioGallery() {
  // =========================================================
  // PROFESSIONAL / SUPABASE
  // =========================================================

  const proId = getLoggedInProfessionalId();
  const pro = proId ? getProfessionalById(proId) : undefined;
  const isPro = isCurrentUserPro();

  const portfolioLimit = isPro
    ? PRO_PORTFOLIO_LIMIT
    : FREE_PORTFOLIO_LIMIT;

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [professionalUuid, setProfessionalUuid] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    let active = true;

    const loadPortfolio = async () => {
      setLoadingItems(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) setItems([]);
          return;
        }

        const { data: professional, error: professionalError } =
          await supabase
            .from("professionals")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (professionalError) throw professionalError;

        if (!professional) {
          if (active) setItems([]);
          return;
        }

        const { data, error } = await supabase
          .from("portfolio_items")
          .select("id, description, image_key, image_url")
          .eq("professional_id", professional.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;

        const mapped = (data ?? []).map((row) => ({
          id: row.id,
          description: row.description ?? "",
          image: {
            uri:
              row.image_url ||
              (row.image_key
                ? supabase.storage
                    .from("profile-images")
                    .getPublicUrl(row.image_key).data.publicUrl
                : ""),
          },
          storageKey: row.image_key ?? null,
        })).filter((item) => Boolean((item.image as { uri: string }).uri));

        if (active) {
          setProfessionalUuid(professional.id);
          setItems(mapped);
        }
      } catch (error) {
        console.warn("Portfolio load failed:", error);
      } finally {
        if (active) setLoadingItems(false);
      }
    };

    loadPortfolio();

    return () => {
      active = false;
    };
  }, []);

  // =========================================================
  // ADD MODAL
  // =========================================================

  const [showAddModal, setShowAddModal] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(
    null,
  );

  const [description, setDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const canAdd = items.length < portfolioLimit;

  // =========================================================
  // OPEN ADD MODAL
  // =========================================================

  const handleAddPress = () => {
    if (!canAdd) {
      if (isPro) {
        Alert.alert(
          "Portfolio limit reached",
          `Doovly Pro allows up to ${PRO_PORTFOLIO_LIMIT} portfolio photos.`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Portfolio limit reached",
          `Free accounts can have up to ${FREE_PORTFOLIO_LIMIT} portfolio photos.`,
          [
            {
              text: "Not now",
              style: "cancel",
            },
            {
              text: "Upgrade",
              onPress: () =>
                router.push(
                  "/profile/subscription/subscription",
                ),
            },
          ],
        );
      }

      return;
    }

    setSelectedImage(null);
    setDescription("");
    setShowAddModal(true);
  };

  // =========================================================
  // PICK ONE IMAGE
  // =========================================================

  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo library access to select a portfolio image.",
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          allowsMultipleSelection: false,
          quality: 0.8,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset || asset.type !== "image" || !asset.uri) {
        Alert.alert(
          "Unsupported image",
          "Please select a normal photo (JPG, JPEG, PNG, or a photo your device can convert).",
        );
        return;
      }

      setSelectedImage(asset.uri);
    } catch (error) {
      console.error("Portfolio image picker error:", error);

      Alert.alert(
        "Could not select image",
        "Please try again.",
      );
    }
  };

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setShowAddModal(false);
    setSelectedImage(null);
    setDescription("");
  };

  // =========================================================
  // SAVE PORTFOLIO ITEM
  // =========================================================

  const handleSave = async () => {
    const trimmedDescription = description.trim();

    if (!selectedImage) {
      Alert.alert(
        "Image required",
        "Please select one image for your portfolio.",
      );
      return;
    }

    if (!trimmedDescription) {
      Alert.alert(
        "Description required",
        "Please enter a description for this portfolio item.",
      );
      return;
    }

    if (items.length >= portfolioLimit) {
      Alert.alert(
        "Portfolio limit reached",
        isPro
          ? `Doovly Pro allows up to ${PRO_PORTFOLIO_LIMIT} portfolio photos.`
          : `Free accounts can have up to ${FREE_PORTFOLIO_LIMIT} portfolio photos.`,
      );
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !professionalUuid) {
        throw new Error("Professional account not found.");
      }

      let cloudinary: Awaited<ReturnType<typeof uploadImageFull>> | null = null;
      let lastUploadError: unknown = null;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          cloudinary = await uploadImageFull(selectedImage, UPLOAD_FOLDERS.portfolio);
          lastUploadError = null;
          break;
        } catch (uploadError) {
          lastUploadError = uploadError;
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      }

      if (!cloudinary) {
        throw lastUploadError instanceof Error
          ? lastUploadError
          : new Error("Portfolio image upload failed.");
      }

      const { data: row, error } = await supabase
        .from("portfolio_items")
        .insert({
          professional_id: professionalUuid,
          description: trimmedDescription,
          image_key: cloudinary.public_id,
          image_url: cloudinary.secure_url,
          sort_order: items.length,
        })
        .select("id, description, image_key, image_url")
        .single();

      if (error) {
        throw error;
      }

      const newItem: PortfolioItem = {
        id: row.id,
        description: row.description ?? trimmedDescription,
        image: { uri: row.image_url || cloudinary.secure_url },
        storageKey: row.image_key ?? cloudinary.public_id,
      };

      setItems((previous) => [...previous, newItem]);

      // The professional profile uses the shared professionals cache.
      // Invalidate it immediately so the new portfolio item appears when
      // the profile screen is opened/refocused.
      invalidateProfessionalsCache();

      setShowAddModal(false);
      setSelectedImage(null);
      setDescription("");

      Alert.alert(
        "Portfolio updated",
        "Your portfolio photo has been added successfully.",
      );
    } catch (error) {
      console.error("Portfolio save error:", error);
      const message = error instanceof Error ? error.message : "";

      if (/Cloudinary is not configured/i.test(message)) {
        Alert.alert(
          "Photo upload failed",
          "Cloudinary is not configured in this Expo build. Check the Cloudinary environment values and restart Expo.",
        );
      } else if (/Cloudinary upload failed|upload preset|unsigned|cloud name/i.test(message)) {
        Alert.alert(
          "Photo upload failed",
          "The image upload service rejected this photo. Check that the Doovly Cloudinary upload preset is active and unsigned, then try again.",
        );
      } else {
        Alert.alert(
          "Could not save",
          message || "Your portfolio photo could not be saved. Please try again.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================
  // DELETE PORTFOLIO ITEM
  // =========================================================

  const handleDelete = (itemId: string) => {
    Alert.alert(
      "Delete portfolio item?",
      "This photo and its description will be removed from your portfolio.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const item = items.find((entry) => entry.id === itemId);

              const { error } = await supabase
                .from("portfolio_items")
                .delete()
                .eq("id", itemId);

              if (error) throw error;

              // Cloudinary hosts the image; deleting the DB row removes it from the user's portfolio.

              setItems((previous) =>
                previous.filter((entry) => entry.id !== itemId),
              );
            } catch (error) {
              console.error("Portfolio delete error:", error);
              Alert.alert(
                "Could not delete",
                "The portfolio item could not be deleted. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  // =========================================================
  // IMAGE SOURCE
  // Handles both:
  // require("@/assets/...") -> number
  // ImagePicker -> { uri: string }
  // =========================================================

  const getImageSource = (image: PortfolioImage) => {
    if (typeof image === "number") {
      return image;
    }

    return image;
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={TEXT_DARK}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Portfolio
        </Text>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name="add"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loadingItems ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Loading portfolio...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="images-outline"
                size={40}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No photos yet
            </Text>

            <Text style={styles.emptySub}>
              Add photos of completed work to
              {" "}build your portfolio
            </Text>

            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={handleAddPress}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add"
                size={18}
                color={PRIMARY}
              />

              <Text style={styles.emptyBtnText}>
                Add Your First Photo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => (
              <View
                key={item.id}
                style={styles.card}
              >
                {/* IMAGE */}

                <View style={styles.imageWrapper}>
                  <Image
                    source={getImageSource(item.image)}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />

                  {/* DELETE */}

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() =>
                      handleDelete(item.id)
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>

                {/* DESCRIPTION */}

                <View style={styles.cardBody}>
                  <Text
                    style={styles.cardDesc}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ===================================================
            PORTFOLIO COUNT
        =================================================== */}

        <Text style={styles.limitHint}>
          {items.length} / {portfolioLimit} photos
          {!isPro
            ? " · Upgrade to Pro for more"
            : ""}
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* =====================================================
          ADD PORTFOLIO MODAL
      ===================================================== */}

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          {/* BACKDROP */}

          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          />

          {/* SHEET */}

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* MODAL HEADER */}

            <View style={styles.modalHeader}>
              <View style={styles.modalTitleArea}>
                <Text style={styles.modalTitle}>
                  Add Portfolio Photo
                </Text>

                <Text style={styles.modalSubtitle}>
                  Upload one photo and describe
                  {" "}your work
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={TEXT_DARK}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                styles.modalContent
              }
            >
              {/* =================================================
                  IMAGE
              ================================================= */}

              <Text style={styles.inputLabel}>
                Portfolio Image
              </Text>

              {selectedImage ? (
                <View
                  style={
                    styles.selectedImageWrapper
                  }
                >
                  <Image
                    source={{
                      uri: selectedImage,
                    }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />

                  {/* REMOVE */}

                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() =>
                      setSelectedImage(null)
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>

                  {/* CHANGE */}

                  <TouchableOpacity
                    style={styles.changeImageBtn}
                    onPress={pickImage}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={17}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.changeImageText
                      }
                    >
                      Change Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadBox}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  <View
                    style={styles.uploadIcon}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={30}
                      color={PRIMARY}
                    />
                  </View>

                  <Text
                    style={styles.uploadTitle}
                  >
                    Upload Photo
                  </Text>

                  <Text
                    style={styles.uploadSubtitle}
                  >
                    Select one image from your
                    {" "}gallery
                  </Text>
                </TouchableOpacity>
              )}

              {/* =================================================
                  DESCRIPTION
              ================================================= */}

              <Text style={styles.inputLabel}>
                Description
              </Text>

              <TextInput
                style={styles.descriptionInput}
                placeholder="Describe the work you completed..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={300}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <Text style={styles.characterCount}>
                {description.length}/300
              </Text>

              {/* =================================================
                  SAVE
              ================================================= */}

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!selectedImage ||
                    !description.trim()) &&
                    styles.saveBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={
                  isSaving ||
                  !selectedImage ||
                  !description.trim()
                }
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.saveBtnText}>
                  {isSaving
                    ? "Adding..."
                    : "Add to Portfolio"}
                </Text>
              </TouchableOpacity>

              {/* CANCEL */}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeModal}
                disabled={isSaving}
                activeOpacity={0.7}
              >
                <Text
                  style={styles.cancelBtnText}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ===========================================================
   STYLES
=========================================================== */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },

  backBtn: {
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
    color: TEXT_DARK,
  },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  content: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 16,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    overflow: "hidden",
  },

  imageWrapper: {
    width: "100%",
    height: CARD_WIDTH * 0.85,
    position: "relative",
    backgroundColor: "#E5E7EB",
  },

  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
  },

  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(220, 38, 38, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardBody: {
    padding: 10,
  },

  cardDesc: {
    fontSize: 12,
    color: TEXT_DARK,
    lineHeight: 16,
  },

  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },

  emptyBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  emptyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
  },

  limitHint: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 12,
    color: TEXT_MUTED,
  },

  bottomSpace: {
    height: 32,
  },

  /* =========================================================
     MODAL
  ========================================================= */

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 8,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 14,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  modalTitleArea: {
    flex: 1,
    paddingRight: 10,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  modalSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 3,
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  modalContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 8,
    marginTop: 12,
  },

  uploadBox: {
    height: 190,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  uploadTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  uploadSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  selectedImageWrapper: {
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    position: "relative",
  },

  selectedImage: {
    width: "100%",
    height: "100%",
  },

  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  changeImageBtn: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },

  changeImageText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  descriptionInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: TEXT_DARK,
    backgroundColor: "#FFFFFF",
  },

  characterCount: {
    textAlign: "right",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 5,
  },

  saveBtn: {
    marginTop: 18,
    height: 50,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveBtnDisabled: {
    opacity: 0.45,
  },

  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  cancelBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  cancelBtnText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
});