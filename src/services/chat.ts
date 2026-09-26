/**
 * Chat / messages service
 * ----------------------
 * Screens import ONLY from here.
 *
 * NOW  → mock in-memory conversations
 * LATER → apiRequest + realtime (Supabase channels / websockets)
 *
 * Booking messaging lock:
 *   Pending  → locked (waiting for professional Accept)
 *   Ongoing  → unlocked (after Accept)
 *   Declined → locked
 * Accept / Decline UI is only for the professional on the Received side.
 */

import { getProfessionalById } from "@/services/professionals";
import type { Booking } from "@/services/bookings";

export type ChatParticipant = {
  id: string;
  name: string;
  image: number;
  verified?: boolean;
  online?: boolean;
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
  kind?: "text" | "location" | "location_stopped";
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
    throw new Error("Messaging is locked until the booking is accepted");
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

/** Chat-side lock for booking threads (maps from Booking.status) */
export type BookingChatStatus = "Pending" | "Accepted" | "Declined";

const bookingStatusByConv: Record<string, BookingChatStatus> = {};
const professionalIdByConv: Record<string, string> = {};
const conversationIdByBookingId: Record<string, string> = {};

function seedPendingBookingChat(input: {
  conversationId: string;
  bookingId: string;
  professionalId: string;
  participant: ChatParticipant;
  title: string;
  date: string;
  lastMessage: string;
}) {
  const {
    conversationId: id,
    bookingId,
    professionalId,
    participant,
    title,
    date,
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
      text: `Booking request: ${title}\nDate: ${date}\nWaiting for professional to accept.`,
      createdAt: "Just now",
      isMine: false,
      kind: "text",
    },
  ];

  bookingStatusByConv[id] = "Pending";
  professionalIdByConv[id] = String(professionalId);
  conversationIdByBookingId[bookingId] = id;
}

// Received r1 — YOU are pro "1" → Accept / Decline in chat
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
  lastMessage: "Booking request: House Cleaning",
});

// Booked b1 — YOU are customer; waiting on Chioma (pro 2), no Accept for you
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

/** Map Booking.status → chat lock (Ongoing unlocks messaging) */
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

/**
 * Open chat from booking history.
 * Does not resend booking details. Messaging locked until professional accepts.
 */
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
      const systemText =
        booking.status === "Pending"
          ? `Booking request: ${booking.title}\nDate: ${booking.date}\nWaiting for professional to accept.`
          : booking.status === "Declined"
            ? `Booking: ${booking.title}\nDate: ${booking.date}\nThis booking was declined.`
            : `Booking: ${booking.title}\nDate: ${booking.date}\nStatus: Ongoing`;

      messagesByConv[id] = [
        {
          id: `sys-${booking.id}`,
          conversationId: id,
          senderId: "system",
          text: systemText,
          createdAt: "Earlier",
          isMine: false,
          kind: "text",
        },
      ];
    }
  }

  conversationIdByBookingId[booking.id] = id;
  professionalIdByConv[id] = String(booking.professionalId);
  syncChatLockFromBooking(id, booking.status);
  return conv;
}

export function getBookingStatus(conversationId: string): BookingChatStatus {
  return bookingStatusByConv[conversationId] ?? "Accepted";
}

export function canSendMessage(conversationId: string): boolean {
  return getBookingStatus(conversationId) === "Accepted";
}

/** True when current user is the professional for this booking thread */
export function isProfessionalInConversation(
  conversationId: string,
  currentUserId: string,
): boolean {
  return (
    String(professionalIdByConv[conversationId] ?? "") ===
    String(currentUserId)
  );
}

export function createBookingConversation(input: {
  professionalId: string;
  professionalName: string;
  professionalImage: number;
  professionalVerified?: boolean;
  bookingTitle: string;
  bookingDate: string;
  bookingId?: string;
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
  professionalIdByConv[id] = String(input.professionalId);

  if (input.bookingId) {
    conversationIdByBookingId[input.bookingId] = id;
  }

  messagesByConv[id].push({
    id: `sys-${Date.now()}`,
    conversationId: id,
    senderId: "system",
    text: `Booking request: ${input.bookingTitle}\nDate: ${input.bookingDate}\nWaiting for professional to accept.`,
    createdAt: nowLabel(),
    isMine: false,
    kind: "text",
  });

  return conv;
}

export function acceptBooking(
  conversationId: string,
  professionalName: string,
): ChatMessage {
  bookingStatusByConv[conversationId] = "Accepted";

  const msg: ChatMessage = {
    id: `sys-accept-${Date.now()}`,
    conversationId,
    senderId: "system",
    text: `${professionalName} accepted your booking`,
    createdAt: nowLabel(),
    isMine: false,
    kind: "text",
  };

  pushMessage(conversationId, msg);
  return msg;
}

export function declineBooking(
  conversationId: string,
  professionalName: string,
): ChatMessage {
  bookingStatusByConv[conversationId] = "Declined";

  const msg: ChatMessage = {
    id: `sys-decline-${Date.now()}`,
    conversationId,
    senderId: "system",
    text: `${professionalName} declined your booking`,
    createdAt: nowLabel(),
    isMine: false,
    kind: "text",
  };

  pushMessage(conversationId, msg);
  return msg;
}
