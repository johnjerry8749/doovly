/**
 * Chat / messages service
 * ----------------------
 * Screens import ONLY from here.
 *
 * NOW  → mock in-memory conversations
 * LATER → swap to apiRequest + realtime (Supabase channels / websockets)
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
  /** true = current user */
  isMine: boolean;
};

export type Conversation = {
  id: string;
  participant: ChatParticipant;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

// =====================================================
// MOCK DATA
// =====================================================

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
      text: "Hi Chioma, thank you for connecting. I wanted to follow up on the proposal we discussed.",
      createdAt: "9:30 AM",
      isMine: true,
    },
    {
      id: "m2",
      conversationId: "c1",
      senderId: "2",
      text: "Hi! Thanks for reaching out. I'd love to discuss it further.",
      createdAt: "9:32 AM",
      isMine: false,
    },
    {
      id: "m3",
      conversationId: "c1",
      senderId: CURRENT_USER_ID,
      text: "Great! Are you available for a quick call this week?",
      createdAt: "9:33 AM",
      isMine: true,
    },
    {
      id: "m4",
      conversationId: "c1",
      senderId: "2",
      text: "Yes, Thursday afternoon works for me. How about 2 PM?",
      createdAt: "9:35 AM",
      isMine: false,
    },
    {
      id: "m5",
      conversationId: "c1",
      senderId: CURRENT_USER_ID,
      text: "Perfect, 2 PM on Thursday it is. I'll send a calendar invite.",
      createdAt: "9:36 AM",
      isMine: true,
    },
    {
      id: "m6",
      conversationId: "c1",
      senderId: "2",
      text: "Sounds good! Looking forward to it.",
      createdAt: "9:37 AM",
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

// =====================================================
// API-SHAPED FUNCTIONS
// =====================================================

/** NOW → mock | LATER → GET /conversations */
export function listConversations(): Conversation[] {
  // TODO backend: return apiRequest<Conversation[]>("/conversations")
  return [...conversations];
}

/** NOW → mock | LATER → GET /conversations/:id/messages */
export function getMessages(conversationId: string): ChatMessage[] {
  // TODO backend: return apiRequest(`/conversations/${conversationId}/messages`)
  return [...(messagesByConv[conversationId] ?? [])];
}

/** NOW → mock | LATER → GET /conversations/:id */
export function getConversation(conversationId: string): Conversation | undefined {
  // TODO backend: return apiRequest(`/conversations/${conversationId}`)
  return conversations.find((c) => c.id === conversationId);
}

/** NOW → mock | LATER → POST /conversations/:id/messages */
export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessage> {
  // TODO backend:
  // return apiRequest(`/conversations/${conversationId}/messages`, {
  //   method: "POST",
  //   body: JSON.stringify({ text }),
  // })
  await new Promise((r) => setTimeout(r, 200));

  const msg: ChatMessage = {
    id: `local-${Date.now()}`,
    conversationId,
    senderId: CURRENT_USER_ID,
    text: text.trim(),
    createdAt: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    isMine: true,
  };

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

  return msg;
}

/** Mark conversation as read (mock). */
export function markConversationRead(conversationId: string) {
  // TODO backend: POST /conversations/:id/read
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) conv.unreadCount = 0;
}

// =====================================================
// BOOKING → CHAT HELPERS
// =====================================================

/**
 * Build a prefilled message with booking id + details.
 * NOW  → plain text template
 * LATER → same string, or structured booking card from API
 */
export function formatBookingChatMessage(booking: Booking): string {
  const payment =
    booking.paymentMethod === "pay_on_site"
      ? "Pay on site"
      : booking.paymentStatus === "released"
        ? "Paid (released)"
        : booking.paymentStatus === "held"
          ? "Paid (held in escrow)"
          : booking.paymentStatus;

  return [
    `Hi ${booking.providerName},`,
    ``,
    `This is about my booking:`,
    `• Booking ID: ${booking.id}`,
    `• Service: ${booking.title}`,
    `• Date: ${booking.date}`,
    `• Location: ${booking.location}`,
    `• Status: ${booking.status}`,
    `• Payment: ${payment}`,
    ``,
    `Looking forward to your reply.`,
  ].join("\n");
}

/**
 * Find existing conversation with a professional, or create one (mock).
 * NOW  → in-memory
 * LATER → GET /conversations?participantId= or POST /conversations
 */
export function getOrCreateConversationForProfessional(
  professionalId: string,
): Conversation {
  // TODO backend: return apiRequest(`/conversations?with=${professionalId}`) or create
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
