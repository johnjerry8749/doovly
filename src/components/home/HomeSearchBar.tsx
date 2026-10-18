import React from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  /** Defaults to "Search professionals..." */
  placeholder?: string;
  /** Optional override for the outer container (Services / Requests variants). */
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional override for the TextInput. */
  inputStyle?: StyleProp<TextStyle>;
  /** Icon name — default search-outline (Home/Services), search (Requests). */
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
};

/**
 * Shared search input used by Home, Services, and Requests.
 * Default styles match Home; pass containerStyle/inputStyle for other screens.
 */
export function HomeSearchBar({
  value,
  onChangeText,
  placeholder = "Search professionals...",
  containerStyle,
  inputStyle,
  iconName = "search-outline",
}: Props) {
  return (
    <View style={[styles.searchContainer, containerStyle]}>
      <Ionicons name={iconName} size={18} color="#9CA3AF" />
      <TextInput
        style={[styles.searchInput, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 45,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#111",
  },
});
