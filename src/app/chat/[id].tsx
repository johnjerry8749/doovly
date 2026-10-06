import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
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
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  getConversationAsync,
  getMessagesAsync,
  sendMessage,
  markConversationReadAsync,
  isSharingLocationAsync,
  shareLocation,
  stopSharingLocation,
  canOpenSharedLocation,
  getBookingStatusAsync,
  canSendMessageAsync,
  isAcceptorInConversationAsync,
  acceptBooking,
  declineBooking,
  getConversationKindAsync,
  ensureChatRealtime,
  type ChatMessage,
  type Conversation,
  type BookingChatStatus,
  type RequestCardData,
  getChatCreditsAsync,
  isCurrentUserChatProAsync,
  sendImageMessage,
} from "@/services/chat";
import { loadSessionUser } from "@/lib/session";



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

function RequestCard({ card }: { card: RequestCardData }) {
  const isOffer = card.kind === "offer";
  const amountText =
    card.amount != null ? `₦${card.amount.toLocaleString()}` : null;

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestCardBadge}>
        <Ionicons
          name={isOffer ? "document-text" : "calendar"}
          size={12}
          color="#fff"
        />
        <Text style={styles.requestCardBadgeText}>
          {isOffer ? "OFFER REQUEST" : "BOOKING REQUEST"}
        </Text>
      </View>

      <Text style={styles.requestCardTitle}>{card.title}</Text>

      {card.category ? (
        <View style={styles.requestCategoryChip}>
          <Text style={styles.requestCategoryText}>{card.category}</Text>
        </View>
      ) : null}

      {card.location ? (
        <View style={styles.requestMetaRow}>
          <Ionicons name="location-outline" size={14} color={TEXT_MUTED} />
          <Text style={styles.requestMetaText}>{card.location}</Text>
        </View>
      ) : null}

      {card.date ? (
        <View style={styles.requestMetaRow}>
          <Ionicons name="calendar-outline" size={14} color={TEXT_MUTED} />
          <Text style={styles.requestMetaText}>{card.date}</Text>
        </View>
      ) : null}

      {card.description ? (
        <Text style={styles.requestDescription} numberOfLines={4}>
          {card.description}
        </Text>
      ) : null}

      {amountText ? (
        <Text style={styles.requestAmount}>{amountText}</Text>
      ) : null}

      <View style={styles.requestDivider} />

      <View style={styles.requestStatusRow}>
        <Ionicons
          name={
            card.statusLabel.toLowerCase().includes("accept")
              ? "checkmark-circle"
              : card.statusLabel.toLowerCase().includes("declin")
                ? "close-circle"
                : "time-outline"
          }
          size={14}
          color={
            card.statusLabel.toLowerCase().includes("accept")
              ? PRIMARY
              : card.statusLabel.toLowerCase().includes("declin")
                ? "#DC2626"
                : TEXT_MUTED
          }
        />
        <Text
          style={[
            styles.requestStatusText,
            card.statusLabel.toLowerCase().includes("accept") && {
              color: PRIMARY,
            },
            card.statusLabel.toLowerCase().includes("declin") && {
              color: "#DC2626",
            },
          ]}
        >
          {card.statusLabel}
        </Text>
      </View>
    </View>
  );
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
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState(draftFromRoute || "");
  const [sending, setSending] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [bookingStatus, setBookingStatus] =
    useState<BookingChatStatus>("Pending");
  const [bookingStatusLoaded, setBookingStatusLoaded] = useState(false);
  const [decisionProcessing, setDecisionProcessing] = useState(false);
  const decisionInProgress = useRef(false);
  const listRef = useRef<FlatList>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isAcceptor, setIsAcceptor] = useState(false);
  const [convKind, setConvKind] = useState<"booking" | "offer" | undefined>();
  const [chatCoins, setChatCoins] = useState<number | null>(15);
  const [chatPro, setChatPro] = useState(false);

  useEffect(() => {
    let active = true;
    void loadSessionUser().then((session) => {
      if (!active) return;
      const uid = session?.uuid ?? "";
      setCurrentUserId(uid);
      if (uid) {
        void isAcceptorInConversationAsync(conversationId, uid)
          .then(setIsAcceptor)
          .catch(() => setIsAcceptor(false));
      }
    });
    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    let active = true;

    let liveLoadInProgress = false;

    const loadLive = async () => {
      // Realtime can fire several times in quick succession. Avoid overlapping
      // full conversation refreshes, which can cause stale state to win.
      if (liveLoadInProgress || !active) return;
      liveLoadInProgress = true;
      try {
        const conv = await getConversationAsync(conversationId);
        if (!active) return;

        if (conv) {
          hasLiveConversation = true;
          setConversation(conv);

          try {
            const msgs = await getMessagesAsync(conv.id);
            if (active) setMessages(msgs);
          } catch (error) {
            console.warn("Could not refresh chat messages:", error);
          }

          try {
            const sharingNow = await isSharingLocationAsync(conv.id);
            if (active) setSharing(sharingNow);
          } catch (error) {
            console.warn("Could not refresh location state:", error);
          }

          try {
            const status = await getBookingStatusAsync(conv.id);
            if (active) {
              setBookingStatus(status);
              setBookingStatusLoaded(true);
            }
          } catch (error) {
            console.warn("Could not refresh booking status:", error);
            if (active) setBookingStatusLoaded(true);
          }

          try {
            const kind = await getConversationKindAsync(conv.id);
            if (active) setConvKind(kind);
          } catch (error) {
            console.warn("Could not refresh conversation kind:", error);
          }

          void markConversationReadAsync(conv.id).catch((error) => {
            console.warn("Could not mark conversation read:", error);
          });
        } else {
          setConversation(undefined);
          setMessages([]);
        }

        try {
          const [proNow, coinsNow] = await Promise.all([
            isCurrentUserChatProAsync(),
            getChatCreditsAsync(),
          ]);
          if (active) {
            setChatPro(proNow);
            setChatCoins(coinsNow);
          }
        } catch (error) {
          console.warn("Could not refresh chat credits:", error);
        }
      } catch (error) {
        console.warn("Chat conversation refresh failed:", error);
      } finally {
        liveLoadInProgress = false;
        if (active) setLoadingConversation(false);
      }
    };

    // Use Supabase as the only source for this conversation and its messages.
    void loadLive();

    let cleanup: (() => void) | undefined;
    void ensureChatRealtime(() => {
      void loadLive();
    }).then((stop) => {
      cleanup = stop;
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [conversationId]);

  const proDisplayName = "You";

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText("");
    try {
      const msg = await sendMessage(conversationId, trimmed);
      setMessages((prev) => [...prev, msg]);
      setChatCoins(await getChatCreditsAsync());
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error: any) {
      setText(trimmed);
      const message = String(error?.message ?? error);
      if (message.includes("CHAT_CREDITS_EXHAUSTED")) {
        Alert.alert(
          "Chat coins finished",
          "You have used your 15 free chat coins. Subscribe to Doovly Pro for unlimited messages.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Subscribe", onPress: () => router.push("/profile/subscription/subscription") },
          ],
        );
      } else {
        Alert.alert("Message failed", message || "Could not send your message.");
      }
    } finally {
      setSending(false);
    }
  };

  const onPickImage = async () => {
    if (!chatPro) {
      Alert.alert(
        "Pro feature",
        "Image messages are available on Doovly Pro. Upgrade to send images in chat.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Subscribe", onPress: () => router.push("/profile/subscription/subscription") },
        ],
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setSending(true);
    try {
      const msg = await sendImageMessage(conversationId, result.assets[0].uri);
      setMessages((prev) => [...prev, msg]);
      setChatCoins(await getChatCreditsAsync());
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error: any) {
      const message = String(error?.message ?? error);
      if (message.includes("IMAGE_CHAT_PRO_REQUIRED")) {
        Alert.alert("Pro feature", "Image messages require Doovly Pro.");
      } else if (message.includes("CHAT_CREDITS_EXHAUSTED")) {
        Alert.alert("Chat coins finished", "Subscribe to Doovly Pro for unlimited chat.");
      } else {
        Alert.alert("Image failed", message || "Could not send image.");
      }
    } finally {
      setSending(false);
    }
  };

  const onAccept = async () => {
    if (!conversation || decisionInProgress.current || bookingStatus !== "Pending") return;
    decisionInProgress.current = true;
    setDecisionProcessing(true);
    try {
      const msg = await acceptBooking(conversationId, proDisplayName);
      setMessages((prev) => prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]);
      setBookingStatus("Accepted");
    } catch (error: any) {
      Alert.alert("Could not accept", error?.message ?? "Please try again.");
    } finally {
      decisionInProgress.current = false;
      setDecisionProcessing(false);
    }
  };

  const onDecline = async () => {
    if (!conversation || decisionInProgress.current || bookingStatus !== "Pending") return;
    decisionInProgress.current = true;
    setDecisionProcessing(true);
    try {
      const msg = await declineBooking(conversationId, proDisplayName);
      setMessages((prev) => prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]);
      setBookingStatus("Declined");
    } catch (error: any) {
      Alert.alert("Could not decline", error?.message ?? "Please try again.");
    } finally {
      decisionInProgress.current = false;
      setDecisionProcessing(false);
    }
  };

  const onCall = async () => {
    if (!conversation) return;

    const proNow = await isCurrentUserChatProAsync();
    if (!proNow) {
      Alert.alert(
        "Pro feature",
        "Calls are available on Doovly Pro. Upgrade to call from chat.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Subscribe", onPress: () => router.push("/profile/subscription/subscription") },
        ],
      );
      return;
    }

    const phone = conversation.participant.phone?.trim();
    if (!phone) {
      Alert.alert("No phone number", "This user does not have a phone number on their profile.");
      return;
    }

    Alert.alert("Call", "Call " + conversation.participant.name + "?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: async () => {
          try {
            const url = "tel:" + phone.replace(/[^+\d]/g, "");
            const supported = await Linking.canOpenURL(url);
            if (!supported) throw new Error("Phone calls are not available on this device.");
            await Linking.openURL(url);
          } catch (error: any) {
            Alert.alert("Call failed", error?.message ?? "Could not start the call.");
          }
        },
      },
    ]);
  };

  const onShareLocation = async () => {
    const status = await getBookingStatusAsync(conversationId);
    if (status !== "Accepted") {
      Alert.alert("Location locked", "Your location can only be shared after the provider approves the booking.");
      return;
    }
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

  if (loadingConversation) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.emptyText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
  const waitingLabel =
    convKind === "offer"
      ? "Waiting for provider to accept..."
      : "Waiting for professional to accept...";
  const declinedLabel =
    convKind === "offer"
      ? "This offer was declined"
      : "This booking was declined";

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
            {chatPro ? "Doovly Pro • Unlimited chat" : String(chatCoins ?? 0) + " chat coins left"}
          </Text>
          <Text style={styles.headerStatus}>
            {sharing
              ? "Sharing location"
              : p.online
                ? "Online"
                : "Offline"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAction}
          onPress={onCall}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={20} color={PRIMARY} />
        </TouchableOpacity>

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
            if (item.kind === "request_card" && item.card) {
              return (
                <View style={styles.cardWrap}>
                  <RequestCard card={item.card} />
                </View>
              );
            }

            if (
              item.senderId === "system" ||
              item.kind === "system" ||
              item.kind === "location_stopped"
            ) {
              return (
                <View style={styles.systemWrap}>
                  <Text style={styles.systemText}>{item.text}</Text>
                </View>
              );
            }

            if (item.kind === "image" && item.imageUrl) {
              return (
                <View style={[styles.bubbleWrap, item.isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
                  <View style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs, styles.imageBubble]}>
                    <Image source={{ uri: item.imageUrl }} style={styles.chatImage} resizeMode="cover" />
                  </View>
                  <Text style={[styles.time, item.isMine ? styles.timeMine : styles.timeTheirs]}>{item.createdAt}</Text>
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

        {bookingStatusLoaded && bookingStatus === "Pending" && isAcceptor && (
          <View style={styles.acceptRow}>
            <TouchableOpacity
              onPress={onDecline}
              style={styles.declineBtn}
              activeOpacity={0.85}
              disabled={decisionProcessing}
            >
              {decisionProcessing ? <ActivityIndicator size="small" color="#DC2626" /> : <Ionicons name="close" size={18} color="#DC2626" />}
              <Text style={styles.declineBtnText}>{decisionProcessing ? "Please wait..." : "Decline"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onAccept}
              style={styles.acceptBtn}
              activeOpacity={0.85}
              disabled={decisionProcessing}
            >
              {decisionProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
              <Text style={styles.acceptBtnText}>{decisionProcessing ? "Please wait..." : "Accept"}</Text>
            </TouchableOpacity>

          </View>
        )}

        {bookingStatusLoaded && <View style={styles.inputBar}>
          {bookingStatus === "Accepted" ? (
            <>
              {bookingStatus === "Accepted" && (
                <>
                  <TouchableOpacity
                    style={styles.attachBtn}
                    activeOpacity={0.7}
                    onPress={onPickImage}
                  >
                    <Ionicons name="image-outline" size={22} color={chatPro ? TEXT_MUTED : "#D1D5DB"} />
                  </TouchableOpacity>

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
                </>
              )}

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
            <View style={styles.lockedBar}>
              <Ionicons name="lock-closed" size={14} color={TEXT_MUTED} />
              <Text style={styles.lockedText}>
                {bookingStatus === "Pending" ? waitingLabel : declinedLabel}
              </Text>
            </View>
          )}
        </View>}
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
  cardWrap: {
    marginBottom: 16,
    alignSelf: "stretch",
  },
  requestCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 16,
  },
  requestCardBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  requestCardBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  requestCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 8,
    lineHeight: 24,
  },
  requestCategoryChip: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  requestCategoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: PRIMARY,
  },
  requestMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  requestMetaText: {
    fontSize: 13,
    color: TEXT_MUTED,
    flex: 1,
  },
  requestDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 4,
  },
  requestAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: PRIMARY,
    marginTop: 10,
    marginBottom: 4,
  },
  requestDivider: {
    height: 1,
    backgroundColor: "#BBF7D0",
    marginVertical: 10,
  },
  requestStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requestStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: TEXT_MUTED,
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
  imageBubble: {
    padding: 4,
    overflow: "hidden",
  },
  chatImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
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
    maxWidth: "90%",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  systemText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
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
  acceptRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  declineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  declineBtnText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 15,
  },
  acceptBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
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
  lockedBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  lockedText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "600",
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
