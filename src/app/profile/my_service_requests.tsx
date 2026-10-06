/**
 * My Service Requests (Profile)
 * ----------------------------
 * Same card layout as the Requests feed, scoped to the auth user's posts.
 * • 3-dot menu (top-right) → Edit / Delete
 * • Tap comments to open the same half-sheet comments UI (read + reply)
 * Does not auto-open comments on card press.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  addServiceRequestComment,
  deleteServiceRequest,
  listMyServiceRequests,
  type ServiceRequest,
  type ServiceRequestComment,
} from "@/services/serviceRequests";
import { getLoggedInProfessionalId } from "@/services/savedProviders";
import { getProfessionalById } from "@/services/professionals";
import CreateJobModal from "@/components/CreateJobModal";
import RequestImageSlider from "@/components/RequestImageSlider";

const GREEN = "#159447";
const TEXT = "#111827";
const MUTED = "#6B7280";
const MY_AVATAR = require("@/assets/profile_1.jpg");

export default function MyServiceRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>(() =>
    listMyServiceRequests(),
  );
  const [extraComments, setExtraComments] = useState<
    Record<string, ServiceRequestComment[]>
  >({});
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ServiceRequest | null>(
    null,
  );

  const [chatRequest, setChatRequest] = useState<ServiceRequest | null>(null);
  const [chatText, setChatText] = useState("");
  const commentListRef = useRef<FlatList>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await import("@/services/serviceRequests").then(
        (module) => module.listMyServiceRequestsAsync(),
      );
      setRequests(next);
    } catch (error) {
      console.warn("[MyServiceRequests] refresh failed:", error);
    }
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
          onPress: async () => {
            const previous = requests;
            setRequests((current) => current.filter((request) => request.id !== item.id));
            if (chatRequest?.id === item.id) {
              setChatRequest(null);
              setChatText("");
            }

            try {
              const ok = await deleteServiceRequest(item.id);
              if (!ok) throw new Error("Delete was not accepted.");
              await refresh();
            } catch (error) {
              setRequests(previous);
              Alert.alert(
                "Could not delete",
                "Only your own posts can be deleted.",
              );
            }
          },
        },
      ],
    );
  };

  const openMenu = (item: ServiceRequest) => {
    Alert.alert(item.title, undefined, [
      { text: "Edit", onPress: () => openEdit(item) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(item),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const getComments = (item: ServiceRequest): ServiceRequestComment[] => [
    ...(item.comments || []),
    ...(extraComments[item.id] || []),
  ];

  const openChat = (item: ServiceRequest) => {
    setChatRequest(item);
    setChatText("");
  };

  const closeChat = () => {
    setChatRequest(null);
    setChatText("");
  };

  const sendChatMessage = () => {
    if (!chatRequest) return;
    const text = chatText.trim();
    if (!text) return;

    const proId = getLoggedInProfessionalId();
    const pro = proId ? getProfessionalById(proId) : undefined;
    const userName = pro?.name || "You";
    const userAvatar = (pro?.image as typeof MY_AVATAR) || MY_AVATAR;

    // Persist once only. Do NOT also push into extraComments or the list doubles.
    const saved = addServiceRequestComment({
      requestId: chatRequest.id,
      text,
      userName,
      userAvatar,
    });
    if (!saved) return;

    setChatRequest({
      ...chatRequest,
      comments: [...(chatRequest.comments || [])],
    });
    refresh();
    setChatText("");
    setTimeout(
      () => commentListRef.current?.scrollToEnd({ animated: true }),
      100,
    );
  };

  const toggleLike = (id: string) =>
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderItem = ({ item }: { item: ServiceRequest }) => {
    const liked = !!likedIds[item.id];
    const likesDisplay = (item.likesCount || 0) + (liked ? 1 : 0);
    const comments = getComments(item);
    const commentCount = comments.length;
    const firstComment = comments[0];

    return (
      <View style={styles.card}>
        <View style={styles.posterRow}>
          <Image source={item.posterAvatar} style={styles.posterAvatar} />
          <View style={styles.posterInfo}>
            <Text style={styles.posterName} numberOfLines={1}>
              {item.posterName}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={MUTED} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}, {item.city}
              </Text>
            </View>
          </View>
          <Text style={styles.timeAgo}>{item.timeAgo}</Text>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => openMenu(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={MUTED} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          ) : null}
        </View>

        {item.images?.length ? (
          <RequestImageSlider
            images={item.images}
            height={180}
            borderRadius={0}
          />
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.engagementRow}>
          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => toggleLike(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={20}
              color={liked ? "#EF4444" : MUTED}
            />
            <Text style={styles.engagementText}>{likesDisplay}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.engagementBtn}
            onPress={() => openChat(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={18} color={MUTED} />
            <Text style={styles.engagementText}>{commentCount}</Text>
          </TouchableOpacity>
        </View>

        {firstComment ? (
          <View style={styles.commentPreview}>
            <Image
              source={firstComment.userAvatar}
              style={styles.commentAvatar}
            />
            <View style={styles.commentBody}>
              <Text style={styles.commentName}>{firstComment.userName}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openChat(item)}
              >
                <Text style={styles.commentText} numberOfLines={2}>
                  {firstComment.text}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.writeCommentHint}
            onPress={() => openChat(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={16}
              color={GREEN}
            />
            <Text style={styles.writeCommentHintText}>Write a comment…</Text>
          </TouchableOpacity>
        )}

        {commentCount > 1 ? (
          <TouchableOpacity onPress={() => openChat(item)} activeOpacity={0.7}>
            <Text style={styles.viewMoreComments}>
              View {commentCount - 1} more comment
              {commentCount - 1 === 1 ? "" : "s"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const chatComments = chatRequest ? getComments(chatRequest) : [];

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
        <Text style={styles.headerTitle}>My Service Requests</Text>
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
              Posts you create will show here. Use the ⋯ menu to edit or delete.
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

      <CreateJobModal
        visible={modalVisible}
        onClose={closeModal}
        request={editingRequest}
        onSaved={handleSaved}
      />

      <Modal
        visible={!!chatRequest}
        transparent
        animationType="slide"
        onRequestClose={closeChat}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalOverlay} onPress={closeChat}>
            <Pressable
              style={styles.commentModalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.commentModalHandle} />
              <Text style={styles.modalTitle} numberOfLines={1}>
                {chatRequest?.title ?? "Comments"}
              </Text>
              <FlatList
                ref={commentListRef}
                data={chatComments}
                keyExtractor={(c) => c.id}
                style={styles.commentList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No comments yet</Text>
                }
                renderItem={({ item: c }) => (
                  <View style={styles.commentRow}>
                    <Image source={c.userAvatar} style={styles.commentAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentName}>{c.userName}</Text>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                  </View>
                )}
              />
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment…"
                  placeholderTextColor="#9CA3AF"
                  value={chatText}
                  onChangeText={setChatText}
                />
                <TouchableOpacity
                  onPress={sendChatMessage}
                  style={styles.commentSend}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  posterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginRight: 10,
  },
  posterInfo: { flex: 1, minWidth: 0 },
  posterName: { fontSize: 14, fontWeight: "700", color: TEXT },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  locationText: { fontSize: 12, color: MUTED, flex: 1 },
  timeAgo: { fontSize: 12, color: "#9CA3AF", marginRight: 4 },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: TEXT },
  newBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: { fontSize: 10, fontWeight: "800", color: GREEN },
  metaRow: { flexDirection: "row", marginTop: 8, marginBottom: 6 },
  categoryChip: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: GREEN },
  description: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 10,
  },
  engagementRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  engagementBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  engagementText: { fontSize: 13, color: MUTED, fontWeight: "600" },
  commentPreview: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  commentBody: { flex: 1 },
  commentName: { fontSize: 13, fontWeight: "700", color: TEXT },
  commentText: { fontSize: 13, color: "#4B5563" },
  writeCommentHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  writeCommentHintText: { fontSize: 13, color: GREEN, fontWeight: "600" },
  viewMoreComments: {
    fontSize: 13,
    color: GREEN,
    fontWeight: "600",
    marginTop: 4,
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
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 6,
  },
  commentModalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    height: "50%",
    maxHeight: "50%",
  },
  commentModalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: 12,
  },
  commentList: { flex: 1, marginBottom: 8 },
  commentRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  commentInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
});
