import React, { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  getProfileForEditAsync,
  updateProfile,
  type ProfileEditData,
} from "@/services/profile";
import { uploadImage, UPLOAD_FOLDERS } from "@/services/cloudinary";
import { listCitiesAsync } from "@/services/cities";
import { listServiceCategoriesAsync } from "@/services/professionals";

const PRIMARY = "#159447";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileEditData | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profession, setProfession] = useState("Other");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ name: string; icon?: string }[]>([]);
  const [picker, setPicker] = useState<"city" | "profession" | null>(null);

  useEffect(() => {
    let active = true;

    getProfileForEditAsync()
      .then((data) => {
        if (!active) return;

        if (data) {
          setProfile(data);
          setName(data.name);
          setPhone(data.phone);
          setEmail(data.email);
          setProfession(data.profession || "Other");
          setBio(data.bio);
          setCity(data.city);
        }
      })
      .catch((error) => {
        console.warn("Edit profile load failed:", error);
        if (active) {
          Alert.alert(
            "Could not load profile",
            "Please check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([listCitiesAsync(), listServiceCategoriesAsync()])
      .then(([nextCities, nextCategories]) => {
        if (!active) return;
        setCities(nextCities);
        setCategories(nextCategories.filter((item) => item.name !== "All"));
      })
      .catch((error) => {
        console.warn("Edit profile options load failed:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow photo access to change your profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setProfile((current) =>
      current ? { ...current, image: { uri } as any } : current,
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }

    setSaving(true);
    try {
      let uploadedImageUrl: string | undefined;

      if (imageUri) {
        uploadedImageUrl = await uploadImage(
          imageUri,
          UPLOAD_FOLDERS.avatars,
        );
      }

      const result = await updateProfile({
        name,
        phone,
        email,
        profession,
        bio,
        city,
        imageUrl: uploadedImageUrl,
      });

      if (result.ok) {
        Alert.alert("Saved", "Your profile has been updated.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", result.error || "Could not save profile.");
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Profile not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={TEXT_DARK} />
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
                source={profile.image}
                style={styles.avatar}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.cameraBtn}
                activeOpacity={0.8}
                onPress={handlePickImage}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Fields */}
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

          <Field label="Profession">
            <TouchableOpacity style={styles.input} activeOpacity={0.8} onPress={() => setPicker("profession")}>
              <Text style={{ color: profession ? TEXT_DARK : "#9CA3AF", fontSize: 15 }}>
                {profession || "Select profession"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={PRIMARY} style={styles.inputIcon} />
            </TouchableOpacity>
          </Field>

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

          <Field label="City">
            <TouchableOpacity style={styles.input} activeOpacity={0.8} onPress={() => setPicker("city")}>
              <Text style={{ color: city ? TEXT_DARK : "#9CA3AF", fontSize: 15 }}>
                {city || "Select city"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={PRIMARY} style={styles.inputIcon} />
            </TouchableOpacity>
          </Field>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{picker === "city" ? "Select City" : "Select Profession"}</Text>
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <Ionicons name="close" size={24} color={TEXT_DARK} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={picker === "city" ? cities : categories}
                keyExtractor={(item) => typeof item === "string" ? item : item.name}
                renderItem={({ item }) => {
                  const value = typeof item === "string" ? item : item.name;
                  return (
                    <TouchableOpacity
                      style={styles.pickerItem}
                      onPress={() => {
                        if (picker === "city") setCity(value);
                        else setProfession(value);
                        setPicker(null);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{value}</Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>No options available.</Text>}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 15,
    color: TEXT_MUTED,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    padding: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  pickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerItemText: {
    fontSize: 15,
    color: TEXT_DARK,
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
});
