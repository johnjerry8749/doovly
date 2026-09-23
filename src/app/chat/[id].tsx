import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  type ChatMessage,
  type Conversation,
} from "@/services/chat";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

export default function ChatConversation() {
  const { id, initialMessage } = useLocalSearchParams<{
    id: string;
    initialMessage?: string;
  }>();
  const conversationId = String(id ?? "");
  const draftFromRoute =
    typeof initialMessage === "string"
      ? initialMessage
      : Array.isArray(initialMessage)
        ? initialMessage[0]
        : "";

  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState(draftFromRoute || "");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    // TODO backend: fetch conversation + messages (and subscribe to realtime)
    const conv = getConversation(conversationId);
    setConversation(conv);
    setMessages(getMessages(conversationId));
    markConversationRead(conversationId);
  }, [conversationId]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");
    try {
      const msg = await sendMessage(conversationId, trimmed);
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Conversation not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const p = conversation.participant;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={PRIMARY} />
        </TouchableOpacity>

        <Image source={p.image} style={styles.headerAvatar} />

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={styles.headerStatus}>
            {p.online ? "Online" : "Offline"}
            {p.online ? (
              <Text style={{ color: PRIMARY }}> · </Text>
            ) : null}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color={TEXT_MUTED} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubbleWrap,
                item.isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  item.isMine ? styles.bubbleMine : styles.bubbleTheirs,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    item.isMine && styles.bubbleTextMine,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
              <Text
                style={[
                  styles.time,
                  item.isMine ? styles.timeMine : styles.timeTheirs,
                ]}
              >
                {item.createdAt}
              </Text>
            </View>
          )}
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7}>
            <Ionicons name="attach" size={22} color={TEXT_MUTED} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={onSend}
            activeOpacity={0.85}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: TEXT_MUTED,
  },
  backLink: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: "600",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_DARK,
  },
  headerStatus: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  bubbleWrap: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  bubbleWrapMine: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  bubbleWrapTheirs: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: LIGHT_GREEN,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: TEXT_DARK,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: TEXT_DARK,
  },
  time: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  timeMine: {
    textAlign: "right",
  },
  timeTheirs: {
    textAlign: "left",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 8,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: TEXT_DARK,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
