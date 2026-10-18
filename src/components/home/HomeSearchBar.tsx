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
  /**
   * When provided, replaces the default Home container styles entirely
   * (so Services/Requests keep their exact padding/height/margins).
   */
  containerStyle?: StyleProp<ViewStyle>;
  /** When provided, replaces the default Home input styles entirely. */
  inputStyle?: StyleProp<TextStyle>;
  /** Icon name — default search-outline (Home/Services), search (Requests). */
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
};

/**
 * Shared search input used by Home, Services, and Requests.
 * Default styles match Home; pass containerStyle/inputStyle for other screens
 * so their original spacing is preserved exactly.
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
    <View
      style={
        containerStyle
          ? [styles.rowBase, containerStyle]
          : styles.searchContainer
      }
    >
      <Ionicons name={iconName} size={18} color="#9CA3AF" />
      <TextInput
        style={inputStyle ? [styles.inputBase, inputStyle] : styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowBase: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputBase: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },
  // Home defaults (unchanged)
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
