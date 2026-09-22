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
import { isCurrentUserPro } from "@/services/savedProviders";

export default function BookMeScreen() {
  // =========================================================
  // ROUTE PARAMETERS
  // =========================================================

  const { id, serviceId, serviceName, price } = useLocalSearchParams<{
    id: string;
    serviceId?: string;
    serviceName?: string;
    price?: string;
  }>();

  // =========================================================
  // PROFESSIONAL
  // =========================================================

  const pro = useMemo(() => getProfessionalById(id ?? ""), [id]);

  // Current logged-in user is Pro (from mock auth / later Supabase)
  // Same source as savedProviders limit + rest of the app
  const isProUser = isCurrentUserPro();

  // =========================================================
  // SERVICE
  // =========================================================

  const initialService =
    pro?.services.find((service) => service.id === serviceId) ??
    pro?.services.find((service) => service.name === serviceName) ??
    pro?.services[0] ??
    null;

  const [selectedService, setSelectedService] = useState(initialService);

  const [showServicePicker, setShowServicePicker] = useState(false);

  // =========================================================
  // DATE PICKER
  // =========================================================

  const [selectedDate, setSelectedDate] = useState(new Date());

  const [tempDate, setTempDate] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  // =========================================================
  // TIME PICKER
  // =========================================================

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

  // =========================================================
  // LOCATION
  // =========================================================

  const [address, setAddress] = useState("");

  const [manualAddress, setManualAddress] = useState("");

  const [showLocationModal, setShowLocationModal] = useState(false);

  const [gettingLocation, setGettingLocation] = useState(false);

  // =========================================================
  // NOTES
  // =========================================================

  const [notes, setNotes] = useState("");

  // =========================================================
  // PLATFORM FEE
  // =========================================================
  //
  // This should eventually come from your backend/admin
  // settings. The customer cannot edit this value.
  //
  // Keeping it at 0 prevents the customer app from
  // hardcoding a customer-controlled fee.
  // =========================================================

  const [platformFee] = useState(400);

  // =========================================================
  // DATE HELPERS
  // =========================================================

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

    // Prevent going before the current month.
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

    // Prevent selecting past dates.
    if (newDate < today) {
      return;
    }

    setTempDate(newDate);
  };

  // =========================================================
  // TIME HELPERS
  // =========================================================

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-NG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const openTimePicker = () => {
    const currentHour = selectedTime.getHours();

    setTempHour(currentHour % 12 === 0 ? 12 : currentHour % 12);

    // Keep minutes in 5-minute intervals.
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

  // =========================================================
  // LOCATION
  // =========================================================

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

  // =========================================================
  // PRICE
  // =========================================================

  const serviceFee = selectedService?.priceValue ?? 0;

  const total = serviceFee + platformFee;

  const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

  // =========================================================
  // CONFIRM BOOKING
  // =========================================================

  const handleConfirmBooking = (paymentMethod: "pay_now" | "pay_on_site") => {
    if (!selectedService) {
      Alert.alert("Select Service", "Please select a service.");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Location Required", "Please choose your service location.");
      return;
    }

    // Lock Pay on Site for free users (person booking)
    if (paymentMethod === "pay_on_site" && !isProUser) {
      Alert.alert(
        "Pro Feature",
        "Pay on Site is only available for Pro users. Upgrade to unlock this option.",
      );
      return;
    }

    const bookingData = {
      professionalId: pro?.id,
      serviceId: selectedService.id,
      serviceName: selectedService.name,

      date: selectedDate,
      time: selectedTime,

      address,
      notes,

      serviceFee,
      platformFee,
      total,
      paymentMethod, // "pay_now" | "pay_on_site"
    };

    console.log("BOOKING:", bookingData);

    Alert.alert(
      "Booking Ready",
      paymentMethod === "pay_now"
        ? "Your booking details are ready for payment."
        : "Booking confirmed. You will pay on site.",
    );
    // router.push()
  };

  // =========================================================
  // PROFESSIONAL NOT FOUND
  // =========================================================

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

  // =========================================================
  // SCREEN
  // =========================================================

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* =====================================================
          HEADER
      ===================================================== */}

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
        {/* ===================================================
            TITLE
        =================================================== */}

        <Text style={styles.title}>Book {pro.name}</Text>

        <Text style={styles.subtitle}>
          Fill in the details to book this service.
        </Text>

        {/* ===================================================
            SERVICE
        =================================================== */}

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

        {/* ===================================================
            DATE
        =================================================== */}

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

        {/* ===================================================
            TIME
        =================================================== */}

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

        {/* ===================================================
            ADDRESS
        =================================================== */}

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

        {/* ===================================================
            NOTES
        =================================================== */}

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

        {/* ===================================================
            PRICE BREAKDOWN
        =================================================== */}

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

        {/* ===================================================
            PAYMENT OPTIONS (side by side)
        =================================================== */}

        <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
          {/* Pay Now - always available */}
          <TouchableOpacity
            style={[styles.payBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => handleConfirmBooking("pay_now")}
            activeOpacity={0.85}
          >
            <Text style={styles.payBtnText}>Pay Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          {/* Pay on Site - locked for free users (person booking) */}
          <TouchableOpacity
            style={[
              styles.payBtn,
              {
                flex: 1,
                marginTop: 0,
                backgroundColor: isProUser ? "#16A34A" : "#9CA3AF",
                opacity: isProUser ? 1 : 0.7,
              },
            ]}
            onPress={() => handleConfirmBooking("pay_on_site")}
            activeOpacity={isProUser ? 0.85 : 1}
            disabled={!isProUser}
          >
            <Text style={[styles.payBtnText, { fontSize: 15 }]}>
              Pay on Site
            </Text>
            {isProUser ? (
              <Ionicons name="location-outline" size={18} color="#fff" />
            ) : (
              <Ionicons name="lock-closed" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Message for free users */}
        {!isProUser && (
          <Text
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "#fe4343",
              textAlign: "center",
            }}
          >
            Upgrade to Pro to unlock Pay on Site
          </Text>
        )}

        {/* ===================================================
            SECURE PAYMENT
        =================================================== */}

        <View style={styles.secureRow}>
          {" "}
           <View style={styles.secureDivider} />
          <View style={styles.secureItem}>
            {" "} 
            <Ionicons name="lock-closed" size={14} color="#16A34A" />{" "}
            <Text style={styles.secureText}> Secured by Paystack </Text>{" "}
          </View>{" "}
          <View style={styles.secureDivider} />{" "}
          <View style={styles.secureItem}>
            {" "}
            <Ionicons name="shield-checkmark" size={15} color="#16A34A" />{" "}
            <Text style={styles.secureText}> Money-back guarantee </Text>{" "}
          </View>{" "}
           <View style={styles.secureDivider} />

        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* =====================================================
          SERVICE PICKER MODAL
      ===================================================== */}

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
                  name={service.icon as any}
                  size={22}
                  color="#16A34A"
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceOptionName}>{service.name}</Text>

                  <Text style={styles.serviceOptionPrice}>{service.price}</Text>
                </View>

                {selectedService?.id === service.id && (
                  <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          DATE PICKER MODAL
      ===================================================== */}

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={cancelDate}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelDate}>
          <Pressable
            style={styles.dateTimeSheet}
            onPress={(event) => event.stopPropagation()}
          >
            {/* Header */}

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>

              <TouchableOpacity onPress={cancelDate}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Month Navigation */}

            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.monthArrow}
                onPress={() => changeMonth(-1)}
              >
                <Ionicons name="chevron-back" size={20} color="#111827" />
              </TouchableOpacity>

              <Text style={styles.monthTitle}>
                {calendarMonth.toLocaleDateString("en-NG", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>

              <TouchableOpacity
                style={styles.monthArrow}
                onPress={() => changeMonth(1)}
              >
                <Ionicons name="chevron-forward" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Week Days */}

            <View style={styles.weekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar */}

            <View style={styles.calendarGrid}>
              {Array.from({
                length: getFirstDayOfMonth(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                ),
              }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.calendarDay} />
              ))}

              {Array.from({
                length: getDaysInMonth(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                ),
              }).map((_, index) => {
                const day = index + 1;

                const calendarDate = new Date(
                  calendarMonth.getFullYear(),
                  calendarMonth.getMonth(),
                  day,
                );

                const today = new Date();

                today.setHours(0, 0, 0, 0);

                const isPast = calendarDate < today;

                const isSelected =
                  tempDate.getFullYear() === calendarDate.getFullYear() &&
                  tempDate.getMonth() === calendarDate.getMonth() &&
                  tempDate.getDate() === calendarDate.getDate();

                return (
                  <TouchableOpacity
                    key={day}
                    disabled={isPast}
                    onPress={() => selectCalendarDate(day)}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      isPast && styles.calendarDayDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        isPast && styles.calendarDayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Date */}

            <View style={styles.selectedPreview}>
              <Ionicons name="calendar-outline" size={20} color="#16A34A" />

              <Text style={styles.selectedPreviewText}>
                {formatDate(tempDate)}
              </Text>
            </View>

            {/* Buttons */}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelDate}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneButton} onPress={confirmDate}>
                <Text style={styles.doneButtonText}>Select Date</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          TIME PICKER MODAL
      ===================================================== */}

      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={cancelTime}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelTime}>
          <Pressable
            style={styles.dateTimeSheet}
            onPress={(event) => event.stopPropagation()}
          >
            {/* Header */}

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>

              <TouchableOpacity onPress={cancelTime}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Time Preview */}

            <View style={styles.timePreview}>
              <Ionicons name="time-outline" size={26} color="#16A34A" />

              <Text style={styles.timePreviewText}>
                {String(tempHour).padStart(2, "0")}:
                {String(tempMinute).padStart(2, "0")} {tempPeriod}
              </Text>
            </View>

            {/* Time Selection */}

            <View style={styles.timePickerRow}>
              {/* HOURS */}

              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnTitle}>Hour</Text>

                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {hours.map((hour) => {
                    const isSelected = tempHour === hour;

                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timeOption,
                          isSelected && styles.timeOptionSelected,
                        ]}
                        onPress={() => setTempHour(hour)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            isSelected && styles.timeOptionTextSelected,
                          ]}
                        >
                          {String(hour).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* MINUTES */}

              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnTitle}>Minute</Text>

                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {minutes.map((minute) => {
                    const isSelected = tempMinute === minute;

                    return (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timeOption,
                          isSelected && styles.timeOptionSelected,
                        ]}
                        onPress={() => setTempMinute(minute)}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            isSelected && styles.timeOptionTextSelected,
                          ]}
                        >
                          {String(minute).padStart(2, "0")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* AM / PM */}

              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnTitle}>Period</Text>

                <View style={styles.periodContainer}>
                  {["AM", "PM"].map((period) => {
                    const isSelected = tempPeriod === period;

                    return (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.periodOption,
                          isSelected && styles.periodOptionSelected,
                        ]}
                        onPress={() => setTempPeriod(period as "AM" | "PM")}
                      >
                        <Text
                          style={[
                            styles.periodText,
                            isSelected && styles.periodTextSelected,
                          ]}
                        >
                          {period}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Buttons */}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelTime}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneButton} onPress={confirmTime}>
                <Text style={styles.doneButtonText}>Select Time</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          LOCATION MODAL
      ===================================================== */}

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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Location</Text>

              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Current Location */}

            <TouchableOpacity
              style={styles.locationOption}
              onPress={useCurrentLocation}
              disabled={gettingLocation}
            >
              <View style={styles.locationIconBox}>
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#16A34A" />
                ) : (
                  <Ionicons name="navigate" size={21} color="#16A34A" />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.locationOptionTitle}>
                  {gettingLocation
                    ? "Getting location..."
                    : "Use current location"}
                </Text>

                <Text style={styles.locationOptionText}>
                  Use your device location
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Divider */}

            <View style={styles.locationDivider} />

            {/* Manual Address */}

            <Text style={styles.manualAddressLabel}>
              Enter address manually
            </Text>

            <TextInput
              style={styles.addressInput}
              placeholder="e.g. 15 Allen Avenue, Ikeja, Lagos"
              placeholderTextColor="#9CA3AF"
              value={manualAddress}
              onChangeText={setManualAddress}
              multiline
            />

            <TouchableOpacity
              style={styles.saveAddressButton}
              onPress={useManualAddress}
            >
              <Text style={styles.saveAddressButtonText}>Use This Address</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// =============================================================
// STYLES
// =============================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  notFound: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 12,
  },

  backLink: {
    color: "#16A34A",
    fontWeight: "600",
  },

  // ===========================================================
  // HEADER
  // ===========================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },

  logo: {
    fontSize: 22,
    fontWeight: "700",
    color: "#16A34A",
  },

  shield: {
    width: 40,
    alignItems: "flex-end",
  },

  // ===========================================================
  // CONTENT
  // ===========================================================

  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
    marginBottom: 8,
  },

  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
    gap: 10,
  },

  fieldText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },

  placeholderText: {
    color: "#9CA3AF",
  },

  // ===========================================================
  // NOTES
  // ===========================================================

  notesBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    minHeight: 90,
    marginBottom: 24,
    position: "relative",
  },

  notesInput: {
    fontSize: 14,
    color: "#111827",
    paddingRight: 28,
    textAlignVertical: "top",
  },

  notesIcon: {
    position: "absolute",
    right: 14,
    bottom: 14,
  },

  // ===========================================================
  // PRICE BREAKDOWN
  // ===========================================================

  breakdown: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },

  breakdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  rowLabel: {
    fontSize: 14,
    color: "#6B7280",
  },

  feeHint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },

  rowValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16A34A",
  },

  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16A34A",
  },

  // ===========================================================
  // PAY BUTTON
  // ===========================================================

  payBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  payBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 10,
  },
  secureItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  secureText: { fontSize: 12, color: "#6B7280" },
  secureDivider: { width: 1, height: 16, backgroundColor: "#E5E7EB" },

  // ===========================================================
  // GENERAL MODAL
  // ===========================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },

  dateTimeSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "90%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111827",
  },

  // ===========================================================
  // SERVICE MODAL
  // ===========================================================

  serviceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  serviceOptionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  serviceOptionPrice: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  // ===========================================================
  // CALENDAR
  // ===========================================================

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 18,
  },

  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  weekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  calendarDay: {
    width: "14.2857%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  calendarDaySelected: {
    backgroundColor: "#16A34A",
    borderRadius: 24,
  },

  calendarDayDisabled: {
    opacity: 0.3,
  },

  calendarDayText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },

  calendarDayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  calendarDayTextDisabled: {
    color: "#9CA3AF",
  },

  selectedPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },

  selectedPreviewText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },

  // ===========================================================
  // TIME PICKER
  // ===========================================================

  timePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 18,
    gap: 10,
  },

  timePreviewText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  timePickerRow: {
    flexDirection: "row",
    gap: 10,
  },

  timeColumn: {
    flex: 1,
  },

  timeColumnTitle: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },

  timeScroll: {
    height: 190,
  },

  timeScrollContent: {
    paddingVertical: 4,
  },

  timeOption: {
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    backgroundColor: "#F9FAFB",
  },

  timeOptionSelected: {
    backgroundColor: "#16A34A",
  },

  timeOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  timeOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  periodContainer: {
    gap: 8,
  },

  periodOption: {
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  periodOptionSelected: {
    backgroundColor: "#16A34A",
  },

  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  periodTextSelected: {
    color: "#FFFFFF",
  },

  // ===========================================================
  // MODAL BUTTONS
  // ===========================================================

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },

  doneButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  doneButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ===========================================================
  // LOCATION MODAL
  // ===========================================================

  locationOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },

  locationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },

  locationOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  locationOptionText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },

  locationDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  manualAddressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },

  addressInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },

  saveAddressButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  saveAddressButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});