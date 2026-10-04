/**
 * Chat / messages service
 * ----------------------
 * Screens import ONLY from here.
 *
 * DATA SOURCE: Supabase
 *   conversations, messages, conversation_reads
 *
 * Booking / Offer messaging lock still tracked in-memory + card JSONB.
 * Pending → locked | Accepted → unlocked | Declined → locked
 */

import type { ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabase";
import { resolveImageSource } from "@/lib/mappers";
import { getProfessionalById } from "@/services/professionals";
import type { Booking } from "@/services/bookings";
import { recordAcceptedOfferBooking } from "@/services/bookings";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { getLoggedInProfessionalId } from "@/services/savedProviders";

export type ChatParticipant = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  verified?: boolean;
  online?: boolean;
};

export type RequestCardData = {
  kind: "booking" | "offer";
  title: string;
  category?: string;
  location?: string;
  description?: string;
  amount?: number;
  date?: string;
  statusLabel: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  location?: {
    label: string;
    latitude?: number;
    longitude?: number;
  };
  kind?: "text" | "location" | "location_stopped" | "request_card";
  card?: RequestCardData;
};

export type Conversation = {
  id: string;
  participant: ChatParticipant;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

const DEFAULT_AVATAR = require("@/assets/profile_1.jpg");

type UnreadCountListener = (count: number) => void;
const unreadCountListeners = new Set<UnreadCountListener>();
let lastKnownTotalUnread = 0;

function notifyUnreadCountListeners(count?: number) {
  const c = count ?? lastKnownTotalUnread;
  lastKnownTotalUnread = c;
  unreadCountListeners.forEach((listener) => listener(c));
}

export function getTotalUnreadCount(): number {
  return lastKnownTotalUnread;
}

export function subscribeToUnreadCount(
  listener: UnreadCountListener,
): () => void {
  unreadCountListeners.add(listener);
  listener(lastKnownTotalUnread);
  void refreshUnreadTotal();
  return () => unreadCountListeners.delete(listener);
}

async function refreshUnreadTotal() {
  const uid = getCurrentUserId();
  if (!uid) return;
  const { data, error } = await supabase
    .from("conversation_reads")
    .select("unread_count")
    .eq("user_id", uid);
  if (error) {
    console.warn("refreshUnreadTotal:", error.message);
    return;
  }
  const total = (data ?? []).reduce(
    (sum, row) => sum + Number(row.unread_count ?? 0),
    0,
  );
  notifyUnreadCountListeners(total);
}

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMessageTime(iso: string | null | undefined): string {
  if (!iso) return nowLabel();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowLabel();
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

async function loadProfile(userId: string): Promise<{
  id: string;
  name: string;
  image: ImageSourcePropType;
  online?: boolean;
}> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, is_online")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    name: data?.full_name?.trim() || "User",
    image:
      (resolveImageSource(data?.avatar_url) as ImageSourcePropType) ||
      DEFAULT_AVATAR,
    online: Boolean(data?.is_online),
  };
}

async function otherParticipantId(
  row: { participant_a: string; participant_b: string },
  me: string,
): Promise<string> {
  return row.participant_a === me ? row.participant_b : row.participant_a;
}

/** In-memory lock state keyed by conversation id */
export type BookingChatStatus = "Pending" | "Accepted" | "Declined";
const bookingStatusByConv: Record<string, BookingChatStatus> = {};
const acceptorIdByConv: Record<string, string> = {};
const conversationKindByConv: Record<string, "booking" | "offer"> = {};
const conversationIdByBookingId: Record<string, string> = {};
const offerMetaByConv: Record<
  string,
  {
    requestId: string;
    title: string;
    category?: string;
    location?: string;
    amount: number;
    offererProfessionalId: string;
    offererName: string;
    offererImage: ImageSourcePropType;
    requestOwnerId: string;
    requestOwnerName: string;
    requestOwnerImage: ImageSourcePropType;
  }
> = {};
const locationSharingByConv: Record<string, boolean> = {};
const lastSharedLocationByConv: Record<
  string,
  { label: string; latitude?: number; longitude?: number }
> = {};

function mapMessage(
  row: {
    id: string;
    conversation_id: string;
    sender_id: string;
    text: string;
    kind: string;
    location_label: string | null;
    latitude: number | null;
    longitude: number | null;
    card: RequestCardData | null;
    created_at: string;
  },
  me: string,
): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    text: row.text ?? "",
    createdAt: formatMessageTime(row.created_at),
    isMine: row.sender_id === me,
    kind: (row.kind as ChatMessage["kind"]) || "text",
    location: row.location_label
      ? {
          label: row.location_label,
          latitude: row.latitude ?? undefined,
          longitude: row.longitude ?? undefined,
        }
      : undefined,
    card: row.card ?? undefined,
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const me = getCurrentUserId();
  if (!me) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`participant_a.eq.${me},participant_b.eq.${me}`)
    .order("last_message_at", { ascending: false });

  if (error) {
    console.error("listConversations error:", error.message);
    throw error;
  }

  const rows = data ?? [];
  const { data: reads } = await supabase
    .from("conversation_reads")
    .select("conversation_id, unread_count")
    .eq("user_id", me);

  const unreadMap = new Map<
    string,
    number
  >((reads ?? []).map((r) => [r.conversation_id, Number(r.unread_count ?? 0)]));

  const result: Conversation[] = [];
  for (const row of rows) {
    const otherId = await otherParticipantId(row, me);
    const profile = await loadProfile(otherId);
    result.push({
      id: row.id,
      participant: {
        id: profile.id,
        name: profile.name,
        image: profile.image,
        online: profile.online,
      },
      lastMessage: row.last_message ?? "",
      lastMessageAt: formatMessageTime(row.last_message_at),
      unreadCount: unreadMap.get(row.id) ?? 0,
    });
  }

  const total = result.reduce((s, c) => s + c.unreadCount, 0);
  notifyUnreadCountListeners(total);
  return result;
}

export async function getMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  const me = getCurrentUserId();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getMessages error:", error.message);
    throw error;
  }

  return (data ?? []).map((row) => mapMessage(row as Parameters<typeof mapMessage>[0], me));
}

export async function getConversation(
  conversationId: string,
): Promise<Conversation | undefined> {
  const list = await listConversations();
  return list.find((c) => c.id === conversationId);
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessage> {
  if (!canSendMessage(conversationId)) {
    throw new Error("Messaging is locked until the request is accepted");
  }

  const me = getCurrentUserId();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty message");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me,
      text: trimmed,
      kind: "text",
    })
    .select("*")
    .single();

  if (error) {
    console.error("sendMessage error:", error.message);
    throw error;
  }

  await supabase
    .from("conversations")
    .update({
      last_message: trimmed,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  // bump unread for the other participant
  const { data: conv } = await supabase
    .from("conversations")
    .select("participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (conv) {
    const other =
      conv.participant_a === me ? conv.participant_b : conv.participant_a;
    const { data: readRow } = await supabase
      .from("conversation_reads")
      .select("unread_count")
      .eq("conversation_id", conversationId)
      .eq("user_id", other)
      .maybeSingle();

    await supabase.from("conversation_reads").upsert(
      {
        conversation_id: conversationId,
        user_id: other,
        unread_count: Number(readRow?.unread_count ?? 0) + 1,
      },
      { onConflict: "conversation_id,user_id" },
    );
  }

  return mapMessage(data as Parameters<typeof mapMessage>[0], me);
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  const me = getCurrentUserId();
  await supabase.from("conversation_reads").upsert(
    {
      conversation_id: conversationId,
      user_id: me,
      unread_count: 0,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_id" },
  );
  await refreshUnreadTotal();
}

export function isSharingLocation(conversationId: string): boolean {
  return !!locationSharingByConv[conversationId];
}

export function getActiveSharedLocation(conversationId: string) {
  if (!locationSharingByConv[conversationId]) return null;
  return lastSharedLocationByConv[conversationId] ?? null;
}

export async function shareLocation(
  conversationId: string,
  location: { label: string; latitude?: number; longitude?: number },
): Promise<ChatMessage> {
  const me = getCurrentUserId();
  locationSharingByConv[conversationId] = true;
  lastSharedLocationByConv[conversationId] = location;

  const text = `📍 Shared location: ${location.label}`;
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me,
      text,
      kind: "location",
      location_label: location.label,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ last_message: text, last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return mapMessage(data as Parameters<typeof mapMessage>[0], me);
}

export async function stopSharingLocation(
  conversationId: string,
): Promise<ChatMessage | null> {
  if (!locationSharingByConv[conversationId]) return null;
  const me = getCurrentUserId();
  locationSharingByConv[conversationId] = false;
  delete lastSharedLocationByConv[conversationId];

  const text = "Location sharing stopped";
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me,
      text,
      kind: "location_stopped",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapMessage(data as Parameters<typeof mapMessage>[0], me);
}

export function canOpenSharedLocation(
  conversationId: string,
  message: ChatMessage,
): boolean {
  if (message.kind !== "location" || !message.location) return false;
  return isSharingLocation(conversationId);
}

async function ensureParticipants(
  a: string,
  b: string,
): Promise<{ participant_a: string; participant_b: string }> {
  // stable order for uniqueness if you add a unique index later
  return a < b
    ? { participant_a: a, participant_b: b }
    : { participant_a: b, participant_b: a };
}

export async function getOrCreateConversationForProfessional(
  professionalId: string,
): Promise<Conversation> {
  const me = getCurrentUserId();
  const pro = await getProfessionalById(professionalId);
  const otherUserId = pro?.userId;
  if (!otherUserId) {
    throw new Error("Professional has no linked user profile");
  }

  const existing = await listConversations();
  const found = existing.find((c) => String(c.participant.id) === String(otherUserId));
  if (found) return found;

  const parts = await ensureParticipants(me, otherUserId);
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      ...parts,
      last_message: "",
      last_message_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("conversation_reads").upsert([
    { conversation_id: data.id, user_id: me, unread_count: 0 },
    { conversation_id: data.id, user_id: otherUserId, unread_count: 0 },
  ]);

  const profile = await loadProfile(otherUserId);
  return {
    id: data.id,
    participant: {
      id: profile.id,
      name: pro?.name ?? profile.name,
      image: pro?.image ?? profile.image,
      verified: pro?.verified,
      online: profile.online,
    },
    lastMessage: "",
    lastMessageAt: "Now",
    unreadCount: 0,
  };
}

function syncChatLockFromBooking(
  conversationId: string,
  status: Booking["status"],
) {
  if (status === "Pending") bookingStatusByConv[conversationId] = "Pending";
  else if (status === "Declined") bookingStatusByConv[conversationId] = "Declined";
  else bookingStatusByConv[conversationId] = "Accepted";
}

export async function openBookingChat(
  booking: Booking,
  mainTab: "booked" | "received",
): Promise<Conversation> {
  const linkedId = conversationIdByBookingId[booking.id];
  if (linkedId) {
    const existing = await getConversation(linkedId);
    if (existing) {
      syncChatLockFromBooking(linkedId, booking.status);
      return existing;
    }
  }

  const me = getCurrentUserId();
  const isBooked = mainTab === "booked";
  // Resolve other party's profile id — prefer customer/professional user linkage
  let otherId = isBooked
    ? String(booking.professionalId)
    : String(booking.customerId);

  // If professionalId is a pro UUID, resolve user_id
  if (isBooked) {
    const pro = await getProfessionalById(String(booking.professionalId));
    if (pro?.userId) otherId = pro.userId;
  }

  const parts = await ensureParticipants(me, otherId);
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      ...parts,
      booking_id: booking.id,
      last_message:
        booking.status === "Pending"
          ? `Booking request: ${booking.title}`
          : `Booking: ${booking.title}`,
      last_message_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    // maybe already exists — list and find by booking
    const list = await listConversations();
    const found = list[0];
    if (found) {
      conversationIdByBookingId[booking.id] = found.id;
      syncChatLockFromBooking(found.id, booking.status);
      return found;
    }
    throw error;
  }

  const statusLabel =
    booking.status === "Pending"
      ? "Waiting for professional to accept"
      : booking.status === "Declined"
        ? "This booking was declined"
        : "Status: Accepted";

  await supabase.from("messages").insert({
    conversation_id: conv.id,
    sender_id: me,
    text: `Booking: ${booking.title}`,
    kind: "request_card",
    card: {
      kind: "booking",
      title: booking.title,
      location: booking.location,
      amount: booking.amount,
      date: booking.date,
      statusLabel,
    },
  });

  conversationIdByBookingId[booking.id] = conv.id;
  acceptorIdByConv[conv.id] = String(booking.professionalId);
  conversationKindByConv[conv.id] = "booking";
  syncChatLockFromBooking(conv.id, booking.status);

  const profile = await loadProfile(otherId);
  return {
    id: conv.id,
    participant: {
      id: profile.id,
      name: isBooked ? booking.professionalName : booking.customerName,
      image: isBooked
        ? (booking.professionalImage as ImageSourcePropType)
        : (booking.customerImage as ImageSourcePropType),
      verified: booking.professionalVerified,
      online: profile.online,
    },
    lastMessage: conv.last_message,
    lastMessageAt: "Just now",
    unreadCount: 0,
  };
}

export function getBookingStatus(conversationId: string): BookingChatStatus {
  return bookingStatusByConv[conversationId] ?? "Accepted";
}

export function canSendMessage(conversationId: string): boolean {
  return getBookingStatus(conversationId) === "Accepted";
}

export function isProfessionalInConversation(
  conversationId: string,
  currentUserId: string,
): boolean {
  return String(acceptorIdByConv[conversationId] ?? "") === String(currentUserId);
}

export function isAcceptorInConversation(
  conversationId: string,
  currentUserId: string,
): boolean {
  return isProfessionalInConversation(conversationId, currentUserId);
}

export function getConversationKind(
  conversationId: string,
): "booking" | "offer" | undefined {
  return conversationKindByConv[conversationId];
}

export async function createBookingConversation(input: {
  professionalId: string;
  professionalName: string;
  professionalImage: ImageSourcePropType;
  professionalVerified?: boolean;
  bookingTitle: string;
  bookingDate: string;
  bookingId?: string;
  location?: string;
  amount?: number;
  category?: string;
  description?: string;
}): Promise<Conversation> {
  const me = getCurrentUserId();
  const pro = await getProfessionalById(input.professionalId);
  const otherUserId = pro?.userId ?? String(input.professionalId);
  const parts = await ensureParticipants(me, otherUserId);

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      ...parts,
      booking_id: input.bookingId ?? null,
      last_message: `New booking: ${input.bookingTitle}`,
      last_message_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("messages").insert({
    conversation_id: conv.id,
    sender_id: me,
    text: `Booking request: ${input.bookingTitle}`,
    kind: "request_card",
    card: {
      kind: "booking",
      title: input.bookingTitle,
      category: input.category,
      location: input.location,
      description: input.description,
      amount: input.amount,
      date: input.bookingDate,
      statusLabel: "Waiting for professional to accept",
    },
  });

  await supabase.from("conversation_reads").upsert([
    { conversation_id: conv.id, user_id: me, unread_count: 0 },
    { conversation_id: conv.id, user_id: otherUserId, unread_count: 1 },
  ]);

  bookingStatusByConv[conv.id] = "Pending";
  acceptorIdByConv[conv.id] = String(input.professionalId);
  conversationKindByConv[conv.id] = "booking";
  if (input.bookingId) conversationIdByBookingId[input.bookingId] = conv.id;

  await refreshUnreadTotal();

  return {
    id: conv.id,
    participant: {
      id: otherUserId,
      name: input.professionalName,
      image: input.professionalImage,
      verified: input.professionalVerified,
      online: true,
    },
    lastMessage: `New booking: ${input.bookingTitle}`,
    lastMessageAt: "Just now",
    unreadCount: 0,
  };
}

export async function createOfferConversation(input: {
  requestId: string;
  requestTitle: string;
  requestCategory?: string;
  requestLocation?: string;
  requestDescription?: string;
  amount: number;
  requestOwnerId: string;
  requestOwnerName: string;
  requestOwnerImage: ImageSourcePropType;
  offererProfessionalId: string;
  offererName: string;
  offererImage: ImageSourcePropType;
}): Promise<Conversation> {
  const me = getCurrentUserId();
  const ownerId = String(input.requestOwnerId);
  const offererPro = await getProfessionalById(String(input.offererProfessionalId));
  const offererUserId = offererPro?.userId ?? String(input.offererProfessionalId);

  const iAmOfferer =
    String(me) === String(offererUserId) ||
    String(getLoggedInProfessionalId()) === String(input.offererProfessionalId);

  const otherId = iAmOfferer ? ownerId : offererUserId;
  const parts = await ensureParticipants(me, otherId);

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({
      ...parts,
      service_request_id: input.requestId,
      last_message: `Offer: ₦${input.amount.toLocaleString()} on "${input.requestTitle}"`,
      last_message_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("messages").insert({
    conversation_id: conv.id,
    sender_id: me,
    text: `Offer request: ${input.requestTitle}`,
    kind: "request_card",
    card: {
      kind: "offer",
      title: input.requestTitle,
      category: input.requestCategory,
      location: input.requestLocation,
      description: input.requestDescription,
      amount: input.amount,
      statusLabel: "Waiting for provider to accept",
    },
  });

  await supabase.from("conversation_reads").upsert([
    { conversation_id: conv.id, user_id: me, unread_count: 0 },
    { conversation_id: conv.id, user_id: otherId, unread_count: 1 },
  ]);

  bookingStatusByConv[conv.id] = "Pending";
  acceptorIdByConv[conv.id] = ownerId;
  conversationKindByConv[conv.id] = "offer";
  offerMetaByConv[conv.id] = {
    requestId: input.requestId,
    title: input.requestTitle,
    category: input.requestCategory,
    location: input.requestLocation,
    amount: input.amount,
    offererProfessionalId: String(input.offererProfessionalId),
    offererName: input.offererName,
    offererImage: input.offererImage,
    requestOwnerId: ownerId,
    requestOwnerName: input.requestOwnerName,
    requestOwnerImage: input.requestOwnerImage,
  };

  await refreshUnreadTotal();

  return {
    id: conv.id,
    participant: {
      id: otherId,
      name: iAmOfferer ? input.requestOwnerName : input.offererName,
      image: iAmOfferer ? input.requestOwnerImage : input.offererImage,
      online: true,
    },
    lastMessage: `Offer: ₦${input.amount.toLocaleString()} on "${input.requestTitle}"`,
    lastMessageAt: "Just now",
    unreadCount: 0,
  };
}

export async function acceptBooking(
  conversationId: string,
  acceptorDisplayName: string,
): Promise<ChatMessage> {
  bookingStatusByConv[conversationId] = "Accepted";
  const me = getCurrentUserId();
  const kind = conversationKindByConv[conversationId];

  if (kind === "offer") {
    const meta = offerMetaByConv[conversationId];
    if (meta) {
      recordAcceptedOfferBooking({
        title: meta.title,
        amount: meta.amount,
        location: meta.location ?? "Nigeria",
        professionalId: meta.offererProfessionalId,
        professionalName: meta.offererName,
        professionalImage: meta.offererImage as number,
        customerId: meta.requestOwnerId,
        customerName: meta.requestOwnerName,
        customerImage: meta.requestOwnerImage as number,
      });
    }
  }

  const text =
    kind === "offer"
      ? `${acceptorDisplayName} accepted your offer`
      : `${acceptorDisplayName} accepted your booking`;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me,
      text,
      kind: "text",
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ last_message: text, last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return mapMessage(data as Parameters<typeof mapMessage>[0], me);
}

export async function declineBooking(
  conversationId: string,
  acceptorDisplayName: string,
): Promise<ChatMessage> {
  bookingStatusByConv[conversationId] = "Declined";
  const me = getCurrentUserId();
  const kind = conversationKindByConv[conversationId];
  const text =
    kind === "offer"
      ? `${acceptorDisplayName} declined your offer`
      : `${acceptorDisplayName} declined your booking`;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me,
      text,
      kind: "text",
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ last_message: text, last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return mapMessage(data as Parameters<typeof mapMessage>[0], me);
}
