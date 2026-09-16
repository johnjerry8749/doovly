import React, { useState } from "react";
import {
  Alert,
  Image,
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function bookings() {
    return (
      <SafeAreaView>
        <View style={style.container}>
      <Text>bookings</Text>
    </View>
    </SafeAreaView>
    
  );
}

const style = StyleSheet.create({
  container: {

  }

})