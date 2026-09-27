/**
 * Chat / messages service
 * ----------------------
 * Screens import ONLY from here.
 *
 * NOW  → mock in-memory conversations
 * LATER → apiRequest + realtime (Supabase channels / websockets)
 *
 * Booking / Offer messaging lock:
 *   Pending  → locked (waiting for acceptor)
 *   Accepted → unlocked
 *   Declined → locked
 * Accept / Decline UI:
 *   Booking → professional (Received side)
 *   Offer   → request owner (provider who posted the job)
 */

import { getProfessionalById } from "@/services/professionals";
import type { Booking } from "@/services/bookings";
import { recordAcceptedOfferBooking } from "@/services/bookings";
import { getCurrentUserId } from "@/services/inAppNotifications";
import { getLoggedInProfessionalId } from "@/services/savedProviders";

export type ChatParticipant = {
  id: string;
  name: string;
  image: number;
  verified?: boolean;
  online?: boolean;
};

/** Rich card shown in chat for booking or offer requests */
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

const CURRENT_USER_ID = "u1";

const pro2 = getProfessionalById("2");
const pro3 = getProfessionalById("3");
const pro4 = getProfessionalById("4");
const pro5 = getProfessionalById("5");

let conversations: Conversation[] = [
  {
    id: "c1",
    participant: {
      id: "2",
      name: pro2?.name ?? "Chioma Eze",
      image: pro2?.image ?? 0,
      verified: pro2?.verified,
      online: true,
    },
    lastMessage: "Hi! Is the dresser still available?",
    lastMessageAt: "9:30 AM",
    unreadCount: 2,
  },
  {
    id: "c2",
    participant: {
      id: "3",
      name: pro3?.name ?? "Ikechukwu Obi",
      image: pro3?.image ?? 0,
      verified: pro3?.verified,
      online: false,
    },
    lastMessage: "Thanks! Can we meet this weekend?",
    lastMessageAt: "9:12 AM",
    unreadCount: 1,
  },
  {
    id: "c3",
    participant: {
      id: "4",
      name: pro4?.name ?? "Blessing Joy",
      image: pro4?.image ?? 0,
      verified: pro4?.verified,
      online: true,
    },
    lastMessage: "The plant pots are ready for pickup 😊",
    lastMessageAt: "Yesterday",
    unreadCount: 3,
  },
  {
    id: "c4",
    participant: {
      id: "5",
      name: pro5?.name ?? "Emeka Okoro",
      image: pro5?.image ?? 0,
      verified: pro5?.verified,
      online: false,
    },
    lastMessage: "Sounds good! See you then.",
    lastMessageAt: "Yesterday",
    unreadCount: 0,
  },
];

const messagesByConv: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: "m1",
      conversationId: "c1",
      senderId: CURRENT_USER_ID,
      text: "Hi Chioma, thank you for connecting.",
      createdAt: "9:30 AM",
      isMine: true,
    },
    {
      id: "m2",
      conversationId: "c1",
      senderId: "2",
      text: "Hi! Thanks for reaching out.",
      createdAt: "9:32 AM",
      isMine: false,
    },
  ],
  c2: [
    {
      id: "m1",
      conversationId: "c2",
      senderId: "3",
      text: "Thanks! Can we meet this weekend?",
      createdAt: "9:12 AM",
      isMine: false,
    },
  ],
  c3: [
    {
      id: "m1",
      conversationId: "c3",
      senderId: "4",
      text: "The plant pots are ready for pickup 😊",
      createdAt: "Yesterday",
      isMine: false,
    },
  ],
  c4: [
    {
      id: "m1",
      conversationId: "c4",
      senderId: CURRENT_USER_ID,
      text: "Sounds good! See you then.",
      createdAt: "Yesterday",
      isMine: true,
    },
  ],
};

const locationSharingByConv: Record<string, boolean> = {};
const lastSharedLocationByConv: Record<
  string,
  { label: string; latitude?: number; longitude?: number }
> = {};

function nowLabel() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function pushMessage(conversationId: string, msg: ChatMessage) {
  if (!messagesByConv[conversationId]) {
    messagesByConv[conversationId] = [];
  }
  messagesByConv[conversationId].push(msg);

  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastMessage = msg.text;
    conv.lastMessageAt = msg.createdAt;
    conv.unreadCount = 0;
  }
}

export function listConversations(): Conversation[] {
  return [...conversations];
}

export function getMessages(conversationId: string): ChatMessage[] {
  return [...(messagesByConv[conversationId] ?? [])];
}

export function getConversation(
  conversationId: string,
): Conversation | undefined {
  return conversations.find((c) => c.id === conversationId);
}

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessage> {
  if (!canSendMessage(conversationId)) {
    throw new Error("Messaging is locked until the request is accepted");
  }
  await new Promise((r) => setTimeout(r, 200));

  const msg: ChatMessage = {
    id: `local-${Date.now()}`,
    conversationId,
    senderId: CURRENT_USER_ID,
    text: text.trim(),
    createdAt: nowLabel(),
    isMine: true,
    kind: "text",
  };

  pushMessage(conversationId, msg);
  return msg;
}

export function markConversationRead(conversationId: string) {
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) conv.unreadCount = 0;
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
  await new Promise((r) => setTimeout(r, 150));

  locationSharingByConv[conversationId] = true;
  lastSharedLocationByConv[conversationId] = location;

  const msg: ChatMessage = {
    id: `loc-${Date.now()}`,
    conversationId,
    senderId: CURRENT_USER_ID,
    text: `📍 Shared location: ${location.label}`,
    createdAt: nowLabel(),
    isMine: true,
    kind: "location",
    location,
  };

  pushMessage(conversationId, msg);
  return msg;
}

export async function stopSharingLocation(
  conversationId: string,
): Promise<ChatMessage | null> {
  if (!locationSharingByConv[conversationId]) return null;

  await new Promise((r) => setTimeout(r, 100));

  locationSharingByConv[conversationId] = false;
  delete lastSharedLocationByConv[conversationId];

  const msg: ChatMessage = {
    id: `loc-stop-${Date.now()}`,
    conversationId,
    senderId: CURRENT_USER_ID,
    text: "Location sharing stopped",
    createdAt: nowLabel(),
    kind: "location_stopped",
    isMine: true,
  };

  pushMessage(conversationId, msg);
  return msg;
}

export function canOpenSharedLocation(
  conversationId: string,
  message: ChatMessage,
): boolean {
  if (message.kind !== "location" || !message.location) return false;
  return isSharingLocation(conversationId);
}

/** Chat-side lock for booking / offer threads */
export type BookingChatStatus = "Pending" | "Accepted" | "Declined";

const bookingStatusByConv: Record<string, BookingChatStatus> = {};
/** Who can Accept/Decline (professional for booking, request owner for offer) */
const acceptorIdByConv: Record<string, string> = {};
const conversationKindByConv: Record<string, "booking" | "offer"> = {};
const conversationIdByBookingId: Record<string, string> = {};
/** Offer metadata for recording accepted offer into bookings */
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
    offererImage: number;
    requestOwnerId: string;
    requestOwnerName: string;
    requestOwnerImage: number;
  }
> = {};

function seedPendingBookingChat(input: {
  conversationId: string;
  bookingId: string;
  professionalId: string;
  participant: ChatParticipant;
  title: string;
  date: string;
  location?: string;
  amount?: number;
  category?: string;
  description?: string;
  lastMessage: string;
}) {
  const {
    conversationId: id,
    bookingId,
    professionalId,
    participant,
    title,
    date,
    location,
    amount,
    category,
    description,
    lastMessage,
  } = input;

  if (conversations.some((c) => c.id === id)) return;

  conversations = [
    {
      id,
      participant,
      lastMessage,
      lastMessageAt: "Just now",
      unreadCount: 1,
    },
    ...conversations,
  ];

  messagesByConv[id] = [
    {
      id: `sys-seed-${bookingId}`,
      conversationId: id,
      senderId: "system",
      text: `Booking request: ${title}`,
      createdAt: "Just now",
      isMine: false,
      kind: "request_card",
      card: {
        kind: "booking",
        title,
        category,
        location,
        description,
        amount,
        date,
        statusLabel: "Waiting for professional to accept",
      },
    },
  ];

  bookingStatusByConv[id] = "Pending";
  acceptorIdByConv[id] = String(professionalId);
  conversationKindByConv[id] = "booking";
  conversationIdByBookingId[bookingId] = id;
}

seedPendingBookingChat({
  conversationId: "booking-hist-r1",
  bookingId: "r1",
  professionalId: "1",
  participant: {
    id: "u2",
    name: "Ada Okafor",
    image: pro2?.image ?? 0,
    online: true,
  },
  title: "House Cleaning",
  date: "May 28, 2025 09:00 AM",
  location: "Lagos",
  amount: 15400,
  category: "Cleaning",
  description: "Need a thorough clean of a 3-bedroom flat before guests arrive.",
  lastMessage: "Booking request: House Cleaning",
});

seedPendingBookingChat({
  conversationId: "booking-hist-b1",
  bookingId: "b1",
  professionalId: "2",
  participant: {
    id: "2",
    name: pro2?.name ?? "Chioma Eze",
    image: pro2?.image ?? 0,
    verified: pro2?.verified,
    online: true,
  },
  title: "Nail Extension",
  date: "May 25, 2025 10:00 AM",
  location: "Lagos",
  amount: 15400,
  category: "Beauty",
  description: "Full set nail extension, prefer soft gel.",
  lastMessage: "Booking request: Nail Extension",
});

export function getOrCreateConversationForProfessional(
  professionalId: string,
): Conversation {
  const existing = conversations.find(
    (c) => String(c.participant.id) === String(professionalId),
  );
  if (existing) return existing;

  const pro = getProfessionalById(professionalId);
  const id = `c-pro-${professionalId}`;

  const conv: Conversation = {
    id,
    participant: {
      id: String(professionalId),
      name: pro?.name ?? "Professional",
      image: pro?.image ?? 0,
      verified: pro?.verified,
      online: false,
    },
    lastMessage: "",
    lastMessageAt: "Now",
    unreadCount: 0,
  };

  conversations = [conv, ...conversations];
  if (!messagesByConv[id]) messagesByConv[id] = [];
  return conv;
}

/** Map Booking.status → chat lock (Accepted unlocks messaging) */
function syncChatLockFromBooking(
  conversationId: string,
  status: Booking["status"],
) {
  if (status === "Pending") {
    bookingStatusByConv[conversationId] = "Pending";
  } else if (status === "Declined") {
    bookingStatusByConv[conversationId] = "Declined";
  } else {
    bookingStatusByConv[conversationId] = "Accepted";
  }
}

export function openBookingChat(
  booking: Booking,
  mainTab: "booked" | "received",
): Conversation {
  const linkedId = conversationIdByBookingId[booking.id];
  if (linkedId) {
    const existing = conversations.find((c) => c.id === linkedId);
    if (existing) {
      syncChatLockFromBooking(linkedId, booking.status);
      return existing;
    }
  }

  const id = `booking-hist-${booking.id}`;
  let conv = conversations.find((c) => c.id === id);

  if (!conv) {
    const isBooked = mainTab === "booked";
    conv = {
      id,
      participant: isBooked
        ? {
            id: String(booking.professionalId),
            name: booking.professionalName,
            image: booking.professionalImage,
            verified: booking.professionalVerified,
            online: false,
          }
        : {
            id: String(booking.customerId),
            name: booking.customerName,
            image: booking.customerImage,
            online: false,
          },
      lastMessage:
        booking.status === "Pending"
          ? `Booking request: ${booking.title}`
          : `Booking: ${booking.title}`,
      lastMessageAt: "Earlier",
      unreadCount: 0,
    };
    conversations = [conv, ...conversations];

    if (!messagesByConv[id]) {
      const statusLabel =
        booking.status === "Pending"
          ? "Waiting for professional to accept"
          : booking.status === "Declined"
            ? "This booking was declined"
            : "Status: Accepted";

      messagesByConv[id] = [
        {
          id: `sys-${booking.id}`,
          conversationId: id,
          senderId: "system",
          text: `Booking: ${booking.title}`,
          createdAt: "Earlier",
          isMine: false,
          kind: "request_card",
          card: {
            kind: "booking",
            title: booking.title,
            location: booking.location,
            amount: booking.amount,
            date: booking.date,
            statusLabel,
          },
        },
      ];
    }
  }

  conversationIdByBookingId[booking.id] = id;
  acceptorIdByConv[id] = String(booking.professionalId);
  conversationKindByConv[id] = "booking";
  syncChatLockFromBooking(id, booking.status);
  return conv;
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
  return (
    String(acceptorIdByConv[conversationId] ?? "") === String(currentUserId)
  );
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

export function createBookingConversation(input: {
  professionalId: string;
  professionalName: string;
  professionalImage: number;
  professionalVerified?: boolean;
  bookingTitle: string;
  bookingDate: string;
  bookingId?: string;
  location?: string;
  amount?: number;
  category?: string;
  description?: string;
}): Conversation {
  const id = `booking-${input.professionalId}-${Date.now()}`;

  const conv: Conversation = {
    id,
    participant: {
      id: String(input.professionalId),
      name: input.professionalName,
      image: input.professionalImage,
      verified: input.professionalVerified,
      online: true,
    },
    lastMessage: `New booking: ${input.bookingTitle}`,
    lastMessageAt: "Just now",
    unreadCount: 1,
  };

  conversations = [conv, ...conversations];
  messagesByConv[id] = [];
  bookingStatusByConv[id] = "Pending";
  acceptorIdByConv[id] = String(input.professionalId);
  conversationKindByConv[id] = "booking";

  if (input.bookingId) {
    conversationIdByBookingId[input.bookingId] = id;
  }

  messagesByConv[id].push({
    id: `sys-${Date.now()}`,
    conversationId: id,
    senderId: "system",
    text: `Booking request: ${input.bookingTitle}`,
    createdAt: nowLabel(),
    isMine: false,
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

  return conv;
}

export function createOfferConversation(input: {
  requestId: string;
  requestTitle: string;
  requestCategory?: string;
  requestLocation?: string;
  requestDescription?: string;
  amount: number;
  requestOwnerId: string;
  requestOwnerName: string;
  requestOwnerImage: number;
  offererProfessionalId: string;
  offererName: string;
  offererImage: number;
}): Conversation {
  const id = `offer-${input.requestId}-${input.offererProfessionalId}-${Date.now()}`;

  const current = getCurrentUserId();
  const iAmOfferer =
    String(current) === String(input.offererProfessionalId) ||
    String(getLoggedInProfessionalId()) === String(input.offererProfessionalId);

  const participant: ChatParticipant = iAmOfferer
    ? {
        id: String(input.requestOwnerId),
        name: input.requestOwnerName,
        image: input.requestOwnerImage,
        online: true,
      }
    : {
        id: String(input.offererProfessionalId),
        name: input.offererName,
        image: input.offererImage,
        online: true,
      };

  const conv: Conversation = {
    id,
    participant,
    lastMessage: `Offer: ₦${input.amount.toLocaleString()} on "${input.requestTitle}"`,
    lastMessageAt: "Just now",
    unreadCount: 1,
  };

  conversations = [conv, ...conversations];
  messagesByConv[id] = [];
  bookingStatusByConv[id] = "Pending";
  acceptorIdByConv[id] = String(input.requestOwnerId);
  conversationKindByConv[id] = "offer";

  offerMetaByConv[id] = {
    requestId: input.requestId,
    title: input.requestTitle,
    category: input.requestCategory,
    location: input.requestLocation,
    amount: input.amount,
    offererProfessionalId: String(input.offererProfessionalId),
    offererName: input.offererName,
    offererImage: input.offererImage,
    requestOwnerId: String(input.requestOwnerId),
    requestOwnerName: input.requestOwnerName,
    requestOwnerImage: input.requestOwnerImage,
  };

  messagesByConv[id].push({
    id: `sys-offer-${Date.now()}`,
    conversationId: id,
    senderId: "system",
    text: `Offer request: ${input.requestTitle}`,
    createdAt: nowLabel(),
    isMine: false,
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

  return conv;
}

export function acceptBooking(
  conversationId: string,
  acceptorDisplayName: string,
): ChatMessage {
  bookingStatusByConv[conversationId] = "Accepted";

  const msgs = messagesByConv[conversationId] ?? [];
  const cardMsg = msgs.find((m) => m.kind === "request_card" && m.card);
  if (cardMsg?.card) {
    cardMsg.card = {
      ...cardMsg.card,
      statusLabel: "Accepted",
    };
  }

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
        professionalImage: meta.offererImage,
        customerId: meta.requestOwnerId,
        customerName: meta.requestOwnerName,
        customerImage: meta.requestOwnerImage,
      });
    }
  }

  const msg: ChatMessage = {
    id: `sys-accept-${Date.now()}`,
    conversationId,
    senderId: "system",
    text:
      kind === "offer"
        ? `${acceptorDisplayName} accepted your offer`
        : `${acceptorDisplayName} accepted your booking`,
    createdAt: nowLabel(),
    isMine: false,
    kind: "text",
  };

  pushMessage(conversationId, msg);
  return msg;
}

export function declineBooking(
  conversationId: string,
  acceptorDisplayName: string,
): ChatMessage {
  bookingStatusByConv[conversationId] = "Declined";

  const msgs = messagesByConv[conversationId] ?? [];
  const cardMsg = msgs.find((m) => m.kind === "request_card" && m.card);
  if (cardMsg?.card) {
    cardMsg.card = {
      ...cardMsg.card,
      statusLabel: "Declined",
    };
  }

  const kind = conversationKindByConv[conversationId];

  const msg: ChatMessage = {
    id: `sys-decline-${Date.now()}`,
    conversationId,
    senderId: "system",
    text:
      kind === "offer"
        ? `${acceptorDisplayName} declined your offer`
        : `${acceptorDisplayName} declined your booking`,
    createdAt: nowLabel(),
    isMine: false,
    kind: "text",
  };

  pushMessage(conversationId, msg);
  return msg;
}
