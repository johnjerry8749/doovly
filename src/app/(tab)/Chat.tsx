import { Redirect } from "expo-router";

/**
 * Placeholder tab screen.
 * Actual chat list lives at /profile/chat (authenticated user messages).
 * Navigation is also intercepted in (tab)/_layout.tsx so the tab button
 * goes straight there.
 */
export default function ChatTab() {
  return <Redirect href="/profile/chat" />;
}
