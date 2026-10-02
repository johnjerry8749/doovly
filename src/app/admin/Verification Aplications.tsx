import React, { useMemo, useState } from "react";
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
  listVerificationApplications,
  updateVerificationStatus,
  bulkUpdateVerificationStatus,
  getVerificationStats,
  type VerificationApplication,
  type VerificationStatus,
  type VerificationDocument,
} from "@/services/verificationApplications";

const GREEN = "#159447";
const AMBER = "#D97706";
const RED = "#EF4444";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const { height: SCREEN_H } = Dimensions.get("window");

type FilterTab = "All" | "Pending" | "Verified";

export default function VerificationApplications() {
  const insets = useSafeAreaInsets();
  const [applications, setApplications] = useState(() =>
    listVerificationApplications(),
  );
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

  const refresh = () => setApplications(listVerificationApplications());

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
    updateVerificationStatus(id, "Verified");
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
    updateVerificationStatus(id, "Rejected");
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
    bulkUpdateVerificationStatus(ids, "Verified");
    setSelectedIds(new Set());
    refresh();
  };

  const bulkReject = () => {
    const ids = [...selectedIds].filter((id) =>
      applications.some((a) => a.id === id && a.status === "Pending"),
    );
    if (!ids.length) return;
    bulkUpdateVerificationStatus(ids, "Rejected");
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

  const docIcon = (doc: VerificationDocument) => {
    if (doc.type === "image") {
      return (
        <View style={[styles.docIconWrap, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="image" size={18} color="#2563EB" />
        </View>
      );
    }
    return (
      <View style={[styles.docIconWrap, { backgroundColor: "#FEE2E2" }]}>
        <MaterialCommunityIcons name="file-pdf-box" size={20} color="#DC2626" />
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

        <View style={styles.toolbar}>
          <View style={styles.tabs}>
            {(["All", "Pending", "Verified"] as FilterTab[]).map((tab) => {
              const count =
                tab === "All" ? stats.total : tab === "Pending" ? stats.pending : stats.verified;
              const active = filter === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => {
                    setFilter(tab);
                    setMenuApp(null);
                  }}
                  activeOpacity={0.8}
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
        </View>

        {pendingInView.length > 0 && (
          <View style={styles.bulkBar}>
            <TouchableOpacity style={styles.selectAllRow} onPress={toggleSelectAllPending} activeOpacity={0.75}>
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
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.bulkVerifyText}>Verify Selected ({selectedPendingCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkRejectBtn, selectedPendingCount === 0 && styles.btnDisabled]}
                disabled={selectedPendingCount === 0}
                onPress={bulkReject}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={16} color={RED} />
                <Text style={styles.bulkRejectText}>Reject Selected ({selectedPendingCount})</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.listWrap}>
          {filtered.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <View key={item.id} style={styles.cardWrap}>
                <TouchableOpacity style={styles.userCard} activeOpacity={0.8} onPress={() => openDocuments(item)}>
                  <TouchableOpacity
                    onPress={() => toggleSelect(item.id, item.status)}
                    disabled={item.status !== "Pending"}
                    hitSlop={8}
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
                    <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.userProfession} numberOfLines={1}>{item.profession}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={13} color={GRAY} />
                      <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                    </View>
                  </View>

                  <View style={styles.userRight}>
                    {statusBadge(item.status)}
                    <View style={styles.dateRow}>
                      <Ionicons name="calendar-outline" size={13} color={GRAY} />
                      <Text style={styles.dateText}>{item.submittedOn}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.moreBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => setMenuApp((prev) => (prev?.id === item.id ? null : item))}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={GRAY} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            );
          })}
          {filtered.length === 0 && (
            <Text style={styles.emptyText}>No applications match your filters.</Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!menuApp} transparent animationType="fade" onRequestClose={() => setMenuApp(null)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuApp(null)}>
          <View style={styles.menuCard}>
            {menuApp && (
              <>
                <View style={styles.menuHeader}>
                  <Image source={menuApp.avatar as any} style={styles.menuAvatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuName} numberOfLines={1}>{menuApp.name}</Text>
                    <Text style={styles.menuProfession} numberOfLines={1}>{menuApp.profession}</Text>
                  </View>
                  {statusBadge(menuApp.status)}
                </View>
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
              <TouchableOpacity onPress={() => setDetailApp(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            {detailApp && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <View style={styles.modalUserRow}>
                  <Image source={detailApp.avatar as any} style={styles.modalAvatar} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalNameRow}>
                      <Text style={styles.modalUserName}>{detailApp.name}</Text>
                      {statusBadge(detailApp.status)}
                    </View>
                    <Text style={styles.modalUserProfession}>{detailApp.profession}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={13} color={GRAY} />
                      <Text style={styles.locationText}>{detailApp.location}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Ionicons name="mail-outline" size={16} color={GRAY} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metaLabel}>Email</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>{detailApp.email}</Text>
                    </View>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="call-outline" size={16} color={GRAY} />
                    <View>
                      <Text style={styles.metaLabel}>Phone</Text>
                      <Text style={styles.metaValue}>{detailApp.phone}</Text>
                    </View>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={16} color={GRAY} />
                    <View>
                      <Text style={styles.metaLabel}>Submitted On</Text>
                      <Text style={styles.metaValue}>{detailApp.submittedOn}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.docsSectionTitle}>
                  Uploaded Documents ({detailApp.documents.length})
                </Text>

                {detailApp.documents.map((doc) => (
                  <View key={doc.id} style={styles.docRow}>
                    {docIcon(doc)}
                    <View style={styles.docInfo}>
                      <Text style={styles.docTitle}>{doc.title}</Text>
                      <Text style={styles.docFileName}>{doc.fileName}</Text>
                    </View>
                    {doc.uploaded && (
                      <View style={styles.uploadedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                        <Text style={styles.uploadedText}>Uploaded</Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.viewDocBtn} onPress={() => setPreviewDoc(doc)} activeOpacity={0.8}>
                      <Text style={styles.viewDocText}>View</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {detailApp.status === "Pending" && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.rejectAppBtn} onPress={() => rejectOne(detailApp.id)} activeOpacity={0.85}>
                      <Ionicons name="close" size={18} color={RED} />
                      <Text style={styles.rejectAppText}>Reject Application</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.verifyAppBtn} onPress={() => verifyOne(detailApp.id)} activeOpacity={0.85}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.verifyAppText}>Verify User</Text>
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
            <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewDoc(null)} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle} numberOfLines={1}>{previewDoc?.title}</Text>
              <Text style={styles.previewFileName} numberOfLines={1}>{previewDoc?.fileName}</Text>
            </View>
            {previewDoc?.uploaded && (
              <View style={styles.uploadedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                <Text style={styles.uploadedText}>Uploaded</Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={styles.previewBody} bounces={false} showsVerticalScrollIndicator={false}>
            {previewDoc?.type === "pdf" ? (
              <View style={styles.pdfSheet}>
                <View style={styles.pdfBadge}>
                  <MaterialCommunityIcons name="file-pdf-box" size={18} color="#DC2626" />
                  <Text style={styles.pdfBadgeText}>PDF document</Text>
                </View>
                {previewDoc.preview ? (
                  <Image source={previewDoc.preview as any} style={styles.pdfImage} resizeMode="contain" />
                ) : (
                  <View style={styles.pdfPlaceholder}>
                    <MaterialCommunityIcons name="file-pdf-box" size={64} color="#DC2626" />
                    <Text style={styles.pdfPlaceholderTitle}>{previewDoc.fileName}</Text>
                    <Text style={styles.pdfPlaceholderSub}>Document uploaded — preview will load from API URL later</Text>
                  </View>
                )}
                <View style={styles.pdfFooter}>
                  <Text style={styles.pdfFooterText}>{previewDoc.title} · {previewDoc.fileName}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.imageSheet}>
                {previewDoc?.preview ? (
                  <Image source={previewDoc.preview as any} style={styles.imagePreview} resizeMode="contain" />
                ) : (
                  <View style={styles.pdfPlaceholder}>
                    <Ionicons name="image-outline" size={64} color="#9CA3AF" />
                    <Text style={styles.pdfPlaceholderTitle}>{previewDoc?.fileName}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
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
  toolbar: { gap: 12, marginBottom: 14 },
  tabs: { flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#D1FAE5" },
  tabText: { fontSize: 13, fontWeight: "600", color: GRAY },
  tabTextActive: { color: GREEN },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFFFFF",
    borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827", paddingVertical: 10 },
  bulkBar: { marginBottom: 14, gap: 10 },
  selectAllRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectAllText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  bulkBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bulkVerifyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: GREEN,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  bulkVerifyText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bulkRejectBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF2F2",
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#FECACA",
  },
  bulkRejectText: { color: RED, fontSize: 13, fontWeight: "700" },
  btnDisabled: { opacity: 0.45 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  checkboxDisabled: { opacity: 0.35 },
  listWrap: { gap: 10 },
  cardWrap: { position: "relative" },
  userCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    borderRadius: 16, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, gap: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E5E7EB" },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  userProfession: { fontSize: 13, color: GRAY, marginTop: 1 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  locationText: { fontSize: 12, color: GRAY },
  userRight: { alignItems: "flex-end", gap: 6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePending: { backgroundColor: "#FEF3C7" },
  badgeVerified: { backgroundColor: "#D1FAE5" },
  badgeRejected: { backgroundColor: "#FEE2E2" },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11, color: GRAY, fontWeight: "500" },
  moreBtn: { padding: 4 },
  emptyText: { textAlign: "center", color: GRAY, marginTop: 24, fontSize: 14 },
  menuOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24,
  },
  menuCard: {
    width: "100%", maxWidth: 320, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 8,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
      web: { boxShadow: "0 12px 32px rgba(0,0,0,0.16)" } as any,
    }),
  },
  menuHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER, marginBottom: 4,
  },
  menuAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E7EB" },
  menuName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  menuProfession: { fontSize: 12, color: GRAY, marginTop: 1 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  menuItemText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 16,
  },
  modalCard: {
    width: "100%", maxWidth: 420, maxHeight: "90%", backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 12 },
      web: { boxShadow: "0 12px 40px rgba(0,0,0,0.18)" } as any,
    }),
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalUserRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  modalAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#E5E7EB" },
  modalNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  modalUserName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  modalUserProfession: { fontSize: 13, color: GRAY, marginTop: 2 },
  metaGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 18, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  metaItem: { width: "47%", flexDirection: "row", alignItems: "flex-start", gap: 8 },
  metaLabel: { fontSize: 11, color: GRAY },
  metaValue: { fontSize: 13, fontWeight: "600", color: "#111827", marginTop: 1 },
  docsSectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 12 },
  docRow: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F9FAFB",
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER,
  },
  docIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docInfo: { flex: 1, minWidth: 0 },
  docTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  docFileName: { fontSize: 11, color: GRAY, marginTop: 2 },
  uploadedBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  uploadedText: { fontSize: 11, fontWeight: "600", color: GREEN },
  viewDocBtn: { backgroundColor: "#D1FAE5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewDocText: { fontSize: 12, fontWeight: "700", color: GREEN },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  rejectAppBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: "#FECACA", backgroundColor: "#FEF2F2",
  },
  rejectAppText: { fontSize: 14, fontWeight: "700", color: RED },
  verifyAppBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 13, borderRadius: 12, backgroundColor: GREEN,
  },
  verifyAppText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  previewOverlay: { flex: 1, backgroundColor: "#0F172A" },
  previewHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "#FFFFFF", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  previewClose: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  previewTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  previewFileName: { fontSize: 12, color: GRAY, marginTop: 2 },
  previewBody: { padding: 16, alignItems: "center", minHeight: SCREEN_H * 0.7, justifyContent: "center" },
  pdfSheet: {
    width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 12, overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  pdfBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#FEF2F2", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#FECACA",
  },
  pdfBadgeText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  pdfImage: { width: "100%", height: SCREEN_H * 0.5, backgroundColor: "#F8FAFC" },
  pdfPlaceholder: { paddingVertical: 48, paddingHorizontal: 24, alignItems: "center", gap: 10 },
  pdfPlaceholderTitle: { fontSize: 15, fontWeight: "700", color: "#111827", textAlign: "center" },
  pdfPlaceholderSub: { fontSize: 13, color: GRAY, textAlign: "center", lineHeight: 18 },
  pdfFooter: {
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER, backgroundColor: "#F9FAFB",
  },
  pdfFooterText: { fontSize: 12, color: GRAY, fontWeight: "500" },
  imageSheet: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 12, overflow: "hidden" },
  imagePreview: { width: "100%", height: SCREEN_H * 0.55, backgroundColor: "#0F172A" },
});
