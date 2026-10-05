/**
 * Shared helper to turn any error into a clean user-facing message.
 * Safe to use with mocks now and with real Supabase/API later.
 */
export function getErrorMessage(error: any): string {
  if (!error) return "Something went wrong. Please try again.";

  const msg =
    (typeof error === "string" ? error : null) ||
    error?.message ||
    error?.error_description ||
    "";

  const lower = String(msg).toLowerCase();

  if (
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("offline") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("aborted") ||
    lower.includes("connection refused") ||
    lower.includes("connection reset") ||
    lower.includes("connection closed")
  ) {
    return "No internet connection. Please check your network and try again.";
  }
  if (msg.includes("Invalid login credentials")) {
    return "Wrong Email or password";
  }
  if (msg.includes("Email not confirmed") || msg.includes("Phone not confirmed")) {
    return "Please verify your account first";
  }
  if (msg.includes("User already registered") || msg.includes("already been registered")) {
    return "An account with this phone or email already exists";
  }
  if (error?.status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (lower.includes("row-level security") || error?.code === "42501") {
    return "You don't have permission to perform this action";
  }
  if (msg.includes("You must be logged in")) {
    return "Please log in to continue";
  }
  if (lower.includes("edge function returned a non-2xx status code") || lower.includes("functionshttperror")) {
    return "Something went wrong while processing your request. Please check your input and try again.";
  }

  return msg || "Something went wrong. Please try again.";
}
