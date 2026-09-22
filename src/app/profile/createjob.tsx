import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import type { ServiceRequestIcon } from "@/data/serviceRequests";
import { notifySubscribedProsInArea } from "@/services/inAppNotifications";
import { createServiceRequest } from "@/services/serviceRequests";

const GREEN = "#159447";
const TEXT = "#111827";
const MUTED = "#9CA3AF";
const BORDER = "#E5E7EB";
const MAX_PHOTOS = 4;

type RequestCategory = {
  name: string;
  icon: ServiceRequestIcon;
  iconBackground: string;
};

const REQUEST_CATEGORIES: RequestCategory[] = [
  { name: "Cleaning", icon: "broom", iconBackground: "#D1FAE5" },
  { name: "Plumber", icon: "water-pump", iconBackground: "#FFF1D5" },
  { name: "Electrician", icon: "flash", iconBackground: "#DDF2FF" },
  { name: "Barber", icon: "content-cut", iconBackground: "#E8F5E9" },
  { name: "Nail Tech", icon: "nail", iconBackground: "#FCE4EC" },
  { name: "Mechanic", icon: "car-wrench", iconBackground: "#E9E1FF" },
  { name: "Spa", icon: "spa", iconBackground: "#E0F2F1" },
];

function formatPreferredDate(date: Date): string {
  return date.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function CreateJob() {
  const router = useRouter();
  const [category, setCategory] = useState<RequestCategory>(REQUEST_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [areaCity, setAreaCity] = useState("");
  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const photoSlots = useMemo(
    () => Array.from({ length: MAX_PHOTOS }, (_, index) => photos[index]),
    [photos],
  );

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photos", "Allow photo access to upload request images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });

    if (result.canceled) return;
    const next = result.assets.map((asset) => asset.uri).filter(Boolean);
    setPhotos((current) => [...current, ...next].slice(0, MAX_PHOTOS));
  };

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setShowDate(false);
    if (event.type === "dismissed" || !date) return;
    setPreferredDate(date);
  };

  const useCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location",
          "Allow location access, or type your address instead.",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (result.length > 0) {
        const place = result[0];
        const formattedAddress = [
          place.name,
          place.street,
          place.district,
          place.city,
          place.region,
        ]
          .filter(Boolean)
          .join(", ");
        setAddress(formattedAddress || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setAreaCity(place.city || place.subregion || place.region || "");
      } else {
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setAreaCity("");
      }
    } catch {
      Alert.alert(
        "Location",
        "Could not get your current location. Type your address instead.",
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const postRequest = () => {
    if (!title.trim() || !description.trim() || !address.trim() || !preferredDate) {
      Alert.alert(
        "Missing details",
        "Add a title, description, location, and preferred date.",
      );
      return;
    }
    if (photos.length < 1) {
      Alert.alert("Photos", "Upload at least 1 photo.");
      return;
    }

    const dateLabel = formatPreferredDate(preferredDate);
    const priceLabel = price.trim()
      ? `₦${price.replace(/[^\d,]/g, "")}`
      : undefined;
    const request = createServiceRequest({
      category: category.name,
      title,
      description,
      price: priceLabel,
      location: address.trim(),
      city: areaCity || address.trim(),
      preferredDate: dateLabel,
      images: photos,
      icon: category.icon,
      iconBackground: category.iconBackground,
    });

    notifySubscribedProsInArea({
      city: request.city,
      title: "New service request",
      body: `${request.title} in ${request.city}.`,
    });

    Alert.alert("Request posted", "Subscribed pros in this area were notified.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Service Request</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text style={styles.label}>Service category</Text>
          <Pressable style={styles.field} onPress={() => setShowCategories(true)}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: category.iconBackground },
              ]}
            >
              <MaterialCommunityIcons
                name={category.icon}
                size={16}
                color={GREEN}
              />
            </View>
            <Text style={styles.fieldValue}>{category.name}</Text>
            <Ionicons name="chevron-down" size={18} color={MUTED} />
          </Pressable>

          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Home cleaning needed"
            placeholderTextColor={MUTED}
            style={styles.input}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what you need..."
            placeholderTextColor={MUTED}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Price (optional)</Text>
          <View style={styles.field}>
            <Text style={styles.naira}>₦</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Enter amount"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              style={styles.inlineInput}
            />
          </View>

          <Text style={styles.label}>Location</Text>
          <View style={styles.field}>
            <Ionicons name="location-outline" size={18} color={GREEN} />
            <TextInput
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                setAreaCity("");
              }}
              placeholder="Type your address"
              placeholderTextColor={MUTED}
              style={styles.inlineInput}
            />
          </View>
          <TouchableOpacity
            style={styles.locationBtn}
            activeOpacity={0.8}
            onPress={useCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color={GREEN} />
            ) : (
              <Ionicons name="navigate-outline" size={16} color={GREEN} />
            )}
            <Text style={styles.locationBtnText}>
              {gettingLocation ? "Getting location..." : "Use current location"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Preferred date</Text>
          <Pressable style={styles.field} onPress={() => setShowDate(true)}>
            <Ionicons name="calendar-outline" size={18} color={GREEN} />
            <Text style={preferredDate ? styles.fieldValue : styles.placeholder}>
              {preferredDate ? formatPreferredDate(preferredDate) : "Select date"}
            </Text>
          </Pressable>

          {showDate ? (
            <DateTimePicker
              value={preferredDate ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onDateChange}
            />
          ) : null}

          <Text style={styles.label}>Upload photos (1–4)</Text>
          <View style={styles.photoRow}>
            {photoSlots.map((uri, index) => {
              const isAdd = index === photos.length && photos.length < MAX_PHOTOS;
              return (
                <Pressable
                  key={`photo-${index}`}
                  style={styles.photoSlot}
                  onPress={uri || isAdd ? pickPhoto : undefined}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.photo} />
                  ) : isAdd ? (
                    <>
                      <Ionicons name="camera-outline" size={20} color={GREEN} />
                      <Text style={styles.addPhoto}>Add photo</Text>
                    </>
                  ) : (
                    <Ionicons name="add" size={22} color="#D1D5DB" />
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>You can upload 1 to 4 photos</Text>

          <TouchableOpacity
            style={styles.postBtn}
            activeOpacity={0.85}
            onPress={postRequest}
          >
            <Text style={styles.postText}>Post Request</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCategories}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategories(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCategories(false)}
        >
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Service category</Text>
            <ScrollView>
              {REQUEST_CATEGORIES.map((item) => {
                const selected = category.name === item.name;
                return (
                  <Pressable
                    key={item.name}
                    style={styles.option}
                    onPress={() => {
                      setCategory(item);
                      setShowCategories(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item.name}</Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={GREEN} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
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
  headerSpacer: { width: 36 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "600",
    color: TEXT,
  },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldValue: { flex: 1, fontSize: 14, color: TEXT },
  placeholder: { flex: 1, fontSize: 14, color: MUTED },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT,
  },
  textArea: { minHeight: 110, paddingTop: 14 },
  naira: { fontSize: 16, color: MUTED },
  inlineInput: { flex: 1, fontSize: 14, color: TEXT, paddingVertical: 12 },
  photoRow: { flexDirection: "row", gap: 10 },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  photo: { width: "100%", height: "100%" },
  addPhoto: { marginTop: 4, fontSize: 10, color: GREEN, fontWeight: "600" },
  locationBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationBtnText: { fontSize: 13, color: GREEN, fontWeight: "600" },
  hint: { marginTop: 8, fontSize: 12, color: MUTED },
  postBtn: {
    marginTop: 22,
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  postText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: TEXT, marginBottom: 8 },
  option: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionText: { fontSize: 15, color: TEXT },
});
