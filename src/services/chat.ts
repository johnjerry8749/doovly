import { supabase } from "@/lib/supabase";
import { loadSessionUser } from "@/lib/session";
import { uploadImage } from "@/services/cloudinary";
import { recordAcceptedOfferBooking, updateBookingStatus } from "@/services/bookings";
import type { Booking } from "@/services/bookings";
import type { ImageSourcePropType } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ChatParticipant = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  verified?: boolean;
  online?: boolean;
  phone?: string | null;
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
  location?: { label: string; latitude?: number; longitude?: number };
  kind?: "text" | "image" | "location" | "location_stopped" | "request_card" | "system";
  imageUrl?: string;
  card?: RequestCardData;
};

export type Conversation = {
  id: string;
  participant: ChatParticipant;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type BookingChatStatus = "Pending" | "Accepted" | "Declined";

type Listener = (count: number) => void;

const CONVERSATIONS_CACHE_PREFIX = "@doovly/chat/conversations/";
const MESSAGES_CACHE_PREFIX = "@doovly/chat/messages/";

function conversationCacheKey(userId: string) {
  return CONVERSATIONS_CACHE_PREFIX + userId;
}

function messagesCacheKey(conversationId: string) {
  return MESSAGES_CACHE_PREFIX + conversationId;
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Cache failures must never block live chat.
  }
}

export async function getCachedConversationsAsync(): Promise<Conversation[] | null> {
  const session = await loadSessionUser();
  if (!session) return null;
  return readCache<Conversation[]>(conversationCacheKey(session.uuid));
}

export async function cacheConversationsAsync(conversations: Conversation[]): Promise<void> {
  const session = await loadSessionUser();
  if (!session) return;
  await writeCache(conversationCacheKey(session.uuid), conversations);
}

export async function getCachedMessagesAsync(conversationId: string): Promise<ChatMessage[] | null> {
  const conversationUuid = conversationId;
  return readCache<ChatMessage[]>(messagesCacheKey(conversationUuid));
}

export async function cacheMessagesAsync(
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  const conversationUuid = conversationId;
  await writeCache(messagesCacheKey(conversationUuid), messages);
}
const unreadListeners = new Set<Listener>();
const chatRealtimeListeners = new Set<() => void>();
const conversationMemoryCache = new Map<string, Conversation>();
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeUserId: string | null = null;

function imageFromUrl(url?: string | null): ImageSourcePropType {
  return url ? { uri: url } : require("@/assets/profile_1.jpg");
}

function formatTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

async function getUserUuid(publicId: string): Promise<string | null> {
  const value = String(publicId);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", value)
    .maybeSingle();
  if (profile?.id) return profile.id;

  const { data: professional } = await supabase
    .from("professionals")
    .select("user_id")
    .eq("id", value)
    .maybeSingle();
  return professional?.user_id ?? null;
}

async function getParticipant(userId: string): Promise<ChatParticipant> {
  const [{ data: profile }, { data: pro }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,avatar_url,phone")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("professionals")
      .select("id,is_verified,avatar_url,profiles!professionals_user_id_fkey(full_name,avatar_url)")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    id: pro?.id ?? profile?.id ?? userId,
    name: profile?.full_name ?? pro?.profiles?.full_name ?? "User",
    image: imageFromUrl(pro?.avatar_url ?? pro?.profiles?.avatar_url ?? profile?.avatar_url),
    verified: Boolean(pro?.is_verified),
    online: false,
    phone: profile?.phone ?? null,
  };
}

async function notifyUnread() {
  const count = await getTotalUnreadCountAsync();
  unreadListeners.forEach((listener) => listener(count));
}

export async function getTotalUnreadCountAsync(): Promise<number> {
  const session = await loadSessionUser();
  if (!session) return 0;

  const { data } = await supabase
    .from("conversation_reads")
    .select("unread_count")
    .eq("user_id", session.uuid);

  return (data ?? []).reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);
}

export function getTotalUnreadCount(): number {
  return 0;
}

export function subscribeToUnreadCount(listener: Listener): () => void {
  unreadListeners.add(listener);
  void getTotalUnreadCountAsync().then(listener);
  return () => unreadListeners.delete(listener);
}

export async function listConversationsAsync(): Promise<Conversation[]> {
  const session = await loadSessionUser();
  if (!session) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("id,participant_a,participant_b,last_message,last_message_at")
    .or(`participant_a.eq.${session.uuid},participant_b.eq.${session.uuid}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const result: Conversation[] = [];
  for (const row of rows) {
    const otherId = row.participant_a === session.uuid ? row.participant_b : row.participant_a;
    const participant = await getParticipant(otherId);
    const { data: read } = await supabase
      .from("conversation_reads")
      .select("unread_count")
      .eq("conversation_id", row.id)
      .eq("user_id", session.uuid)
      .maybeSingle();

    const conversation: Conversation = {
      id: row.id,
      participant,
      lastMessage: row.last_message,
      lastMessageAt: formatTime(row.last_message_at),
      unreadCount: Number(read?.unread_count ?? 0),
    };
    conversationMemoryCache.set(row.id, conversation);
    result.push(conversation);
  }
  await cacheConversationsAsync(result);
  return result;
}

export function listConversations(): Conversation[] {
  return [];
}

export async function getConversationAsync(conversationId: string): Promise<Conversation | undefined> {
  const session = await loadSessionUser();
  if (!session || !conversationId) return undefined;

  const conversationUuid = conversationId;

  const { data: row, error } = await supabase
    .from("conversations")
    .select("id,participant_a,participant_b,last_message,last_message_at")
    .eq("id", conversationUuid)
    .or(`participant_a.eq.${session.uuid},participant_b.eq.${session.uuid}`)
    .maybeSingle();

  if (error) throw error;
  if (!row) return undefined;

  const otherId =
    row.participant_a === session.uuid ? row.participant_b : row.participant_a;

  let participant: ChatParticipant;
  try {
    participant = await getParticipant(otherId);
  } catch {
    participant = {
      id: otherId,
      name: "User",
      image: require("@/assets/profile_1.jpg"),
      verified: false,
      online: false,
      phone: null,
    };
  }

  conversationMemoryCache.set(row.id, {
    id: row.id,
    participant,
    lastMessage: row.last_message,
    lastMessageAt: formatTime(row.last_message_at),
    unreadCount: 0,
  });

  // The DM screen does not need unread_count before rendering. The unread
  // badge is maintained by the chat list/realtime listener, so avoid an extra
  // round trip here.
  return {
    id: row.id,
    participant,
    lastMessage: row.last_message,
    lastMessageAt: formatTime(row.last_message_at),
    unreadCount: 0,
  };
}

export function getConversation(_conversationId: string): Conversation | undefined {
  return conversationMemoryCache.get(_conversationId);
}

async function touchConversation(conversationId: string, senderId: string, preview: string, createdAt: string) {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("participant_a,participant_b")
    .eq("id", conversationId)
    .single();

  if (conversationError) throw conversationError;

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      last_message: preview,
      last_message_at: createdAt,
    })
    .eq("id", conversationId);

  if (updateError) throw updateError;

  const recipient =
    conversation.participant_a === senderId
      ? conversation.participant_b
      : conversation.participant_a;

  const { data: existingRead } = await supabase
    .from("conversation_reads")
    .select("unread_count")
    .eq("conversation_id", conversationId)
    .eq("user_id", recipient)
    .maybeSingle();

  const { error: readError } = await supabase
    .from("conversation_reads")
    .upsert(
      {
        conversation_id: conversationId,
        user_id: recipient,
        unread_count: Number(existingRead?.unread_count ?? 0) + 1,
      },
      { onConflict: "conversation_id,user_id" },
    );

  if (readError) throw readError;
}

function normalizeRequestCard(value: unknown): RequestCardData | undefined {
  if (!value) return undefined;

  let card: any = value;
  if (typeof card === "string") {
    try {
      card = JSON.parse(card);
    } catch {
      return undefined;
    }
  }

  if (!card || typeof card !== "object") return undefined;
  if (card.kind !== "booking" && card.kind !== "offer") return undefined;

  return {
    kind: card.kind,
    title: String(card.title ?? "Booking request"),
    category: card.category ? String(card.category) : undefined,
    location: card.location ? String(card.location) : undefined,
    description: card.description ? String(card.description) : undefined,
    amount: card.amount == null ? undefined : Number(card.amount),
    date: card.date ? String(card.date) : undefined,
    statusLabel: String(card.statusLabel ?? "Pending"),
  };
}

function mapMessage(row: any, currentUserId: string): ChatMessage {
  const kind = row.kind as ChatMessage["kind"];
  const card = normalizeRequestCard(row.card);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    text: row.text,
    createdAt: formatTime(row.created_at),
    isMine: row.sender_id === currentUserId,
    kind,
    card,
    imageUrl: row.image_url ?? undefined,
    location:
      row.location_label
        ? { label: row.location_label, latitude: row.latitude ?? undefined, longitude: row.longitude ?? undefined }
        : undefined,
  };
}

export async function getMessagesAsync(conversationId: string): Promise<ChatMessage[]> {
  const session = await loadSessionUser();
  if (!session) return [];

  const conversationUuid = conversationId;

  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,text,kind,location_label,latitude,longitude,card,image_url,created_at")
    .eq("conversation_id", conversationUuid)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Request cards are part of the real conversation history. Keep them in
  // the live message stream so an existing one-to-one DM shows the booking
  // or offer details instead of only the accept/decline controls.
  const messages = (data ?? []).map((row) => mapMessage(row, session.uuid));
  return messages;
}

export function getMessages(_conversationId: string): ChatMessage[] {
  return [];
}
export async function getChatCreditsAsync(): Promise<number | null> {
  const session = await loadSessionUser();
  if (!session) return 0;

  const { data: professional } = await supabase
    .from("professionals")
    .select("subscribed")
    .eq("user_id", session.uuid)
    .maybeSingle();

  if (professional?.subscribed) return null;

  const { data, error } = await supabase.rpc("get_my_chat_credits");

  if (error) throw error;
  return Number(data ?? 15);
}

export async function isCurrentUserChatProAsync(): Promise<boolean> {
  const session = await loadSessionUser();
  if (!session) return false;
  const { data } = await supabase
    .from("professionals")
    .select("subscribed")
    .eq("user_id", session.uuid)
    .maybeSingle();
  return Boolean(data?.subscribed);
}

export async function sendImageMessage(conversationId: string, localUri: string): Promise<ChatMessage> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");
  if (!localUri) throw new Error("No image selected");
  if ((await getBookingStatusAsync(conversationId)) !== "Accepted") {
    throw new Error("Image messaging is available after the request is accepted");
  }
  if (!(await isCurrentUserChatProAsync())) {
    throw new Error("IMAGE_CHAT_PRO_REQUIRED");
  }

  const imageUrl = await uploadImage(localUri, "doovly/chat");
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: session.uuid,
      text: "📷 Image",
      kind: "image",
      image_url: imageUrl,
    })
    .select("id,conversation_id,sender_id,text,kind,location_label,latitude,longitude,card,image_url,created_at")
    .single();

  if (error) throw error;
  await touchConversation(conversationId, session.uuid, "📷 Image", data.created_at);
  await notifyUnread();
  return mapMessage(data, session.uuid);
}

export async function sendMessage(conversationId: string, text: string): Promise<ChatMessage> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");
  if (!text.trim()) throw new Error("Message cannot be empty");
  if (!(await canSendMessageAsync(conversationId))) {
    throw new Error("Messaging is locked until the request is accepted");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: session.uuid,
      text: text.trim(),
      kind: "text",
    })
    .select("id,conversation_id,sender_id,text,kind,location_label,latitude,longitude,card,image_url,created_at")
    .single();

  if (error) throw error;
  await touchConversation(conversationId, session.uuid, data.text, data.created_at);
  await notifyUnread();
  return mapMessage(data, session.uuid);
}

export async function markConversationReadAsync(conversationId: string): Promise<void> {
  const session = await loadSessionUser(true);
  if (!session) return;

  const conversationUuid = conversationId;

  const { error } = await supabase
    .from("conversation_reads")
    .upsert(
      { conversation_id: conversationUuid, user_id: session.uuid, unread_count: 0, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" },
    );

  if (error) throw error;
  await notifyUnread();
}

export function markConversationRead(_conversationId: string) {
  // Legacy synchronous API retained; callers should use markConversationReadAsync.
}

async function latestLocation(conversationId: string): Promise<ChatMessage | null> {
  const messages = await getMessagesAsync(conversationId);
  let active: ChatMessage | null = null;
  for (const message of messages) {
    if (message.kind === "location") active = message;
    if (message.kind === "location_stopped") active = null;
  }
  return active;
}

export async function isSharingLocationAsync(conversationId: string): Promise<boolean> {
  return Boolean(await latestLocation(conversationId));
}

export function isSharingLocation(_conversationId: string): boolean {
  return false;
}

export async function getActiveSharedLocationAsync(conversationId: string) {
  return (await latestLocation(conversationId))?.location ?? null;
}

export function getActiveSharedLocation(_conversationId: string) {
  return null;
}

export async function shareLocation(conversationId: string, location: { label: string; latitude?: number; longitude?: number }): Promise<ChatMessage> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: session.uuid,
      text: `📍 Shared location: ${location.label}`,
      kind: "location",
      location_label: location.label,
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    })
    .select("id,conversation_id,sender_id,text,kind,location_label,latitude,longitude,card,image_url,created_at")
    .single();

  if (error) throw error;
  await touchConversation(conversationId, session.uuid, data.text, data.created_at);
  await notifyUnread();
  return mapMessage(data, session.uuid);
}

export async function stopSharingLocation(conversationId: string): Promise<ChatMessage | null> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");

  if (!(await isSharingLocationAsync(conversationId))) return null;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: session.uuid,
      text: "Location sharing stopped",
      kind: "location_stopped",
    })
    .select("id,conversation_id,sender_id,text,kind,location_label,latitude,longitude,card,image_url,created_at")
    .single();

  if (error) throw error;
  await touchConversation(conversationId, session.uuid, data.text, data.created_at);
  await notifyUnread();
  return mapMessage(data, session.uuid);
}

export function canOpenSharedLocation(_conversationId: string, message: ChatMessage): boolean {
  return message.kind === "location" && Boolean(message.location);
}

async function conversationRowFor(id: string) {
  const conversationUuid = id;

  const { data, error } = await supabase
    .from("conversations")
    .select("id,booking_id,service_request_id,offer_id,text_allowed,text_allowed_by,text_allowed_at")
    .eq("id", conversationUuid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getBookingStatusAsync(conversationId: string): Promise<BookingChatStatus> {
  const row = await conversationRowFor(conversationId);
  if (!row) return "Accepted";

  if (row.booking_id) {
    const { data } = await supabase.from("bookings").select("status").eq("id", row.booking_id).maybeSingle();
    const status = String(data?.status ?? "").toLowerCase();
    return status === "pending" ? "Pending" : status === "declined" || status === "cancelled" ? "Declined" : "Accepted";
  }

  if (row.service_request_id && row.offer_id) {
    const { data } = await supabase.from("service_request_offers").select("status").eq("id", row.offer_id).maybeSingle();
    const status = String(data?.status ?? "").toLowerCase();
    return status === "pending" ? "Pending" : status === "declined" ? "Declined" : "Accepted";
  }

  return "Accepted";
}

export function getBookingStatus(_conversationId: string): BookingChatStatus {
  return "Accepted";
}

export async function isTextAllowedAsync(conversationId: string): Promise<boolean> {
  const row = await conversationRowFor(conversationId);
  return Boolean(row?.text_allowed);
}

export async function allowTextAsync(conversationId: string): Promise<boolean> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");
  const uuid = conversationId;
  const { data, error } = await supabase.rpc("allow_conversation_text", {
    p_conversation_id: uuid,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function canSendMessageAsync(conversationId: string): Promise<boolean> {
  const status = await getBookingStatusAsync(conversationId);
  return status === "Accepted";
}

export function canSendMessage(_conversationId: string): boolean {
  return true;
}

export async function isProfessionalInConversationAsync(conversationId: string, currentUserId: string): Promise<boolean> {
  const session = await loadSessionUser();
  if (!session) return false;
  const row = await conversationRowFor(conversationId);
  if (!row) return false;
  if (row.booking_id) {
    const { data } = await supabase.from("bookings").select("professional_id").eq("id", row.booking_id).maybeSingle();
    const professional = data?.professional_id ? await supabase.from("professionals").select("user_id").eq("id", data.professional_id).maybeSingle() : null;
    return professional?.data?.user_id === session.uuid && session.uuid === currentUserId;
  }
  return false;
}

export function isProfessionalInConversation(_conversationId: string, _currentUserId: string): boolean {
  return false;
}

export async function isAcceptorInConversationAsync(conversationId: string, currentUserId: string): Promise<boolean> {
  const row = await conversationRowFor(conversationId);
  if (!row) return false;

  if (row.booking_id) {
    const { data: booking } = await supabase.from("bookings").select("professional_id").eq("id", row.booking_id).maybeSingle();
    if (!booking?.professional_id) return false;
    const { data: pro } = await supabase.from("professionals").select("user_id").eq("id", booking.professional_id).maybeSingle();
    return pro?.user_id === currentUserId;
  }

  if (row.service_request_id) {
    const { data: request } = await supabase.from("service_requests").select("created_by").eq("id", row.service_request_id).maybeSingle();
    return request?.created_by === currentUserId;
  }

  return false;
}

export function isAcceptorInConversation(_conversationId: string, _currentUserId: string): boolean {
  return false;
}

export async function getConversationKindAsync(conversationId: string): Promise<"booking" | "offer" | undefined> {
  const row = await conversationRowFor(conversationId);
  if (row?.booking_id) return "booking";
  if (row?.service_request_id) return "offer";
  return undefined;
}

export function getConversationKind(_conversationId: string): "booking" | "offer" | undefined {
  return undefined;
}

async function createConversation(
  participantPublicId: string,
  options: {
    bookingId?: string;
    serviceRequestId?: string;
    offerId?: string;
    lastMessage?: string;
  },
) {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");

  const participantUuid = await getUserUuid(participantPublicId);
  if (!participantUuid) throw new Error("Conversation participant not found");
  if (participantUuid === session.uuid) {
    throw new Error("You cannot start a conversation with yourself");
  }

  const bookingUuid = options.bookingId ?? null;
  const requestUuid = options.serviceRequestId ?? null;
  const offerUuid = options.offerId
    ? options.offerId
    : null;

  // One social-style thread per pair. A booking or offer never creates a second DM.
  const { data: pairConversation, error: pairError } = await supabase
    .from("conversations")
    .select("id")
    .or(`and(participant_a.eq.${session.uuid},participant_b.eq.${participantUuid}),and(participant_a.eq.${participantUuid},participant_b.eq.${session.uuid})`)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pairError) throw pairError;
  if (pairConversation?.id) {
    const conversation = await getConversationAsync(pairConversation.id);
    if (conversation) return conversation;
  }

  // Reuse the conversation tied to this exact booking/offer/request first.
  // Do not accidentally reuse an unrelated chat between the same two users.
  let existing: { id: string } | null = null;

  if (bookingUuid) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("booking_id", bookingUuid)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (!existing && offerUuid) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("offer_id", offerUuid)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (!existing && requestUuid) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("service_request_id", requestUuid)
      .eq("participant_a", session.uuid)
      .eq("participant_b", participantUuid)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (existing) {
    const conversation = await getConversationAsync(existing.id);
    if (conversation) return conversation;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      participant_a: session.uuid,
      participant_b: participantUuid,
      booking_id: bookingUuid,
      service_request_id: requestUuid,
      offer_id: offerUuid,
      last_message: options.lastMessage ?? "",
    })
    .select("id")
    .single();

  if (error) throw error;

  const conversation = await getConversationAsync(data.id);
  if (!conversation) {
    throw new Error("Conversation created but could not be loaded");
  }
  return conversation;
}

export async function openBookingChatAsync(
  booking: Booking,
  mainTab: "booked" | "received",
): Promise<Conversation> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");

  const professionalUuid = await getUserUuid(String(booking.professionalId));
  const customerUuid = await getUserUuid(String(booking.customerId));
  const otherUuid = mainTab === "booked" ? professionalUuid : customerUuid;

  if (!otherUuid) throw new Error("Chat participant not found");

  const bookingUuid = String(booking.id);

  const { data: existing, error: existingError } = await supabase
    .from("conversations")
    .select("id")
    .eq("booking_id", bookingUuid)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    const conv = await getConversationAsync(existing.id);
    if (conv) return conv;
  }

  const conversation = await createConversation(
    otherUuid,
    {
      bookingId: bookingUuid,
      lastMessage: `Booking: ${booking.title}`,
    },
  );

  return conversation;
}

export async function createBookingConversationAsync(input: {
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
  if (!input.bookingId) throw new Error("A real booking is required to start chat");
  return createConversation(input.professionalId, {
    bookingId: input.bookingId,
    lastMessage: `Booking request: ${input.bookingTitle}`,
  });
}

export function createBookingConversation(input: Parameters<typeof createBookingConversationAsync>[0]): Conversation {
  throw new Error("Use createBookingConversationAsync for real chat");
}

export async function createOfferConversationAsync(input: {
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
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");

  const requestUuid = input.requestId;
  const professionalUuid = input.offererProfessionalId;

  const { data: offer } = await supabase
    .from("service_request_offers")
    .select("id")
    .eq("request_id", requestUuid)
    .eq("professional_id", professionalUuid)
    .eq("user_id", session.uuid)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!offer?.id) throw new Error("Offer not found");

  const participantPublicId =
    session.uuid === (await getUserUuid(input.requestOwnerId))
      ? input.offererProfessionalId
      : input.requestOwnerId;

  return createConversation(participantPublicId, {
    serviceRequestId: requestUuid,
    offerId: offer.id,
    lastMessage: `Offer: ₦${input.amount.toLocaleString()} on "${input.requestTitle}"`,
  });
}

export function createOfferConversation(_input: Parameters<typeof createOfferConversationAsync>[0]): Conversation {
  throw new Error("Use createOfferConversationAsync for real chat");
}

export async function acceptBooking(conversationId: string, acceptorDisplayName: string): Promise<ChatMessage> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");
  const row = await conversationRowFor(conversationId);
  if (!row) throw new Error("Conversation not found");

  if (row.booking_id) {
    await updateBookingStatus(row.booking_id, "Accepted");
  } else if (row.service_request_id && row.offer_id) {
    const { data: offer } = await supabase
      .from("service_request_offers")
      .select("id,user_id,professional_id,amount")
      .eq("id", row.offer_id)
      .eq("status", "pending")
      .maybeSingle();
    if (offer) {
      const { error } = await supabase
        .from("service_request_offers")
        .update({ status: "accepted" })
        .eq("id", offer.id);

      if (error) throw error;

      const { data: request } = await supabase
        .from("service_requests")
        .select("title,location,city,created_by")
        .eq("id", row.service_request_id)
        .maybeSingle();

      if (request?.created_by && offer.professional_id) {
        const { data: professional } = await supabase
          .from("professionals")
          .select("profiles!professionals_user_id_fkey(full_name)")
          .eq("id", offer.professional_id)
          .maybeSingle();

        const { data: customer } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", request.created_by)
          .maybeSingle();

        const displayDate = new Date().toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        const { error: bookingError } = await supabase
          .from("bookings")
          .insert({
            customer_id: request.created_by,
            professional_id: offer.professional_id,
            title: request.title,
            professional_name: professional?.profiles?.full_name ?? "Professional",
            customer_name: customer?.full_name ?? "Customer",
            status: "accepted",
            amount: offer.amount,
            location: request.location ?? request.city ?? "Nigeria",
            display_date: displayDate,
            rating: 5,
            reviews_count: 0,
          });

        if (bookingError) throw bookingError;
      }
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: session.uuid,
      text: `${acceptorDisplayName} accepted the request`,
      kind: "system",
    })
    .select("id,conversation_id,sender_id,text,kind,location_label,latitude,longitude,card,image_url,created_at")
    .single();
  if (error) throw error;
  await touchConversation(conversationId, session.uuid, data.text, data.created_at);
  await notifyUnread();
  return mapMessage(data, session.uuid);
}

export async function declineBooking(conversationId: string, acceptorDisplayName: string): Promise<ChatMessage> {
  const session = await loadSessionUser(true);
  if (!session) throw new Error("Not logged in");
  const row = await conversationRowFor(conversationId);
  if (!row) throw new Error("Conversation not found");

  if (row.booking_id) {
    await updateBookingStatus(row.booking_id, "Declined");
  } else if (row.service_request_id && row.offer_id) {
    const { error } = await supabase.from("service_request_offers").update({ status: "declined" }).eq("id", row.offer_id).eq("status", "pending");
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: session.uuid,
      text: `${acceptorDisplayName} declined the request`,
      kind: "system",
    })
    .select("id,conversation_id,sender_id,text,kind,location_label,latitude,longitude,card,image_url,created_at")
    .single();
  if (error) throw error;
  await touchConversation(conversationId, session.uuid, data.text, data.created_at);
  await notifyUnread();
  return mapMessage(data, session.uuid);
}

export async function ensureChatRealtime(onChange?: () => void): Promise<() => void> {
  const session = await loadSessionUser();
  if (!session) return () => {};

  if (onChange) chatRealtimeListeners.add(onChange);

  if (!realtimeChannel || realtimeUserId !== session.uuid) {
    realtimeChannel?.unsubscribe();
    realtimeUserId = session.uuid;

    realtimeChannel = supabase
      .channel(`doovly-chat-${session.uuid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void notifyUnread();
        chatRealtimeListeners.forEach((listener) => listener());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        void notifyUnread();
        chatRealtimeListeners.forEach((listener) => listener());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_reads" }, () => {
        void notifyUnread();
        chatRealtimeListeners.forEach((listener) => listener());
      })
      .subscribe();
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    if (onChange) chatRealtimeListeners.delete(onChange);

    if (chatRealtimeListeners.size === 0 && realtimeChannel) {
      void realtimeChannel.unsubscribe();
      realtimeChannel = null;
      realtimeUserId = null;
    }
  };
}
