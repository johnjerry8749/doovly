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
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  listSubscriptions,
  updateSubscription,
  getSubscriptionStats,
  type SubscriptionUser,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/services/subscriptions";

const GREEN = "#159447";
const AMBER = "#D97706";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

type FilterTab = "All" | "Pro" | "Free";

const PLANS: SubscriptionPlan[] = ["Pro", "Free"];
const STATUSES: SubscriptionStatus[] = ["Active", "Expired", "Cancelled"];

export default function Subscriptions() {
  const insets = useSafeAreaInsets();
  const [subscriptions, setSubscriptions] = useState(() => listSubscriptions());
  const [filter, setFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<SubscriptionUser | null>(null);
  const [editPlan, setEditPlan] = useState<SubscriptionPlan>("Pro");
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>("Active");
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  const stats = useMemo(() => getSubscriptionStats(subscriptions), [subscriptions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscriptions.filter((u) => {
      if (filter === "Pro" && u.plan !== "Pro") return false;
      if (filter === "Free" && u.plan !== "Free") return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.profession.toLowerCase().includes(q) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        u.location.toLowerCase().includes(q)
      );
    });
  }, [subscriptions, filter, search]);

  const openEdit = useCallback((user: SubscriptionUser) => {
    setEditUser(user);
    setEditPlan(user.plan);
    setEditStatus(user.status);
    setPlanPickerOpen(false);
    setStatusPickerOpen(false);
  }, []);

  const closeEdit = () => {
    setEditUser(null);
    setPlanPickerOpen(false);
    setStatusPickerOpen(false);
  };

  const saveChanges = () => {
    if (!editUser) return;
    updateSubscription(editUser.id, { plan: editPlan, status: editStatus });
    setSubscriptions(listSubscriptions());
    closeEdit();
  };

  const statusColor = (status: SubscriptionStatus) => {
    if (status === "Active") return GREEN;
    if (status === "Expired") return "#EF4444";
    return GRAY;
  };

  const renderUser = ({ item }: { item: SubscriptionUser }) => (
    <TouchableOpacity
      style={styles.userCard}
      activeOpacity={0.75}
      onPress={() => openEdit(item)}
    >
      <Image source={item.avatar as any} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.userProfession} numberOfLines={1}>
          {item.profession}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={GRAY} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      </View>
      <View style={styles.userRight}>
        <View
          style={[
            styles.planBadge,
            item.plan === "Pro" ? styles.planBadgePro : styles.planBadgeFree,
          ]}
        >
          <Ionicons
            name={item.plan === "Pro" ? "ribbon" : "person"}
            size={12}
            color={item.plan === "Pro" ? "#92400E" : "#374151"}
          />
          <Text
            style={[
              styles.planBadgeText,
              item.plan === "Pro" ? styles.planBadgeTextPro : styles.planBadgeTextFree,
            ]}
          >
            {item.plan}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <View
            style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]}
          />
          <Text style={styles.statusLabel} numberOfLines={1}>
            {item.status} · {item.statusLabel}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.moreBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => openEdit(item)}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={GRAY} />
      </TouchableOpacity>
    </TouchableOpacity>
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={styles.title}>Subscriptions</Text>
        <Text style={styles.subtitle}>Manage user subscriptions</Text>

        {/* Filter tabs */}
        <View style={styles.tabs}>
          {(["All", "Pro", "Free"] as FilterTab[]).map((tab) => {
            const count =
              tab === "All"
                ? stats.total
                : tab === "Pro"
                  ? stats.pro
                  : stats.free;
            const active = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="ribbon" size={18} color={AMBER} />
              </View>
              <Text style={styles.statLabel}>Pro Subscribers</Text>
            </View>
            <Text style={styles.statValue}>{stats.pro}</Text>
            <View style={styles.growthRow}>
              <Ionicons name="trending-up" size={14} color={GREEN} />
              <Text style={styles.growthText}>
                {stats.proGrowthPercent}% from last month
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: "#F3F4F6" }]}>
                <Ionicons name="people" size={18} color={GRAY} />
              </View>
              <Text style={styles.statLabel}>Free Users</Text>
            </View>
            <Text style={styles.statValue}>{stats.free}</Text>
            <View style={styles.sparklinePlaceholder} />
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users by name, email or profession..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={20} color={GRAY} />
          </TouchableOpacity>
        </View>

        {/* User list */}
        <View style={styles.listWrap}>
          {filtered.map((item) => (
            <View key={item.id}>{renderUser({ item })}</View>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.emptyText}>No subscriptions match your filters.</Text>
          )}
        </View>
      </ScrollView>

      {/* ========== Edit Subscription Modal ========== */}
      <Modal
        visible={!!editUser}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <Pressable style={styles.modalOverlay} onPress={closeEdit}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Subscription</Text>
              <TouchableOpacity onPress={closeEdit} hitSlop={12}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            {editUser && (
              <>
                <View style={styles.modalUserRow}>
                  <Image source={editUser.avatar as any} style={styles.modalAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalUserName}>{editUser.name}</Text>
                    <Text style={styles.modalUserProfession}>{editUser.profession}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={13} color={GRAY} />
                      <Text style={styles.locationText}>{editUser.location}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.planStatusRow}>
                  <View style={[styles.currentPlanCard, { flex: 1 }]}>
                    <View style={styles.currentPlanInner}>
                      <Ionicons name="ribbon" size={16} color={AMBER} />
                      <View>
                        <Text style={styles.currentPlanLabel}>Current Plan</Text>
                        <Text style={styles.currentPlanValue}>{editUser.plan}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.statusCard, { flex: 1 }]}>
                    <Text style={styles.currentPlanLabel}>Status</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusColor(editUser.status) },
                        ]}
                      />
                      <Text style={styles.statusActiveText}>{editUser.status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <View style={styles.dateItem}>
                    <Ionicons name="calendar-outline" size={16} color={GRAY} />
                    <View>
                      <Text style={styles.dateLabel}>Start Date</Text>
                      <Text style={styles.dateValue}>{editUser.startDate}</Text>
                    </View>
                  </View>
                  <View style={styles.dateDivider} />
                  <View style={styles.dateItem}>
                    <Ionicons name="calendar-outline" size={16} color={GRAY} />
                    <View>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <Text style={styles.dateValue}>{editUser.endDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Subscription Plan picker */}
                <Text style={styles.fieldLabel}>Subscription Plan</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setPlanPickerOpen((v) => !v);
                    setStatusPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeft}>
                    <Ionicons
                      name={editPlan === "Pro" ? "ribbon" : "person"}
                      size={16}
                      color={editPlan === "Pro" ? AMBER : GRAY}
                    />
                    <Text style={styles.dropdownValue}>{editPlan}</Text>
                  </View>
                  <Ionicons
                    name={planPickerOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={GRAY}
                  />
                </TouchableOpacity>
                {planPickerOpen && (
                  <View style={styles.pickerList}>
                    {PLANS.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={styles.pickerItem}
                        onPress={() => {
                          setEditPlan(p);
                          setPlanPickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            editPlan === p && { color: GREEN, fontWeight: "700" },
                          ]}
                        >
                          {p}
                        </Text>
                        {editPlan === p && (
                          <Ionicons name="checkmark" size={18} color={GREEN} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Subscription Status picker */}
                <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                  Subscription Status
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    setStatusPickerOpen((v) => !v);
                    setPlanPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownLeft}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor(editStatus) },
                      ]}
                    />
                    <Text style={styles.dropdownValue}>{editStatus}</Text>
                  </View>
                  <Ionicons
                    name={statusPickerOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={GRAY}
                  />
                </TouchableOpacity>
                {statusPickerOpen && (
                  <View style={styles.pickerList}>
                    {STATUSES.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={styles.pickerItem}
                        onPress={() => {
                          setEditStatus(s);
                          setStatusPickerOpen(false);
                        }}
                      >
                        <View style={styles.dropdownLeft}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusColor(s) },
                            ]}
                          />
                          <Text
                            style={[
                              styles.pickerItemText,
                              editStatus === s && {
                                color: GREEN,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {s}
                          </Text>
                        </View>
                        {editStatus === s && (
                          <Ionicons name="checkmark" size={18} color={GREEN} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveChanges}
                  activeOpacity={0.85}
                >
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
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: GRAY,
    marginTop: 4,
    marginBottom: 16,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#D1FAE5",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: GRAY,
  },
  tabTextActive: {
    color: GREEN,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
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
      web: {
        // @ts-ignore
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      },
    }),
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GRAY,
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  growthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  growthText: {
    fontSize: 12,
    color: GREEN,
    fontWeight: "600",
  },
  sparklinePlaceholder: {
    height: 20,
    marginTop: 6,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 10,
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  listWrap: {
    gap: 10,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    gap: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  userProfession: {
    fontSize: 13,
    color: GRAY,
    marginTop: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: GRAY,
  },
  userRight: {
    alignItems: "flex-end",
    gap: 6,
    maxWidth: 140,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planBadgePro: {
    backgroundColor: "#FEF3C7",
  },
  planBadgeFree: {
    backgroundColor: "#F3F4F6",
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  planBadgeTextPro: {
    color: "#92400E",
  },
  planBadgeTextFree: {
    color: "#374151",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 11,
    color: GRAY,
    fontWeight: "500",
    maxWidth: 120,
  },
  moreBtn: {
    padding: 4,
  },
  emptyText: {
    textAlign: "center",
    color: GRAY,
    marginTop: 24,
    fontSize: 14,
  },

  // Modal
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      web: {
        // @ts-ignore
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E5E7EB",
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  modalUserProfession: {
    fontSize: 13,
    color: GRAY,
    marginTop: 2,
  },

  planStatusRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  currentPlanCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
  },
  currentPlanInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currentPlanLabel: {
    fontSize: 11,
    color: GRAY,
    fontWeight: "500",
  },
  currentPlanValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400E",
  },
  statusCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    justifyContent: "center",
  },
  statusActiveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  datesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  dateItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateDivider: {
    width: 1,
    height: 28,
    backgroundColor: BORDER,
    marginHorizontal: 8,
  },
  dateLabel: {
    fontSize: 11,
    color: GRAY,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dropdownValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  pickerList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  pickerItemText: {
    fontSize: 14,
    color: "#374151",
  },

  saveBtn: {
    marginTop: 20,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
