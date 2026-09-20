import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getCurrentUserId } from "@/services/notifications";
import { getProfessionalById } from "@/services/professionals";
import { getLoggedInProfessionalId } from "@/services/savedProviders";

// =====================================================
// COLORS
// =====================================================

const PRIMARY = "#159447";
const LIGHT_GREEN = "#E8F5E9";
const GOLD = "#D4AF37";

// =====================================================
// MOCK DATA — later replace with auth / API
// =====================================================

// Shared mock (MOCK_USER.professionalId). Swap getLoggedInProfessionalId for API later.
const MOCK_LOGGED_IN_PRO_ID = getLoggedInProfessionalId() ?? "1";
const MOCK_ROLE: "user" | "admin" = "admin"; // set to "user" to hide Admin Login
