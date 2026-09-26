import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { getProfessionalById } from "@/services/professionals";
import { createBookingConversation } from "@/services/chat";
import { addInAppNotification } from "@/services/inAppNotifications";

export default function BookMeScreen() {
  const { id, serviceId, serviceName, price } = useLocalSearchParams<{
    id: string;
    serviceId?: string;
    serviceName?: string;
    price?: string;
  }>();

  const pro = useMemo(() => getProfessionalById(id ?? ""), [id]);

  const initialService =
    pro?.services.find((service) => service.id === serviceId) ??
    pro?.services.find((service) => service.name === serviceName) ??
    pro?.services[0] ??
    null;

  const [selectedService, setSelectedService] = useState(initialService);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [tempHour, setTempHour] = useState(
    new Date().getHours() % 12 === 0 ? 12 : new Date().getHours() % 12,
  );
  const [tempMinute, setTempMinute] = useState(
    Math.floor(new Date().getMinutes() / 5) * 5,
  );
  const [tempPeriod, setTempPeriod] = useState<"AM" | "PM">(
    new Date().getHours() >= 12 ? "PM" : "AM",
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [notes, setNotes] = useState("");
  const [platformFee] = useState(400);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const openDatePicker = () => {
    setTempDate(selectedDate);
    setCalendarMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
    setShowDatePicker(true);
  };

  const confirmDate = () => {
    setSelectedDate(tempDate);
    setShowDatePicker(false);
  };

  const cancelDate = () => {
    setTempDate(selectedDate);
    setShowDatePicker(false);
  };

  const changeMonth = (direction: number) => {
    const newMonth = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + direction,
      1,
    );
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (newMonth < currentMonth) {
      return;
    }
    setCalendarMonth(newMonth);
  };

  const selectCalendarDate = (day: number) => {
    const newDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      return;
    }
    setTempDate(newDate);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-NG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const openTimePicker = () => {
    const currentHour = selectedTime.getHours();
    setTempHour(currentHour % 12 === 0 ? 12 : currentHour % 12);
    setTempMinute(Math.floor(selectedTime.getMinutes() / 5) * 5);
    setTempPeriod(currentHour >= 12 ? "PM" : "AM");
    setShowTimePicker(true);
  };

  const confirmTime = () => {
    let hour = tempHour;
    if (tempPeriod === "AM") {
      if (hour === 12) {
        hour = 0;
      }
    } else {
      if (hour !== 12) {
        hour += 12;
      }
    }
    const newTime = new Date(selectedTime);
    newTime.setHours(hour, tempMinute, 0, 0);
    setSelectedTime(newTime);
    setShowTimePicker(false);
  };

  const cancelTime = () => {
    setShowTimePicker(false);
  };

  const hours = Array.from({ length: 12 }, (_, index) => index + 1);
  const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

  const useCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Please allow location access to use your current location.",
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
          place.city,
          place.region,
          place.country,
        ]
          .filter(Boolean)
          .join(", ");
        setAddress(formattedAddress);
      } else {
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
      setShowLocationModal(false);
    } catch (error) {
      console.log("Location error:", error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please enter your address manually.",
      );
    } finally {
      setGettingLocation(false);
    }
  };

  const useManualAddress = () => {
    const trimmedAddress = manualAddress.trim();
    if (!trimmedAddress) {
      Alert.alert("Address Required", "Please enter your service address.");
      return;
    }
    setAddress(trimmedAddress);
    setShowLocationModal(false);
  };

  const serviceFee = selectedService?.priceValue ?? 0;
  const total = serviceFee + platformFee;
  const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

  const handleConfirmBooking = () => {
    if (!selectedService) {
      Alert.alert("Select Service", "Please select a service.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Location Required", "Please choose your service location.");
      return;
    }
    if (!pro) return;

    const conv = createBookingConversation({
      professionalId: pro.id,
      professionalName: pro.name,
      professionalImage: pro.image,
      professionalVerified: pro.verified,
      bookingTitle: selectedService.name,
      bookingDate: `${formatDate(selectedDate)} • ${formatTime(selectedTime)}`,
    });

    addInAppNotification({
      userId: `pro-${pro.id}`,
      type: "booking",
      title: "New Booking Request",
      body: `Someone requested ${selectedService.name} on ${formatDate(selectedDate)}.`,
    });

    router.replace({
      pathname: "/chat/[id]",
      params: { id: conv.id },
    });
  };

  if (!pro) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>Professional not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#16A34A" />
        </TouchableOpacity>
        <Text style={styles.logo}>Doovly</Text>
        <View style={styles.shield}>
          <Ionicons name="shield-checkmark" size={22} color="#16A34A" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Book {pro.name}</Text>
        <Text style={styles.subtitle}>
          Fill in the details to book this service.
        </Text>

        <Text style={styles.label}>Service</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => setShowServicePicker(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={(selectedService?.icon as any) || "pipe"}
            size={22}
            color="#16A34A"
          />
          <Text style={styles.fieldText}>
            {selectedService
              ? `${selectedService.name} ${selectedService.price}`
              : "Select a service"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={openDatePicker}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={22} color="#16A34A" />
          <Text style={styles.fieldText}>{formatDate(selectedDate)}</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <Text style={styles.label}>Time</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={openTimePicker}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={22} color="#16A34A" />
          <Text style={styles.fieldText}>{formatTime(selectedTime)}</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <Text style={styles.label}>Address</Text>
        <TouchableOpacity
          style={styles.field}
          onPress={() => setShowLocationModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={22} color="#16A34A" />
          <Text
            style={[
              styles.fieldText,
              { flex: 1 },
              !address && styles.placeholderText,
            ]}
            numberOfLines={2}
          >
            {address || "Choose your service location"}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <Text style={styles.label}>Notes (optional)</Text>
        <View style={styles.notesBox}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any additional information or special instructions..."
            placeholderTextColor="#9CA3AF"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          <Ionicons
            name="create-outline"
            size={18}
            color="#9CA3AF"
            style={styles.notesIcon}
          />
        </View>

        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>Price Breakdown</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Service fee</Text>
            <Text style={styles.rowValue}>{formatNaira(serviceFee)}</Text>
          </View>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Platform fee</Text>
              <Text style={styles.feeHint}>Set by Doovly</Text>
            </View>
            <Text style={styles.rowValue}>{formatNaira(platformFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatNaira(total)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.payBtn}
          onPress={handleConfirmBooking}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>Confirm Booking</Text>
          <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.secureRow}>
          <View style={styles.secureDivider} />
          <View style={styles.secureItem}>
            <Ionicons name="chatbubbles-outline" size={14} color="#16A34A" />
            <Text style={styles.secureText}> Opens chat with professional </Text>
          </View>
          <View style={styles.secureDivider} />
          <View style={styles.secureItem}>
            <Ionicons name="shield-checkmark" size={15} color="#16A34A" />
            <Text style={styles.secureText}> Accept required to message </Text>
          </View>
          <View style={styles.secureDivider} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={showServicePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServicePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowServicePicker(false)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Select service</Text>
            {pro.services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceOption}
                onPress={() => {
                  setSelectedService(service);
                  setShowServicePicker(false);
                }}
              >
                <MaterialCommunityIcons
                  name={(service.icon as any) || "pipe"}
                  size={22}
                  color="#16A34A"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceOptionName}>{service.name}</Text>
                  <Text style={styles.serviceOptionPrice}>{service.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={cancelDate}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelDate}>
          <Pressable
            style={styles.modalSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={cancelDate}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select date</Text>
              <TouchableOpacity onPress={confirmDate}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={22} color="#16A34A" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {calendarMonth.toLocaleDateString("en-NG", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={22} color="#16A34A" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <Text key={d} style={styles.weekDay}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {Array.from({
                length: getFirstDayOfMonth(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                ),
              }).map((_, i) => (
                <View key={`e-${i}`} style={styles.dayCell} />
              ))}
              {Array.from({
                length: getDaysInMonth(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                ),
              }).map((_, i) => {
                const day = i + 1;
                const isSelected =
                  tempDate.getDate() === day &&
                  tempDate.getMonth() === calendarMonth.getMonth() &&
                  tempDate.getFullYear() === calendarMonth.getFullYear();
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCell, isSelected && styles.daySelected]}
                    onPress={() => selectCalendarDate(day)}
                  >
                    <Text
                      style={[styles.dayText, isSelected && styles.dayTextSelected]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={cancelTime}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelTime}>
          <Pressable
            style={styles.modalSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={cancelTime}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select time</Text>
              <TouchableOpacity onPress={confirmTime}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timePickRow}>
              <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
                {hours.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.timeItem, tempHour === h && styles.timeItemActive]}
                    onPress={() => setTempHour(h)}
                  >
                    <Text
                      style={[
                        styles.timeItemText,
                        tempHour === h && styles.timeItemTextActive,
                      ]}
                    >
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
                {minutes.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.timeItem,
                      tempMinute === m && styles.timeItemActive,
                    ]}
                    onPress={() => setTempMinute(m)}
                  >
                    <Text
                      style={[
                        styles.timeItemText,
                        tempMinute === m && styles.timeItemTextActive,
                      ]}
                    >
                      {String(m).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.timeCol}>
                {(["AM", "PM"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.timeItem,
                      tempPeriod === p && styles.timeItemActive,
                    ]}
                    onPress={() => setTempPeriod(p)}
                  >
                    <Text
                      style={[
                        styles.timeItemText,
                        tempPeriod === p && styles.timeItemTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLocationModal(false)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Service location</Text>
            <TouchableOpacity
              style={styles.locationOption}
              onPress={useCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator color="#16A34A" />
              ) : (
                <Ionicons name="navigate-outline" size={22} color="#16A34A" />
              )}
              <Text style={styles.locationOptionText}>Use current location</Text>
            </TouchableOpacity>
            <Text style={styles.orText}>or enter manually</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Street, city, area..."
              placeholderTextColor="#9CA3AF"
              value={manualAddress}
              onChangeText={setManualAddress}
            />
            <TouchableOpacity
              style={styles.payBtn}
              onPress={useManualAddress}
              activeOpacity={0.85}
            >
              <Text style={styles.payBtnText}>Use this address</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 16, color: "#6B7280" },
  backLink: { fontSize: 15, color: "#16A34A", fontWeight: "600" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  logo: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800", color: "#16A34A" },
  shield: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 6, marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 12,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  fieldText: { flex: 1, fontSize: 15, color: "#111827" },
  placeholderText: { color: "#9CA3AF" },
  notesBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 90,
    position: "relative",
  },
  notesInput: { fontSize: 14, color: "#111827", minHeight: 70, textAlignVertical: "top" },
  notesIcon: { position: "absolute", right: 12, bottom: 12 },
  breakdown: {
    marginTop: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  breakdownTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  feeHint: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#16A34A" },
  payBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  payBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
    flexWrap: "wrap",
  },
  secureDivider: { width: 1, height: 12, backgroundColor: "#E5E7EB" },
  secureItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  secureText: { fontSize: 11, color: "#6B7280" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 12 },
  modalCancel: { fontSize: 15, color: "#6B7280" },
  modalDone: { fontSize: 15, fontWeight: "700", color: "#16A34A" },
  serviceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  serviceOptionName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  serviceOptionPrice: { fontSize: 13, color: "#16A34A", marginTop: 2 },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarMonthLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelected: { backgroundColor: "#16A34A", borderRadius: 20 },
  dayText: { fontSize: 14, color: "#111827" },
  dayTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  timePickRow: { flexDirection: "row", height: 200, gap: 8 },
  timeCol: { flex: 1 },
  timeItem: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  timeItemActive: { backgroundColor: "#DCFCE7" },
  timeItemText: { fontSize: 16, color: "#6B7280" },
  timeItemTextActive: { color: "#16A34A", fontWeight: "700" },
  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  locationOptionText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  orText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginBottom: 12,
    fontSize: 13,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },
});
