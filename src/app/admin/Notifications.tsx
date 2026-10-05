import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import {
  listAdminNotifications,
  sendAdminNotification,
  resolveAudienceUsersAsync,
  type AdminNotification,
  type NotificationChannel,
  type NotificationAudience,
} from "@/services/admin/notifications";

const GREEN = "#159447";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

const AUDIENCE_OPTIONS: {
  key: NotificationAudience;
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    key: "all",
    label: "All Users",
    desc: "Send to all registered users",
    icon: "people",
  },
  {
    key: "verified",
    label: "Verified Users",
    desc: "Send to verified users only",
    icon: "shield-checkmark",
  },
  {
    key: "subscribed",
    label: "Subscribed Users",
    desc: "Send to pro/paid subscribers only",
    icon: "ribbon",
  },
  {
    key: "free",
    label: "Free Users",
    desc: "Send to free (non-subscribed) users only",
    icon: "person-outline",
  },
];

const CHANNEL_OPTIONS: {
  key: NotificationChannel;
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  {
    key: "in-app",
    label: "In-App + System",
    desc: "Inbox list + device banner (push on API)",
    icon: "phone-portrait-outline",
  },
  {
    key: "email",
    label: "Email",
    desc: "Send via email (API only)",
    icon: "mail-outline",
  },
  {
    key: "sms",
    label: "SMS",
    desc: "Send via SMS (API only)",
    icon: "chatbubble-outline",
  },
];

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<AdminNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [channels, setChannels] = useState<NotificationChannel[]>([
    "in-app",
    "email",
    "sms",
  ]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [search, setSearch] = useState("");
  const [audienceCount, setAudienceCount] = useState(0);
  const [channelFilter, setChannelFilter] = useState<
    "all" | NotificationChannel
  >("all");

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const rows = await listAdminNotifications();
      setHistory(rows);
    } catch (e) {
      console.warn("[Admin Notifications] failed to load history", e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  useEffect(() => { resolveAudienceUsersAsync(audience).then((ids) => setAudienceCount(ids.length)).catch(() => setAudienceCount(0)); }, [audience]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((n) => {
      if (channelFilter !== "all" && !n.channels.includes(channelFilter))
        return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.sentToLabel.toLowerCase().includes(q)
      );
    });
  }, [history, search, channelFilter]);

  const toggleChannel = (ch: NotificationChannel) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  };

  const handleSend = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a notification title.");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Missing message", "Please enter a notification message.");
      return;
    }
    if (channels.length === 0) {
      Alert.alert("No channels", "Select at least one delivery channel.");
      return;
    }

    setSending(true);
    try {
      const result = await sendAdminNotification({
        title,
        message,
        channels,
        sentTo: audience,
        link: showLink ? link : undefined,
      });

      await loadHistory();
      setTitle("");
      setMessage("");
      setLink("");
      setShowLink(false);

      const parts: string[] = ["Notification recorded."];
      if (channels.includes("in-app")) {
        if (result.inAppRecipientCount > 0) {
          parts.push(
            `In-app delivered to ${result.inAppRecipientCount} user(s).`,
          );
        } else {
          parts.push(
            "No matching users for this audience (check Verified / Pro / Free).",
          );
        }
        if (result.systemNotificationShown) {
          parts.push("System banner shown on this device.");
        } else if (result.inAppRecipientCount > 0) {
          parts.push(
            "No system banner (you are not in this audience on this device, or permission denied).",
          );
        }
      }
      if (channels.includes("email")) {
        parts.push(`Email delivered to ${result.emailRecipientCount} user(s).`);
      }
      if (channels.includes("sms")) {
        parts.push(`SMS delivered to ${result.smsRecipientCount} user(s).`);
      }
      if (result.errors.length) {
        parts.push(result.errors.join("\n"));
      }

      Alert.alert(result.errors.length ? "Partially sent" : "Sent", parts.join("\n"));
    } catch (e: any) {
      Alert.alert(
        "Send failed",
        e?.message || "Could not send notification. Check API / mock setup.",
      );
    } finally {
      setSending(false);
    }
  };

  const channelIcon = (ch: NotificationChannel) => {
    const map: Record<
      NotificationChannel,
      React.ComponentProps<typeof Ionicons>["name"]
    > = {
      "in-app": "phone-portrait-outline",
      email: "mail-outline",
      sms: "chatbubble-outline",
    };
    return map[ch];
  };

  const channelColor = (ch: NotificationChannel) => {
    if (ch === "in-app") return GREEN;
    if (ch === "email") return "#2563EB";
    return "#7C3AED";
  };

  const statusStyle = (status: AdminNotification["status"]) => {
    if (status === "Sent")
      return { bg: "#D1FAE5", color: GREEN, label: "Sent" };
    if (status === "Scheduled")
      return { bg: "#DBEAFE", color: "#2563EB", label: "Scheduled" };
    return { bg: "#FEE2E2", color: "#DC2626", label: "Failed" };
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, 12) + 56 },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          Send and manage notifications to your users
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="megaphone" size={20} color={GREEN} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Send Notification</Text>
                <Text style={styles.cardSubtitle}>
                  In-app inbox + system banner on this device (remote push via
                  API later).
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.templatesBtn} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={14} color={GRAY} />
              <Text style={styles.templatesBtnText}>Notification Templates</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Send To</Text>
          <View style={styles.audienceRow}>
            {AUDIENCE_OPTIONS.map((opt) => {
              const active = audience === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.audienceCard, active && styles.audienceActive]}
                  onPress={() => setAudience(opt.key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.radioRow}>
                    <View
                      style={[styles.radio, active && styles.radioActive]}
                    >
                      {active && <View style={styles.radioDot} />}
                    </View>
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={active ? GREEN : GRAY}
                    />
                  </View>
                  <Text
                    style={[
                      styles.audienceLabel,
                      active && { color: GREEN },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.audienceDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.audienceHint}>
            ~{audienceCount} user(s) match this audience.
          </Text>

          <Text style={styles.sectionLabel}>Channels</Text>
          <View style={styles.channelRow}>
            {CHANNEL_OPTIONS.map((opt) => {
              const active = channels.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.channelCard, active && styles.channelActive]}
                  onPress={() => toggleChannel(opt.key)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.checkbox,
                      active && styles.checkboxActive,
                    ]}
                  >
                    {active && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </View>
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={active ? GREEN : GRAY}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.channelLabel,
                        active && { color: GREEN },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.channelDesc}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter notification title..."
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.sectionLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter your message here..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{message.length}/500</Text>

          {showLink ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.sectionLabel}>Link (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
                value={link}
                onChangeText={setLink}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addLinkBtn}
              onPress={() => setShowLink(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="link" size={16} color="#2563EB" />
              <Text style={styles.addLinkText}>Add Link (Optional)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.7 }]}
            onPress={handleSend}
            activeOpacity={0.85}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={styles.sendBtnText}>Send Notification</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.historyHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="time" size={20} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Notification History</Text>
                <Text style={styles.cardSubtitle}>
                  View all sent notifications and their status
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.historyFilters}>
            <View style={[styles.searchBox, { flex: 1 }]}>
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search notifications..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity
              style={styles.filterChip}
              onPress={() => {
                const order: ("all" | NotificationChannel)[] = [
                  "all",
                  "in-app",
                  "email",
                  "sms",
                ];
                const idx = order.indexOf(channelFilter);
                setChannelFilter(order[(idx + 1) % order.length]);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.filterChipText}>
                {channelFilter === "all"
                  ? "All Channels"
                  : channelFilter === "in-app"
                    ? "In-App"
                    : channelFilter === "email"
                      ? "Email"
                      : "SMS"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={GRAY} />
            </TouchableOpacity>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 28 }]}>#</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Title</Text>
            <Text style={[styles.th, { flex: 1.4 }]}>Message</Text>
            <Text style={[styles.th, { width: 72 }]}>Channels</Text>
            <Text style={[styles.th, { flex: 0.9 }]}>Sent To</Text>
            <Text style={[styles.th, { flex: 1 }]}>Date</Text>
            <Text style={[styles.th, { width: 72 }]}>Status</Text>
          </View>

          {loadingHistory ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={GREEN} />
          ) : (
            filteredHistory.map((n, index) => {
              const st = statusStyle(n.status);
              return (
                <View key={n.id} style={styles.tableRow}>
                  <Text style={[styles.td, { width: 28, color: GRAY }]}>
                    {index + 1}
                  </Text>
                  <Text
                    style={[styles.td, { flex: 1.2, fontWeight: "700" }]}
                    numberOfLines={1}
                  >
                    {n.title}
                  </Text>
                  <Text
                    style={[styles.td, { flex: 1.4, color: GRAY }]}
                    numberOfLines={1}
                  >
                    {n.message}
                  </Text>
                  <View style={[styles.channelIcons, { width: 72 }]}>
                    {n.channels.map((ch) => (
                      <Ionicons
                        key={ch}
                        name={channelIcon(ch)}
                        size={14}
                        color={channelColor(ch)}
                      />
                    ))}
                  </View>
                  <Text
                    style={[styles.td, { flex: 0.9, fontSize: 11 }]}
                    numberOfLines={1}
                  >
                    {n.sentToLabel}
                  </Text>
                  <Text
                    style={[styles.td, { flex: 1, fontSize: 11, color: GRAY }]}
                    numberOfLines={2}
                  >
                    {n.dateTime}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: st.bg, width: 72 },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: st.color },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {!loadingHistory && filteredHistory.length === 0 && (
            <Text style={styles.empty}>No notifications found.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4, marginBottom: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      web: { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } as any,
    }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
    flexWrap: "wrap",
  },
  cardHeaderLeft: { flexDirection: "row", gap: 12, flex: 1, minWidth: 200 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardSubtitle: { fontSize: 12, color: GRAY, marginTop: 2, maxWidth: 280 },
  templatesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  templatesBtnText: { fontSize: 12, fontWeight: "600", color: GRAY },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 4,
  },
  audienceHint: {
    fontSize: 11,
    color: GRAY,
    marginBottom: 12,
    marginTop: -4,
  },

  audienceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  audienceCard: {
    width: "47%",
    flexGrow: 1,
    minWidth: 130,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  audienceActive: {
    borderColor: GREEN,
    backgroundColor: "#ECFDF5",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: GREEN },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  audienceLabel: { fontSize: 13, fontWeight: "700", color: "#111827" },
  audienceDesc: { fontSize: 11, color: GRAY, marginTop: 2 },

  channelRow: { gap: 8, marginBottom: 14 },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  channelActive: {
    borderColor: GREEN,
    backgroundColor: "#ECFDF5",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  channelLabel: { fontSize: 13, fontWeight: "700", color: "#111827" },
  channelDesc: { fontSize: 11, color: GRAY },

  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    marginBottom: 10,
  },
  textArea: { minHeight: 100 },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: -6,
    marginBottom: 10,
  },

  addLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  addLinkText: { fontSize: 13, fontWeight: "600", color: "#2563EB" },

  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  historyHeader: { marginBottom: 14 },
  historyFilters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    minHeight: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    paddingVertical: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  filterChipText: { fontSize: 12, fontWeight: "600", color: GRAY },

  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 4,
  },
  th: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 4,
  },
  td: { fontSize: 12, color: "#111827" },
  channelIcons: { flexDirection: "row", gap: 4, alignItems: "center" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  empty: { textAlign: "center", color: GRAY, marginTop: 16, marginBottom: 8 },
});
