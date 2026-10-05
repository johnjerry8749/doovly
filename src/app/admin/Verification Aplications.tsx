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
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  listVerificationApplicationsAsync,
  updateVerificationStatus,
  bulkUpdateVerificationStatus,
  getVerificationStats,
  type VerificationApplication,
  type VerificationStatus,
  type VerificationDocument,
} from "@/services/admin/verificationApplications";

const GREEN = "#159447";
const AMBER = "#D97706";
const RED = "#EF4444";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const { height: SCREEN_H } = Dimensions.get("window");

type FilterTab = "All" | "Pending" | "Verified";

export default function VerificationApplications() {
  const insets = useSafeAreaInsets();
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [filter, setFilter] = useState<FilterTab>("Pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailApp, setDetailApp] = useState<VerificationApplication | null>(null);
  const [menuApp, setMenuApp] = useState<VerificationApplication | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VerificationDocument | null>(null);

  const stats = useMemo(() => getVerificationStats(applications), [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (filter === "Pending" && a.status !== "Pending") return false;
      if (filter === "Verified" && a.status !== "Verified") return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.profession.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    });
  }, [applications, filter, search]);

  const pendingInView = useMemo(
    () => filtered.filter((a) => a.status === "Pending"),
    [filtered],
  );

  const allPendingSelected =
    pendingInView.length > 0 &&
    pendingInView.every((a) => selectedIds.has(a.id));

  const selectedPendingCount = useMemo(
    () =>
      [...selectedIds].filter((id) =>
        applications.some((a) => a.id === id && a.status === "Pending"),
      ).length,
    [selectedIds, applications],
  );

  const refresh = async () => { try { setApplications(await listVerificationApplicationsAsync()); } catch (e) { console.warn("[Admin Verification]", e); } };

  useEffect(() => { refresh(); }, []);

  const toggleSelect = (id: string, status: VerificationStatus) => {
    if (status !== "Pending") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pendingInView.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pendingInView.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const verifyOne = (id: string) => {
    updateVerificationStatus(id, "Verified").then(refresh).catch((e:any) => console.warn("[Admin Verification]", e));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    refresh();
    if (detailApp?.id === id) {
      setDetailApp(listVerificationApplications().find((a) => a.id === id) ?? null);
    }
    setMenuApp(null);
  };

  const rejectOne = (id: string) => {
    updateVerificationStatus(id, "Rejected").then(refresh).catch((e:any) => console.warn("[Admin Verification]", e));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    refresh();
    if (detailApp?.id === id) setDetailApp(null);
    setMenuApp(null);
  };

  const bulkVerify = () => {
    const ids = [...selectedIds].filter((id) =>
      applications.some((a) => a.id === id && a.status === "Pending"),
    );
    if (!ids.length) return;
    bulkUpdateVerificationStatus(ids, "Verified").then(refresh).catch((e:any) => console.warn("[Admin Verification]", e));
    setSelectedIds(new Set());
    refresh();
  };

  const bulkReject = () => {
    const ids = [...selectedIds].filter((id) =>
      applications.some((a) => a.id === id && a.status === "Pending"),
    );
    if (!ids.length) return;
    bulkUpdateVerificationStatus(ids, "Rejected").then(refresh).catch((e:any) => console.warn("[Admin Verification]", e));
    setSelectedIds(new Set());
    refresh();
  };

  const openDocuments = (app: VerificationApplication) => {
    setDetailApp(app);
    setMenuApp(null);
  };

  const statusBadge = (status: VerificationStatus) => {
    if (status === "Pending") {
      return (
        <View style={[styles.badge, styles.badgePending]}>
          <View style={[styles.badgeDot, { backgroundColor: AMBER }]} />
          <Text style={[styles.badgeText, { color: "#B45309" }]}>Pending</Text>
        </View>
      );
    }
    if (status === "Verified") {
      return (
        <View style={[styles.badge, styles.badgeVerified]}>
          <View style={[styles.badgeDot, { backgroundColor: GREEN }]} />
          <Text style={[styles.badgeText, { color: GREEN }]}>Verified</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgeRejected]}>
        <View style={[styles.badgeDot, { backgroundColor: RED }]} />
        <Text style={[styles.badgeText, { color: RED }]}>Rejected</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 56 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Verification Applications</Text>
        <Text style={styles.subtitle}>Review and verify professional documents</Text>

        <View style={styles.tabs}>
          {(["All", "Pending", "Verified"] as FilterTab[]).map((tab) => {
            const count =
              tab === "All"
                ? stats.total
                : tab === "Pending"
                  ? stats.pending
                  : stats.verified;
            const active = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setFilter(tab)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, profession or location..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {pendingInView.length > 0 && (
          <View style={styles.bulkBar}>
            <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAllPending}>
              <View style={[styles.checkbox, allPendingSelected && styles.checkboxChecked]}>
                {allPendingSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.selectAllText}>Select All ({pendingInView.length})</Text>
            </TouchableOpacity>
            <View style={styles.bulkBtns}>
              <TouchableOpacity
                style={[styles.bulkVerifyBtn, selectedPendingCount === 0 && styles.btnDisabled]}
                disabled={selectedPendingCount === 0}
                onPress={bulkVerify}
              >
                <Text style={styles.bulkVerifyText}>Verify ({selectedPendingCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkRejectBtn, selectedPendingCount === 0 && styles.btnDisabled]}
                disabled={selectedPendingCount === 0}
                onPress={bulkReject}
              >
                <Text style={styles.bulkRejectText}>Reject ({selectedPendingCount})</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {filtered.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.userCard}
              activeOpacity={0.8}
              onPress={() => openDocuments(item)}
            >
              <TouchableOpacity
                onPress={() => toggleSelect(item.id, item.status)}
                disabled={item.status !== "Pending"}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxChecked,
                    item.status !== "Pending" && styles.checkboxDisabled,
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
              <Image source={item.avatar as any} style={styles.avatar} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userProfession}>{item.profession}</Text>
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
              <View style={styles.userRight}>
                {statusBadge(item.status)}
                <Text style={styles.dateText}>{item.submittedOn}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuApp((prev) => (prev?.id === item.id ? null : item))}
              >
                <Ionicons name="ellipsis-vertical" size={18} color={GRAY} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {filtered.length === 0 && (
          <Text style={styles.emptyText}>No applications match your filters.</Text>
        )}
      </ScrollView>

      <Modal visible={!!menuApp} transparent animationType="fade" onRequestClose={() => setMenuApp(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuApp(null)}>
          <View style={styles.menuCard}>
            {menuApp && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => openDocuments(menuApp)}>
                  <Ionicons name="document-text-outline" size={18} color="#374151" />
                  <Text style={styles.menuItemText}>View Documents</Text>
                </TouchableOpacity>
                {menuApp.status === "Pending" && (
                  <>
                    <TouchableOpacity style={styles.menuItem} onPress={() => verifyOne(menuApp.id)}>
                      <Ionicons name="checkmark" size={18} color={GREEN} />
                      <Text style={[styles.menuItemText, { color: GREEN }]}>Verify User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => rejectOne(menuApp.id)}>
                      <Ionicons name="close" size={18} color={RED} />
                      <Text style={[styles.menuItemText, { color: RED }]}>Reject User</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!detailApp} transparent animationType="fade" onRequestClose={() => setDetailApp(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetailApp(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verification Documents</Text>
              <TouchableOpacity onPress={() => setDetailApp(null)}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            {detailApp && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalUserRow}>
                  <Image source={detailApp.avatar as any} style={styles.modalAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalUserName}>{detailApp.name}</Text>
                    <Text style={styles.modalUserProfession}>{detailApp.profession}</Text>
                    {statusBadge(detailApp.status)}
                  </View>
                </View>
                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Email</Text>
                    <Text style={styles.metaValue}>{detailApp.email}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Phone</Text>
                    <Text style={styles.metaValue}>{detailApp.phone}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Submitted</Text>
                    <Text style={styles.metaValue}>{detailApp.submittedOn}</Text>
                  </View>
                </View>
                <Text style={styles.docsTitle}>
                  Documents ({detailApp.documents.length})
                </Text>
                {detailApp.documents.map((doc) => (
                  <View key={doc.id} style={styles.docRow}>
                    <MaterialCommunityIcons
                      name={doc.type === "image" ? "file-image" : "file-pdf-box"}
                      size={22}
                      color={doc.type === "image" ? "#2563EB" : "#DC2626"}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docTitle}>{doc.title}</Text>
                      <Text style={styles.docFile}>{doc.fileName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setPreviewDoc(doc)}>
                      <Text style={styles.viewDoc}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {detailApp.status === "Pending" && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => rejectOne(detailApp.id)}
                    >
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => verifyOne(detailApp.id)}
                    >
                      <Text style={styles.verifyText}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!previewDoc} transparent animationType="slide" onRequestClose={() => setPreviewDoc(null)}>
        <View style={styles.previewOverlay}>
          <View style={[styles.previewHeader, { paddingTop: Math.max(insets.top, 12) }]}>
            <TouchableOpacity onPress={() => setPreviewDoc(null)}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>{previewDoc?.title}</Text>
          </View>
          <View style={styles.previewBody}>
            {previewDoc?.preview ? (
              <Image
                source={previewDoc.preview as any}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.previewPlaceholder}>{previewDoc?.fileName}</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: GRAY, marginTop: 4, marginBottom: 16 },
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
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 10 },
  bulkBar: { marginBottom: 12, gap: 8 },
  selectAllRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectAllText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  bulkBtns: { flexDirection: "row", gap: 8 },
  bulkVerifyBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bulkVerifyText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  bulkRejectBtn: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  bulkRejectText: { color: RED, fontWeight: "700", fontSize: 13 },
  btnDisabled: { opacity: 0.45 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  checkboxDisabled: { opacity: 0.35 },
  userCard: {
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
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E5E7EB" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  userProfession: { fontSize: 12, color: GRAY },
  locationText: { fontSize: 12, color: GRAY },
  userRight: { alignItems: "flex-end", gap: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePending: { backgroundColor: "#FEF3C7" },
  badgeVerified: { backgroundColor: "#D1FAE5" },
  badgeRejected: { backgroundColor: "#FEE2E2" },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 11, color: GRAY },
  emptyText: { textAlign: "center", color: GRAY, marginTop: 24 },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuCard: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalUserRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  modalAvatar: { width: 52, height: 52, borderRadius: 26 },
  modalUserName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  modalUserProfession: { fontSize: 13, color: GRAY, marginBottom: 6 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 14 },
  metaItem: { width: "47%" },
  metaLabel: { fontSize: 11, color: GRAY },
  metaValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  docsTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 10 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  docTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  docFile: { fontSize: 11, color: GRAY },
  viewDoc: { fontSize: 13, fontWeight: "700", color: GREEN },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectText: { color: RED, fontWeight: "700" },
  verifyBtn: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  verifyText: { color: "#fff", fontWeight: "700" },
  previewOverlay: { flex: 1, backgroundColor: "#0F172A" },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  previewTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  previewBody: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  previewImage: { width: "100%", height: SCREEN_H * 0.5 },
  previewPlaceholder: { color: "#9CA3AF", fontSize: 14 },
});
