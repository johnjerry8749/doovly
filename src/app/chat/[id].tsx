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
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  getConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  isSharingLocation,
  shareLocation,
  stopSharingLocation,
  canOpenSharedLocation,
  getBookingStatus,
  canSendMessage,
  isProfessionalInConversation,
  acceptBooking,
  declineBooking,
  type ChatMessage,
  type Conversation,
  type BookingChatStatus,
} from "@/services/chat";
import {
  addInAppNotification,
  getCurrentUserId,
} from "@/services/inAppNotifications";
import { getLoggedInProfessionalId } from "@/services/savedProviders";

const PRIMARY = "#159447";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_DARK = "#111827";
const TEXT_MUTED = "#6B7280";

async function openMapsForLocation(location: {
  label: string;
  latitude?: number;
  longitude?: number;
}) {
  try {
    let url = "";
    if (
      typeof location.latitude === "number" &&
      typeof location.longitude === "number"
    ) {
      const { latitude, longitude } = location;
      if (Platform.OS === "ios") {
        url = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(location.label)}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      }
    } else {
      const q = encodeURIComponent(location.label);
      if (Platform.OS === "ios") {
        url = `http://maps.apple.com/?q=${q}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${q}`;
      }
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Unable to open map", "No map app available on this device.");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Map Error", "Could not open this location.");
  }
}

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
  const [sharing, setSharing] = useState(false);
  const [bookingStatus, setBookingStatus] =
    useState<BookingChatStatus>("Accepted");
  const listRef = useRef<FlatList>(null);
  const currentUserId = getCurrentUserId();
  const loggedInProId = getLoggedInProfessionalId();
  const isProfessional = Boolean(
    loggedInProId &&
      isProfessionalInConversation(conversationId, loggedInProId),
  );

  useEffect(() => {
    const conv = getConversation(conversationId);
    setConversation(conv);
    setMessages(getMessages(conversationId));
    setSharing(isSharingLocation(conversationId));
    setBookingStatus(getBookingStatus(conversationId));
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

  const onAccept = () => {
    if (!conversation) return;
    const msg = acceptBooking(conversationId, conversation.participant.name);
    setMessages((prev) => [...prev, msg]);
    setBookingStatus("Accepted");

    addInAppNotification({
      userId: "u1",
      type: "booking",
      title: "Booking Accepted",
      body: `${conversation.participant.name} accepted your booking.`,
    });
  };

  const onDecline = () => {
    if (!conversation) return;
    const msg = declineBooking(conversationId, conversation.participant.name);
    setMessages((prev) => [...prev, msg]);
    setBookingStatus("Declined");

    addInAppNotification({
      userId: "u1",
      type: "booking",
      title: "Booking Declined",
      body: `${conversation.participant.name} declined your booking.`,
    });
  };

  const onShareLocation = () => {
    Alert.alert(
      "Share location",
      "Share your location in this chat? You can stop sharing anytime for privacy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: async () => {
            setSending(true);
            try {
              const msg = await shareLocation(conversationId, {
                label: "Service location",
              });
              setSharing(true);
              setMessages((prev) => [...prev, msg]);
              setTimeout(
                () => listRef.current?.scrollToEnd({ animated: true }),
                50,
              );
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  const onStopSharing = () => {
    Alert.alert(
      "Stop sharing",
      "Others will no longer be able to open your location from this chat.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop sharing",
          style: "destructive",
          onPress: async () => {
            setSending(true);
            try {
              const msg = await stopSharingLocation(conversationId);
              setSharing(false);
              if (msg) {
                setMessages((prev) => [...prev, msg]);
                setTimeout(
                  () => listRef.current?.scrollToEnd({ animated: true }),
                  50,
                );
              }
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  const onPressLocationMessage = (item: ChatMessage) => {
    if (!item.location) return;
    if (!canOpenSharedLocation(conversationId, item)) {
      Alert.alert(
        "Location private",
        "Sharing has been stopped. This location can no longer be opened.",
      );
      return;
    }
    openMapsForLocation(item.location);
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
            {sharing
              ? "Sharing location"
              : p.online
                ? "Online"
                : "Offline"}
          </Text>
        </View>

        {sharing ? (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={onStopSharing}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={onShareLocation}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>
        )}
      </View>

      {sharing && (
        <View style={styles.sharingBar}>
          <Ionicons name="navigate" size={14} color={PRIMARY} />
          <Text style={styles.sharingBarText}>Location is being shared</Text>
          <TouchableOpacity onPress={onStopSharing} activeOpacity={0.7}>
            <Text style={styles.stopShareText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

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
          renderItem={({ item }) => {
            if (item.kind === "location_stopped") {
              return (
                <View style={styles.systemWrap}>
                  <Text style={styles.systemText}>{item.text}</Text>
                </View>
              );
            }

            if (item.kind === "location" && item.location) {
              const canOpen = canOpenSharedLocation(conversationId, item);
              return (
                <View
                  style={[
                    styles.bubbleWrap,
                    item.isMine
                      ? styles.bubbleWrapMine
                      : styles.bubbleWrapTheirs,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.bubble,
                      styles.locationBubble,
                      item.isMine ? styles.bubbleMine : styles.bubbleTheirs,
                      !canOpen && styles.locationBubbleLocked,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => onPressLocationMessage(item)}
                  >
                    <View style={styles.locationRow}>
                      <Ionicons
                        name={canOpen ? "map-outline" : "lock-closed-outline"}
                        size={18}
                        color={canOpen ? PRIMARY : TEXT_MUTED}
                      />
                      <Text
                        style={[
                          styles.bubbleText,
                          !canOpen && styles.locationLockedText,
                        ]}
                        numberOfLines={2}
                      >
                        {canOpen
                          ? item.location.label
                          : "Location no longer shared"}
                      </Text>
                    </View>
                    {canOpen && (
                      <Text style={styles.openMapHint}>Tap to open map</Text>
                    )}
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.time,
                      item.isMine ? styles.timeMine : styles.timeTheirs,
                    ]}
                  >
                    {item.createdAt}
                  </Text>
                </View>
              );
            }

            return (
              <View
                style={[
                  styles.bubbleWrap,
                  item.isMine
                    ? styles.bubbleWrapMine
                    : styles.bubbleWrapTheirs,
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
            );
          }}
        />

        {bookingStatus === "Pending" && isProfessional && (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
          >
            <TouchableOpacity
              onPress={onDecline}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#FEE2E2",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{ color: "#DC2626", fontWeight: "700", fontSize: 15 }}
              >
                Decline
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAccept}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                backgroundColor: PRIMARY,
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.85}
            >
              <Text
                style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}
              >
                Accept
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          {canSendMessage(conversationId) ? (
            <>
              <TouchableOpacity
                style={styles.attachBtn}
                activeOpacity={0.7}
                onPress={sharing ? onStopSharing : onShareLocation}
              >
                <Ionicons
                  name={sharing ? "location" : "location-outline"}
                  size={22}
                  color={sharing ? "#DC2626" : TEXT_MUTED}
                />
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
            </>
          ) : (
            <View
              style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}
            >
              <Text
                style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: "600" }}
              >
                {bookingStatus === "Pending"
                  ? "Waiting for professional to accept..."
                  : "This booking was declined"}
              </Text>
            </View>
          )}
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
  headerAction: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  sharingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: LIGHT_GREEN,
    borderBottomWidth: 1,
    borderBottomColor: "#BBF7D0",
  },
  sharingBarText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
  },
  stopShareText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
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
  locationBubble: {
    minWidth: 180,
  },
  locationBubbleLocked: {
    opacity: 0.75,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationLockedText: {
    color: TEXT_MUTED,
  },
  openMapHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: PRIMARY,
  },
  systemWrap: {
    alignSelf: "center",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  systemText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
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
