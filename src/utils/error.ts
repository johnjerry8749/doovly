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

  if (msg.includes("Invalid login credentials")) {
    return "Wrong Email or password";
  }
  if (
    msg.includes("Email not confirmed") ||
    msg.includes("Phone not confirmed")
  ) {
    return "Please verify your account first";
  }
  if (msg.includes("User already registered") || msg.includes("already been registered")) {
    return "An account with this phone or email already exists";
  }
  if (msg.includes("Network request failed") || msg.includes("Failed to fetch")) {
    return "No internet connection. Please check your network.";
  }
  if (error?.status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (msg.includes("row-level security") || error?.code === "42501") {
    return "You don't have permission to perform this action";
  }
  if (msg.includes("You must be logged in")) {
    return "Please log in to continue";
  }

  return msg || "Something went wrong. Please try again.";
}
