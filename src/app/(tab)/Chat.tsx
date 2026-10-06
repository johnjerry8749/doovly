import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  listConversationsAsync,
  getCachedConversationsAsync,
  cacheConversationsAsync,
  ensureChatRealtime,
  markConversationReadAsync,
  deleteConversationAsync,
  blockConversationAsync,
  type Conversation,
} from "@/services/chat";

const PRIMARY = "#159447";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

export default function ChatList() {
  const [query, setQuery] = useState("");

  // Keep conversations in local state so unread counts
  // can disappear immediately when a chat is opened.
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (showInitialLoading = false) => {
    if (showInitialLoading) setLoading(true);

    try {
      const fresh = await listConversationsAsync();
      setConversations(fresh);
      await cacheConversationsAsync(fresh);
    } catch (error) {
      console.warn("Chat list refresh failed:", error);
    } finally {
      if (showInitialLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const start = async () => {
      const cached = await getCachedConversationsAsync();

      if (active && cached?.length) {
        setConversations(cached);
        setLoading(false);
      }

      // Always refresh from Supabase in the background.
      await refresh(!cached);
    };

    void start();

    let cleanup: (() => void) | undefined;
    void ensureChatRealtime(() => {
      void refresh(false);
    }).then((stop) => {
      cleanup = stop;
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [refresh]);

  const filtered = conversations.filter((conversation) => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return true;
    }

    return (
      conversation.participant.name
        .toLowerCase()
        .includes(search) ||
      conversation.lastMessage
        .toLowerCase()
        .includes(search)
    );
  });

  const deleteChat = useCallback(async (item: Conversation) => {
    try {
      await deleteConversationAsync(item.id);
      setConversations((current) => current.filter((conversation) => conversation.id !== item.id));
    } catch (error: any) {
      Alert.alert("Delete failed", error?.message ?? "Could not delete this chat.");
    }
  }, []);

  const blockChat = useCallback(async (item: Conversation) => {
    try {
      await blockConversationAsync(item.id);
      setConversations((current) => current.map((conversation) => conversation.id === item.id ? { ...conversation, blocked: true } : conversation));
    } catch (error: any) {
      Alert.alert("Block failed", error?.message ?? "Could not block this chat.");
    }
  }, []);

  const onHoldChat = useCallback((item: Conversation) => {
    Alert.alert(item.participant.name, "Choose an action", [
      { text: "Delete chat", style: "destructive", onPress: () => void deleteChat(item) },
      { text: "Block chat", style: "destructive", onPress: () => void blockChat(item) },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [blockChat, deleteChat]);

  const openChat = useCallback((item: Conversation) => {
    void markConversationReadAsync(item.id);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === item.id
          ? {
              ...conversation,
              unreadCount: 0,
            }
          : conversation
      )
    );

    router.push({
      pathname: "/chat/[id]",
      params: {
        id: item.id,
      },
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />

        <Text style={styles.headerTitle}>
          Messages
        </Text>

        <View style={styles.headerIcon} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons
          name="search"
          size={18}
          color={TEXT_MUTED}
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Search messages"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />

        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversations */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color="#D1D5DB"
            />

            <Text style={styles.emptyTitle}>
              No messages yet
            </Text>

            <Text style={styles.emptySub}>
              Conversations with clients and providers
              will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => openChat(item)}
            onLongPress={() => onHoldChat(item)}
            delayLongPress={500}
            activeOpacity={0.7}
          >
            {/* Avatar + Verification */}
            <View style={styles.avatarWrap}>
              <Image
                source={item.participant.image}
                style={styles.avatar}
                resizeMode="cover"
              />
            </View>

            {/* Message Content */}
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text
                  style={styles.name}
                  numberOfLines={1}
                >
                  {item.participant.name}
                </Text>

                <Text style={styles.time}>
                  {item.lastMessageAt}
                </Text>
              </View>

              <View style={styles.rowBottom}>
                <Text
                  style={styles.preview}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>

                {/* Unread count */}
                {item.unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // =========================
  // HEADER
  // =========================

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

  headerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // =========================
  // SEARCH
  // =========================

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  // =========================
  // LIST
  // =========================

  list: {
    paddingBottom: 24,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  // =========================
  // AVATAR
  // =========================

  avatarWrap: {
    width: 58,
    height: 58,
    position: "relative",
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E5E7EB",
  },

  // Large verification badge
  verifiedBadge: {
    position: "absolute",
    right: 6,
    bottom: 4,
    width: 15,
    height: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  verifiedImage: {
    width: 30,
    height: 30,
  },

  // =========================
  // MESSAGE CONTENT
  // =========================

  rowBody: {
    flex: 1,
    minWidth: 0,
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    marginRight: 8,
  },

  time: {
    fontSize: 12,
    color: TEXT_MUTED,
  },

  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  preview: {
    flex: 1,
    fontSize: 13,
    color: TEXT_MUTED,
    marginRight: 8,
  },

  // =========================
  // UNREAD COUNT
  // =========================

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  // =========================
  // EMPTY STATE
  // =========================

  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 12,
  },

  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});
