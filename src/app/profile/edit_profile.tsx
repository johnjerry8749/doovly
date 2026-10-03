import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import * as ImagePicker from "expo-image-picker";
import {
  getProfileForEdit,
  updateProfile,
  updateAvatar,
  type ProfileEditData,
} from "@/services/profile";

import {
  listCities,
  listServiceCategoriesFromSupabase,
  type CityOption,
  type ServiceCategoryOption,
} from "@/services/Cites&categories/referenceData";

const PRIMARY = "#159447";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

const DEFAULT_AVATAR = require("@/assets/images/icon.png");

export default function EditProfile() {
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileEditData | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");

  // Supabase reference data
  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Picker visibility
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [professionPickerVisible, setProfessionPickerVisible] =
    useState(false);

  // City search
  const [citySearch, setCitySearch] = useState("");

  useEffect(() => {
    loadProfileAndOptions();
  }, []);

  async function loadProfileAndOptions() {
    try {
      setOptionsLoading(true);

      // Load auth user profile in background — form already visible
      const profileData = await getProfileForEdit();

      if (profileData) {
        setProfile(profileData);
        setName(profileData.name ?? "");
        setPhone(profileData.phone ?? "");
        setEmail(profileData.email ?? "");
        setProfession(profileData.profession ?? "");
        setBio(profileData.bio ?? "");
        setCity(profileData.city ?? "");
      }

      const [cityRows, categoryRows] = await Promise.all([
        listCities(),
        listServiceCategoriesFromSupabase(),
      ]);

      setCities(cityRows);
      setCategories(categoryRows);
    } catch (error) {
      console.error("Edit Profile load error:", error);
    } finally {
      setOptionsLoading(false);
    }
  }

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase();

    if (!query) {
      return cities;
    }

    return cities.filter((item) =>
      item.name.toLowerCase().includes(query),
    );
  }, [cities, citySearch]);

  const handleSelectCity = (selectedCity: string) => {
    setCity(selectedCity);
    setCityPickerVisible(false);
    setCitySearch("");
  };

  const handleSelectProfession = (selectedProfession: string) => {
    setProfession(selectedProfession);
    setProfessionPickerVisible(false);
  };

  const handlePickAvatar = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to change your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const uri = result.assets[0].uri;
      setLocalAvatarUri(uri);
      setUploadingAvatar(true);

      const upload = await updateAvatar(uri);

      if (!upload.ok) {
        Alert.alert("Upload failed", upload.error);
        setLocalAvatarUri(null);
        return;
      }

      setProfile((prev) =>
        prev
          ? { ...prev, image: { uri: upload.url } }
          : prev,
      );
      setLocalAvatarUri(upload.url);
    } catch (error) {
      console.error("Avatar pick/upload error:", error);
      Alert.alert(
        "Upload failed",
        "Could not upload your photo. Please try again.",
      );
      setLocalAvatarUri(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }

    setSaving(true);

    try {
      const result = await updateProfile({
        name,
        phone,
        email,
        profession,
        bio,
        city,
      });

      if (result.ok) {
        Alert.alert("Saved", "Your profile has been updated.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert(
          "Error",
          result.error || "Could not save profile.",
        );
      }
    } catch (error) {
      console.error("Update profile error:", error);

      Alert.alert(
        "Error",
        "Something went wrong. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const avatarSource = localAvatarUri
    ? { uri: localAvatarUri }
    : ((profile?.image as any) ?? DEFAULT_AVATAR);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
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

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={avatarSource}
                style={styles.avatar}
                resizeMode="cover"
              />

              <TouchableOpacity
                style={styles.cameraBtn}
                activeOpacity={0.8}
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name="camera"
                    size={18}
                    color="#FFFFFF"
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Full Name */}
          <Field label="Full Name">
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#9CA3AF"
            />

            <Ionicons
              name="person-outline"
              size={18}
              color={PRIMARY}
              style={styles.inputIcon}
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number">
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+234 ..."
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Ionicons
              name="call-outline"
              size={18}
              color={PRIMARY}
              style={styles.inputIcon}
            />
          </Field>

          {/* Email */}
          <Field label="Email">
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Ionicons
              name="mail-outline"
              size={18}
              color={PRIMARY}
              style={styles.inputIcon}
            />
          </Field>

          {/* Profession */}
          <Field label="Profession">
            <TouchableOpacity
              style={styles.selectInput}
              activeOpacity={0.75}
              onPress={() => {
                if (!optionsLoading) {
                  setProfessionPickerVisible(true);
                }
              }}
              disabled={optionsLoading}
            >
              <Text
                style={[
                  styles.selectText,
                  !profession && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {optionsLoading
                  ? "Loading professions..."
                  : profession || "Select profession"}
              </Text>

              {optionsLoading ? (
                <ActivityIndicator
                  size="small"
                  color={PRIMARY}
                  style={styles.selectIcon}
                />
              ) : (
                <Ionicons
                  name="chevron-down"
                  size={19}
                  color={PRIMARY}
                  style={styles.selectIcon}
                />
              )}
            </TouchableOpacity>
          </Field>

          {/* Bio */}
          <Field label="Bio">
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell clients about yourself..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>

          {/* City */}
          <Field label="City">
            <TouchableOpacity
              style={styles.selectInput}
              activeOpacity={0.75}
              onPress={() => {
                if (!optionsLoading) {
                  setCityPickerVisible(true);
                }
              }}
              disabled={optionsLoading}
            >
              <Text
                style={[
                  styles.selectText,
                  !city && styles.placeholderText,
                ]}
                numberOfLines={1}
              >
                {optionsLoading
                  ? "Loading cities..."
                  : city || "Select city"}
              </Text>

              {optionsLoading ? (
                <ActivityIndicator
                  size="small"
                  color={PRIMARY}
                  style={styles.selectIcon}
                />
              ) : (
                <Ionicons
                  name="chevron-down"
                  size={19}
                  color={PRIMARY}
                  style={styles.selectIcon}
                />
              )}
            </TouchableOpacity>
          </Field>

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              saving && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                Save Changes
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Profession Picker */}
      <Modal
        visible={professionPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setProfessionPickerVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Profession
              </Text>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() =>
                  setProfessionPickerVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={TEXT_DARK}
                />
              </TouchableOpacity>
            </View>

            {categories.length === 0 ? (
              <View style={styles.noOptions}>
                <Ionicons
                  name="briefcase-outline"
                  size={34}
                  color="#9CA3AF"
                />

                <Text style={styles.noOptionsTitle}>
                  No professions available
                </Text>

                <Text style={styles.noOptionsText}>
                  Service categories have not been added yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  styles.optionListContent
                }
                renderItem={({ item }) => {
                  const selected =
                    profession === item.name;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionRow,
                        selected &&
                          styles.optionRowSelected,
                      ]}
                      activeOpacity={0.75}
                      onPress={() =>
                        handleSelectProfession(item.name)
                      }
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          selected &&
                            styles.optionIconSelected,
                        ]}
                      >
                        <Ionicons
                          name="briefcase-outline"
                          size={20}
                          color={
                            selected
                              ? "#FFFFFF"
                              : PRIMARY
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.optionText,
                          selected &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>

                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={PRIMARY}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* City Picker */}
      <Modal
        visible={cityPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCityPickerVisible(false);
          setCitySearch("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select City
              </Text>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setCityPickerVisible(false);
                  setCitySearch("");
                }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={TEXT_DARK}
                />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Ionicons
                name="search-outline"
                size={19}
                color="#6B7280"
              />

              <TextInput
                style={styles.searchInput}
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder="Search city..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                autoCorrect={false}
              />

              {citySearch.length > 0 && (
                <Pressable
                  onPress={() => setCitySearch("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color="#9CA3AF"
                  />
                </Pressable>
              )}
            </View>

            {filteredCities.length === 0 ? (
              <View style={styles.noOptions}>
                <Ionicons
                  name="location-outline"
                  size={34}
                  color="#9CA3AF"
                />

                <Text style={styles.noOptionsTitle}>
                  City not found
                </Text>

                <Text style={styles.noOptionsText}>
                  Try another city name.
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCities}
                keyExtractor={(item, index) =>
                  `${item.name}-${index}`
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  styles.optionListContent
                }
                renderItem={({ item }) => {
                  const selected = city === item.name;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionRow,
                        selected &&
                          styles.optionRowSelected,
                      ]}
                      activeOpacity={0.75}
                      onPress={() =>
                        handleSelectCity(item.name)
                      }
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          selected &&
                            styles.optionIconSelected,
                        ]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={
                            selected
                              ? "#FFFFFF"
                              : PRIMARY
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.optionText,
                          selected &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>

                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={PRIMARY}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  header: {
    height: 48,
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

  headerSpacer: {
    width: 40,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  avatarSection: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 28,
  },

  avatarWrapper: {
    position: "relative",
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
  },

  cameraBtn: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_MUTED,
    marginBottom: 8,
  },

  inputWrap: {
    position: "relative",
  },

  input: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 42,
    fontSize: 15,
    color: TEXT_DARK,
    backgroundColor: "#FFFFFF",
  },

  bioInput: {
    minHeight: 100,
    paddingTop: 12,
    paddingRight: 14,
  },

  inputIcon: {
    position: "absolute",
    right: 14,
    top: 14,
  },

  selectInput: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 42,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
    justifyContent: "center",
  },

  selectText: {
    fontSize: 15,
    color: TEXT_DARK,
    paddingRight: 8,
  },

  placeholderText: {
    color: "#9CA3AF",
  },

  selectIcon: {
    position: "absolute",
    right: 14,
    top: 14,
  },

  saveBtn: {
    marginTop: 12,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtnDisabled: {
    opacity: 0.7,
  },

  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Modal */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },

  pickerModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    minHeight: "45%",
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },

  modalHeader: {
    height: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  modalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  searchWrap: {
    height: 46,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  optionListContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
  },

  optionRow: {
    minHeight: 58,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },

  optionRowSelected: {
    backgroundColor: "#E8F5E9",
  },

  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  optionIconSelected: {
    backgroundColor: PRIMARY,
  },

  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_DARK,
  },

  optionTextSelected: {
    color: PRIMARY,
  },

  noOptions: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 50,
  },

  noOptionsTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
  },

  noOptionsText: {
    marginTop: 6,
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
});
