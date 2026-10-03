import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

/**
 * Redirect URI used by Google/Supabase to return to the Doovly app.
 *
 * Because app.json already contains:
 *   "scheme": "doovly"
 */
export const GOOGLE_REDIRECT_URI = makeRedirectUri({
  scheme: "doovly",
  path: "auth/callback",
});

/**
 * Sign in or sign up with Google through Supabase Auth.
 *
 * Supabase creates the account automatically if the Google
 * account does not already exist.
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: GOOGLE_REDIRECT_URI,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Unable to start Google authentication.");
  }

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    GOOGLE_REDIRECT_URI,
  );

  if (result.type !== "success") {
    if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Google sign-in was cancelled.");
    }

    throw new Error("Google sign-in was not completed.");
  }

  const callbackUrl = result.url;

  const parsed = Linking.parse(callbackUrl);

  const code =
    typeof parsed.queryParams?.code === "string"
      ? parsed.queryParams.code
      : null;

  if (!code) {
    const errorDescription =
      typeof parsed.queryParams?.error_description === "string"
        ? parsed.queryParams.error_description
        : null;

    if (errorDescription) {
      throw new Error(
        decodeURIComponent(errorDescription.replace(/\+/g, " ")),
      );
    }

    throw new Error("Google authentication code was not returned.");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (sessionError) {
    throw sessionError;
  }

  if (!sessionData.session || !sessionData.user) {
    throw new Error("Google authentication did not create a session.");
  }

  return sessionData;
}

