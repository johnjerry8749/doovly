import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  listSubscriptionsAsync,
  updateSubscription,
  getSubscriptionStats,
  type SubscriptionUser,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/services/admin/subscriptions";

const GREEN = "#159447";
const AMBER = "#D97706";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

type FilterTab = "All" | "Pro" | "Free";

export default function Subscriptions() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<SubscriptionUser[]>([]);
  const [filter, setFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<SubscriptionUser | null>(null);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>("Pro");
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>("Active");

  useEffect(() => { listSubscriptionsAsync().then(setList).catch(() => setList([])); }, []);

  const stats = useMemo(() => getSubscriptionStats(list), [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((u) => {
      if (filter === "Pro" && u.plan !== "Pro") return false;
      if (filter === "Free" && u.plan !== "Free") return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.profession.toLowerCase().includes(q) ||
        u.location.toLowerCase().includes(q)
      );
    });
  }, [list, filter, search]);

  const openEdit = (user: SubscriptionUser) => {
    setEditUser(user);
    setEditPlan(user.plan);
    setEditStatus(user.status);
  };

  const saveEdit = () => {
    if (!editUser) return;
    updateSubscription(editUser.id, { plan: editPlan, status: editStatus }).then(() => listSubscriptionsAsync()).then(setList).then(() => setEditUser(null)).catch(() => setEditUser(null));
  };

  const planBadge = (plan: SubscriptionPlan) => (
    <View
      style={[
        styles.planBadge,
        plan === "Pro" ? styles.planBadgePro : styles.planBadgeFree,
      ]}
    >
      <Text
        style={[
          styles.planBadgeText,
          plan === "Pro" ? styles.planBadgeTextPro : styles.planBadgeTextFree,
        ]}
      >
        {plan}
      </Text>
    </View>
  );

  const statusColor = (status: SubscriptionStatus) => {
    if (status === "Active") return GREEN;
    if (status === "Expired") return AMBER;
    return "#EF4444";
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 56 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Subscriptions</Text>
        <Text style={styles.subtitle}>Manage user subscription plans</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pro</Text>
            <Text style={[styles.statValue, { color: GREEN }]}>{stats.pro}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Free</Text>
            <Text style={styles.statValue}>{stats.free}</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(["All", "Pro", "Free"] as FilterTab[]).map((tab) => {
            const active = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setFilter(tab)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, profession..."
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
            onPress={() => openEdit(user)}
          >
            <Image source={user.avatar as any} style={styles.avatar} />
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{user.name}</Text>
              <Text style={styles.cardMeta}>
                {user.profession} · {user.location}
              </Text>
              <Text style={[styles.cardStatus, { color: statusColor(user.status) }]}>
                {user.statusLabel}
              </Text>
            </View>
            {planBadge(user.plan)}
            <Ionicons name="chevron-forward" size={18} color={GRAY} />
          </TouchableOpacity>
        ))}

        {filtered.length === 0 && (
          <Text style={styles.empty}>No subscriptions match your filters.</Text>
        )}
      </ScrollView>

      <Modal visible={!!editUser} transparent animationType="fade" onRequestClose={() => setEditUser(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditUser(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Subscription</Text>
              <TouchableOpacity onPress={() => setEditUser(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            {editUser && (
              <>
                <View style={styles.modalUser}>
                  <Image source={editUser.avatar as any} style={styles.modalAvatar} />
                  <View>
                    <Text style={styles.modalName}>{editUser.name}</Text>
                    <Text style={styles.modalProfession}>{editUser.profession}</Text>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Plan</Text>
                <View style={styles.optionRow}>
                  {(["Pro", "Free"] as SubscriptionPlan[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.option, editPlan === p && styles.optionActive]}
                      onPress={() => setEditPlan(p)}
                    >
                      <Text style={[styles.optionText, editPlan === p && styles.optionTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Status</Text>
                <View style={styles.optionRow}>
                  {(["Active", "Expired", "Cancelled"] as SubscriptionStatus[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.option, editStatus === s && styles.optionActive]}
                      onPress={() => setEditStatus(s)}
                    >
                      <Text style={[styles.optionText, editStatus === s && styles.optionTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={saveEdit} activeOpacity={0.85}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4, marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  statLabel: { fontSize: 12, color: GRAY, fontWeight: "600" },
  statValue: { fontSize: 20, fontWeight: "800", color: "#111827", marginTop: 4 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#D1FAE5" },
  tabText: { fontSize: 13, fontWeight: "600", color: GRAY },
  tabTextActive: { color: GREEN },
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
  searchInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 10 },
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
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E5E7EB" },
  cardBody: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  cardMeta: { fontSize: 12, color: GRAY, marginTop: 2 },
  cardStatus: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  planBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planBadgePro: { backgroundColor: "#D1FAE5" },
  planBadgeFree: { backgroundColor: "#F3F4F6" },
  planBadgeText: { fontSize: 12, fontWeight: "700" },
  planBadgeTextPro: { color: GREEN },
  planBadgeTextFree: { color: GRAY },
  empty: { textAlign: "center", color: GRAY, marginTop: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalUser: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  modalAvatar: { width: 48, height: 48, borderRadius: 24 },
  modalName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  modalProfession: { fontSize: 13, color: GRAY },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: GRAY, marginBottom: 8 },
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
    marginTop: 20,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
