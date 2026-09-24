/**
 * My Service Requests (Profile)
 * ----------------------------
 * Shows ONLY posts created by the authenticated user.
 * Each card has Edit + Delete (owner-only; enforced in the service layer too).
 *
 * NOW  → listMyServiceRequests / deleteServiceRequest from mock service
 * LATER → same function names, swap service bodies to API
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  deleteServiceRequest,
  listMyServiceRequests,
  type ServiceRequest,
} from "@/services/serviceRequests";
import CreateJobModal from "@/components/CreateJobModal"; // adjust path if needed

const GREEN = "#159447";
const TEXT = "#111827";
const MUTED = "#6B7280";

export default function MyServiceRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>(() =>
    listMyServiceRequests(),
  );

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(
    null,
  );

  const refresh = useCallback(() => {
    setRequests(listMyServiceRequests());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openCreate = () => {
    setEditingRequest(null);
    setModalVisible(true);
  };

  const openEdit = (item: ServiceRequest) => {
    setEditingRequest(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRequest(null);
  };

  const handleSaved = (_request: ServiceRequest) => {
    refresh();
    // modal closes itself via onClose after save
  };

  const onDelete = (item: ServiceRequest) => {
    Alert.alert(
      "Delete request?",
      `Remove “${item.title}”? Comments and likes will be removed too.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const ok = deleteServiceRequest(item.id);
            if (ok) refresh();
            else
              Alert.alert(
                "Could not delete",
                "Only your own posts can be deleted.",
              );
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: ServiceRequest }) => {
    const cover = item.images?.[0];
    const commentCount = item.comments?.length ?? 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardTopText}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.category} · {item.location}, {item.city}
            </Text>
            <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          </View>
          {cover ? (
            <Image source={cover} style={styles.thumb} resizeMode="cover" />
          ) : null}
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={16} color={MUTED} />
            <Text style={styles.statText}>{item.likesCount ?? 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={15} color={MUTED} />
            <Text style={styles.statText}>{commentCount}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEdit(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={16} color={GREEN} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Requests</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={openCreate}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySub}>
              Posts you create will show here. Only you can edit or delete them.
            </Text>
            <TouchableOpacity
              style={styles.emptyCreate}
              onPress={openCreate}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyCreateText}>Create request</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Modal lives here — not a route */}
      <CreateJobModal
        visible={modalVisible}
        onClose={closeModal}
        request={editingRequest}
        onSaved={handleSaved}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: TEXT,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
  },
  cardTopText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
  },
  timeAgo: {
    marginTop: 2,
    fontSize: 12,
    color: "#9CA3AF",
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: MUTED,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: "#F0FDF4",
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: GREEN,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "700",
    color: TEXT,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCreate: {
    marginTop: 20,
    backgroundColor: GREEN,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyCreateText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});