import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  listUsers,
  suspendUser,
  unsuspendUser,
  updateUser,
  type AdminUser,
  type VerificationStatus,
  type SubscriptionTier,
} from "@/services/admin/users";

const GREEN = "#159447";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

type DetailTab = "Overview" | "Profile" | "Activity" | "Subscription";

export default function Users() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState(() => listUsers());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("Overview");
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editProfession, setEditProfession] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editVerification, setEditVerification] =
    useState<VerificationStatus>("Verified");
  const [editSubscription, setEditSubscription] =
    useState<SubscriptionTier>("Free");
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

  const refresh = useCallback(() => {
    setList(listUsers());
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.profession.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [list, search]);

  const openUser = (user: AdminUser) => {
    setSelected(user);
    setDetailTab("Overview");
  };

  const closeUser = () => setSelected(null);

  const handleSuspend = () => {
    if (!selected) return;
    Alert.alert(
      "Suspend User",
      `Temporarily restrict ${selected.name} from using the platform?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: () => {
            suspendUser(selected.id);
            refresh();
            setSelected({ ...selected, isSuspended: true });
          },
        },
      ],
    );
  };

  const handleUnsuspend = () => {
    if (!selected) return;
    unsuspendUser(selected.id);
    refresh();
    setSelected({ ...selected, isSuspended: false });
  };

  const openEdit = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditProfession(selected.profession);
    setEditEmail(selected.email);
    setEditPhone(selected.phone);
    setEditLocation(selected.location);
    setEditVerification(selected.verificationStatus);
    setEditSubscription(selected.subscription);
    setEditVisible(true);
  };

  const saveEdit = () => {
    if (!selected) return;
    const updated = updateUser(selected.id, {
      name: editName.trim(),
      profession: editProfession.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      location: editLocation.trim(),
      verificationStatus: editVerification,
      subscription: editSubscription,
    });
    refresh();
    if (updated) setSelected(updated);
    setEditVisible(false);
  };

  const sendInAppNotif = () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      Alert.alert("Missing fields", "Please enter a title and message.");
      return;
    }
    Alert.alert(
      "Notification sent",
      `In-app message sent to ${selected?.name}.`,
    );
    setNotifVisible(false);
    setNotifTitle("");
    setNotifMessage("");
  };

  const verificationBadge = (status: VerificationStatus) => {
    const bg =
      status === "Verified"
        ? "#D1FAE5"
        : status === "Pending"
          ? "#FEF3C7"
          : "#FEE2E2";
    const color =
      status === "Verified"
        ? GREEN
        : status === "Pending"
          ? "#D97706"
          : "#DC2626";
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        {status === "Verified" && (
          <Ionicons name="checkmark-circle" size={12} color={color} />
        )}
        <Text style={[styles.badgeText, { color }]}>{status}</Text>
      </View>
    );
  };

  const proBadge = (tier: SubscriptionTier) => (
    <View
      style={[
        styles.badge,
        tier === "Pro" ? styles.proBadge : styles.freeBadge,
      ]}
    >
      {tier === "Pro" && (
        <Ionicons name="ribbon" size={12} color="#B45309" />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: tier === "Pro" ? "#B45309" : GRAY },
        ]}
      >
        {tier}
      </Text>
    </View>
  );

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
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.subtitle}>
              {list.length} professionals on the platform
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add User</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name, profession..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filtered.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => openUser(user)}
          >
            <View style={styles.avatarWrap}>
              <Image source={user.avatar as any} style={styles.avatar} />
              {user.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{user.name}</Text>
              <Text style={styles.cardMeta}>{user.profession}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={GRAY} />
                <Text style={styles.cardLocation}>{user.location}</Text>
              </View>
            </View>
            <View style={styles.cardBadges}>
              {user.verified && verificationBadge("Verified")}
              {user.subscription === "Pro" && proBadge("Pro")}
              {user.isSuspended && (
                <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}>
                  <Text style={[styles.badgeText, { color: "#DC2626" }]}>
                    Suspended
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={GRAY} />
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <Text style={styles.empty}>No users match your search.</Text>
        )}
      </ScrollView>

      {/* User detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={closeUser}
      >
        <Pressable style={styles.modalOverlay} onPress={closeUser}>
          <Pressable
            style={styles.modalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalUserRow}>
                  <View style={styles.avatarWrap}>
                    <Image
                      source={selected?.avatar as any}
                      style={styles.modalAvatar}
                    />
                    {selected?.isOnline && (
                      <View style={styles.onlineDotLarge} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.modalName}>{selected?.name}</Text>
                      {selected && verificationBadge(selected.verificationStatus)}
                      {selected && proBadge(selected.subscription)}
                    </View>
                    <Text style={styles.modalProfession}>
                      {selected?.profession}
                    </Text>
                    <View style={styles.locationRow}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={GRAY}
                      />
                      <Text style={styles.cardLocation}>
                        {selected?.location}
                      </Text>
                    </View>
                    <Text style={styles.joinedText}>
                      Joined {selected?.memberSince} · Last active{" "}
                      {selected?.lastActive}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeUser} hitSlop={12}>
                    <Ionicons name="close" size={22} color="#111827" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tabs */}
              <View style={styles.tabs}>
                {(
                  [
                    "Overview",
                    "Profile",
                    "Activity",
                    "Subscription",
                  ] as DetailTab[]
                ).map((tab) => {
                  const active = detailTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.tab, active && styles.tabActive]}
                      onPress={() => setDetailTab(tab)}
                    >
                      <Ionicons
                        name={
                          tab === "Overview"
                            ? "person"
                            : tab === "Profile"
                              ? "document-text-outline"
                              : tab === "Activity"
                                ? "time-outline"
                                : "ribbon-outline"
                        }
                        size={14}
                        color={active ? GREEN : GRAY}
                      />
                      <Text
                        style={[
                          styles.tabText,
                          active && styles.tabTextActive,
                        ]}
                      >
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {detailTab === "Overview" && selected && (
                <View style={styles.infoGrid}>
                  <InfoRow
                    icon="mail-outline"
                    label="Email"
                    value={selected.email}
                  />
                  <InfoRow
                    icon="briefcase-outline"
                    label="Profession"
                    value={selected.profession}
                  />
                  <InfoRow
                    icon="call-outline"
                    label="Phone"
                    value={selected.phone}
                  />
                  <InfoRow
                    icon="shield-checkmark-outline"
                    label="Verification Status"
                    valueNode={verificationBadge(selected.verificationStatus)}
                  />
                  <InfoRow
                    icon="location-outline"
                    label="Location"
                    value={selected.location}
                  />
                  <InfoRow
                    icon="ribbon-outline"
                    label="Subscription"
                    valueNode={proBadge(selected.subscription)}
                  />
                  <InfoRow
                    icon="calendar-outline"
                    label="Member Since"
                    value={selected.memberSince}
                  />
                  <InfoRow
                    icon="time-outline"
                    label="Last Active"
                    value={selected.lastActive}
                  />
                </View>
              )}

              {detailTab === "Profile" && selected && (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderText}>
                    Full profile details for {selected.name}. Use Update
                    Profile to edit.
                  </Text>
                </View>
              )}

              {detailTab === "Activity" && (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderText}>
                    Recent logins, bookings, and service activity will appear
                    here.
                  </Text>
                </View>
              )}

              {detailTab === "Subscription" && selected && (
                <View style={styles.placeholderBox}>
                  <Text style={styles.placeholderText}>
                    Current plan: {selected.subscription}. Manage billing and
                    renewals from Subscriptions.
                  </Text>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={[styles.actionCard, styles.actionDanger]}
                  onPress={handleSuspend}
                  activeOpacity={0.85}
                >
                  <Ionicons name="ban" size={18} color="#DC2626" />
                  <Text style={[styles.actionTitle, { color: "#DC2626" }]}>
                    Suspend User
                  </Text>
                  <Text style={styles.actionDesc}>
                    Temporarily restrict this user from using the platform.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionSuccess]}
                  onPress={handleUnsuspend}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={GREEN}
                  />
                  <Text style={[styles.actionTitle, { color: GREEN }]}>
                    Unsuspend User
                  </Text>
                  <Text style={styles.actionDesc}>
                    Restore user access to the platform.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionBlue]}
                  onPress={() => setNotifVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="paper-plane" size={18} color="#2563EB" />
                  <Text style={[styles.actionTitle, { color: "#2563EB" }]}>
                    Send In-App Notification
                  </Text>
                  <Text style={styles.actionDesc}>
                    Send a message to this user in their in-app notifications.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionCard, styles.actionPurple]}
                  onPress={openEdit}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={18} color="#7C3AED" />
                  <Text style={[styles.actionTitle, { color: "#7C3AED" }]}>
                    Update Profile
                  </Text>
                  <Text style={styles.actionDesc}>
                    Edit and update user information, verification status, or
                    role.
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit profile modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { maxWidth: 420 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editHeader}>
              <Text style={styles.modalName}>Update Profile</Text>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                hitSlop={12}
              >
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <Field label="Name" value={editName} onChange={setEditName} />
            <Field
              label="Profession"
              value={editProfession}
              onChange={setEditProfession}
            />
            <Field label="Email" value={editEmail} onChange={setEditEmail} />
            <Field label="Phone" value={editPhone} onChange={setEditPhone} />
            <Field
              label="Location"
              value={editLocation}
              onChange={setEditLocation}
            />

            <Text style={styles.fieldLabel}>Verification Status</Text>
            <View style={styles.optionRow}>
              {(["Verified", "Pending", "Rejected"] as VerificationStatus[]).map(
                (s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.option,
                      editVerification === s && styles.optionActive,
                    ]}
                    onPress={() => setEditVerification(s)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        editVerification === s && styles.optionTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Subscription
            </Text>
            <View style={styles.optionRow}>
              {(["Pro", "Free"] as SubscriptionTier[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.option,
                    editSubscription === s && styles.optionActive,
                  ]}
                  onPress={() => setEditSubscription(s)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      editSubscription === s && styles.optionTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={saveEdit}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* In-app notification modal */}
      <Modal
        visible={notifVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotifVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNotifVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { maxWidth: 400 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.editHeader}>
              <Text style={styles.modalName}>Send In-App Notification</Text>
              <TouchableOpacity
                onPress={() => setNotifVisible(false)}
                hitSlop={12}
              >
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>
              To: {selected?.name}
            </Text>
            <Field
              label="Title"
              value={notifTitle}
              onChange={setNotifTitle}
              placeholder="Notification title"
            />
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notifMessage}
              onChangeText={setNotifMessage}
              placeholder="Enter your message..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={sendInAppNotif}
              activeOpacity={0.85}
            >
              <Ionicons name="paper-plane" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Send</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueNode,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={GRAY} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {valueNode ?? <Text style={styles.infoValue}>{value}</Text>}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    minHeight: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    gap: 10,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: "#fff",
  },
  onlineDotLarge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: "#fff",
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardMeta: { fontSize: 12, color: GRAY, marginTop: 2 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  cardLocation: { fontSize: 12, color: GRAY },
  cardBadges: { gap: 4, alignItems: "flex-end" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  proBadge: { backgroundColor: "#FEF3C7" },
  freeBadge: { backgroundColor: "#F3F4F6" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { textAlign: "center", color: GRAY, marginTop: 24 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  modalHeader: { marginBottom: 12 },
  modalUserRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E5E7EB",
  },
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  modalName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalProfession: { fontSize: 13, color: GRAY, marginTop: 2 },
  joinedText: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 14,
    gap: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: GREEN },
  tabText: { fontSize: 12, fontWeight: "600", color: GRAY },
  tabTextActive: { color: GREEN },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    width: "47%",
    flexGrow: 1,
    minWidth: 140,
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  infoLabel: { fontSize: 11, color: GRAY, fontWeight: "600" },
  infoValue: { fontSize: 13, color: "#111827", fontWeight: "600", marginTop: 2 },

  placeholderBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  placeholderText: { fontSize: 13, color: GRAY, lineHeight: 20 },

  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  actionCard: {
    width: "47%",
    flexGrow: 1,
    minWidth: 140,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  actionDanger: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  actionSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  actionBlue: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  actionPurple: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
  },
  actionTitle: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  actionDesc: { fontSize: 11, color: GRAY, marginTop: 4, lineHeight: 16 },

  editHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: GRAY,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  textArea: { minHeight: 90, marginBottom: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#F9FAFB",
  },
  optionActive: { borderColor: GREEN, backgroundColor: "#D1FAE5" },
  optionText: { fontSize: 13, fontWeight: "600", color: GRAY },
  optionTextActive: { color: GREEN },
  saveBtn: {
    marginTop: 16,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
