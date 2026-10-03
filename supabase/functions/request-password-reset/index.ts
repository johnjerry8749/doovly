import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RateLimitResult = {
  allowed: boolean;
  attempts: number;
  retry_after_seconds: number;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    data,
  );

  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (request: Request) => {
  // -----------------------------------------
  // CORS
  // -----------------------------------------
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  // -----------------------------------------
  // ONLY POST REQUESTS
  // -----------------------------------------
  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Something went wrong. Please try again.",
      },
      405,
    );
  }

  // -----------------------------------------
  // READ EMAIL
  // -----------------------------------------
  let email = "";

  try {
    const body = await request.json();

    if (typeof body?.email === "string") {
      email = body.email.trim().toLowerCase();
    }
  } catch {
    return jsonResponse(
      {
        error: "Please enter your email address and try again.",
      },
      400,
    );
  }

  // -----------------------------------------
  // VALIDATE EMAIL
  // -----------------------------------------
  if (
    !email ||
    email.length > 320 ||
    !isValidEmail(email)
  ) {
    return jsonResponse(
      {
        error: "Please enter a valid email address.",
      },
      400,
    );
  }

  // -----------------------------------------
  // SUPABASE ENVIRONMENT VARIABLES
  // -----------------------------------------
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY");

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceRoleKey
  ) {
    console.error(
      "Password reset function is missing required environment variables.",
    );

    return jsonResponse(
      {
        error:
          "We’re having trouble processing your request right now. Please try again later.",
      },
      500,
    );
  }

  // -----------------------------------------
  // ADMIN CLIENT
  // -----------------------------------------
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // -----------------------------------------
  // AUTH CLIENT
  // -----------------------------------------
  const authClient = createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // -----------------------------------------
  // RATE LIMIT
  // 3 attempts per 15 minutes
  // -----------------------------------------
  const emailHash = await sha256(
    `email:${email}`,
  );

  const {
    data: rateLimitData,
    error: rateLimitError,
  } = await adminClient.rpc(
    "consume_password_reset_rate_limit",
    {
      p_email_hash: emailHash,
      p_limit: 3,
      p_window_seconds: 900,
    },
  );

  if (rateLimitError) {
    console.error(
      "Password reset rate-limit error:",
      rateLimitError.message,
    );

    return jsonResponse(
      {
        error:
          "We couldn’t process your request right now. Please try again later.",
      },
      500,
    );
  }

  const rateLimit =
    rateLimitData as RateLimitResult | null;

  if (!rateLimit) {
    console.error(
      "Password reset rate-limit returned no result.",
    );

    return jsonResponse(
      {
        error:
          "We couldn’t process your request right now. Please try again later.",
      },
      500,
    );
  }

  // -----------------------------------------
  // TOO MANY ATTEMPTS
  // -----------------------------------------
  if (!rateLimit.allowed) {
    const retryAfter =
      rateLimit.retry_after_seconds || 900;

    const minutes = Math.ceil(
      retryAfter / 60,
    );

    return jsonResponse(
      {
        status: "rate_limited",
        retry_after_seconds: retryAfter,
        error:
          minutes === 1
            ? "Too many attempts. Please try again in about 1 minute."
            : `Too many attempts. Please try again in about ${minutes} minutes.`,
      },
      429,
    );
  }

  // -----------------------------------------
  // CHECK IF EMAIL IS REGISTERED
  // -----------------------------------------
  const {
    data: profile,
    error: profileError,
  } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Password reset account lookup error:",
      profileError.message,
    );

    return jsonResponse(
      {
        error:
          "We couldn’t check this email right now. Please try again later.",
      },
      500,
    );
  }

  // -----------------------------------------
  // EMAIL NOT REGISTERED
  // -----------------------------------------
  if (!profile) {
    return jsonResponse({
      status: "not_registered",
      error:
        "This email address is not registered with Doovly.",
    });
  }

  // -----------------------------------------
  // SEND PASSWORD RESET OTP
  // -----------------------------------------
  const {
    error: resetError,
  } =
    await authClient.auth.resetPasswordForEmail(
      email,
    );

  if (resetError) {
    // Keep the technical error in server logs
    // but NEVER send it to the user.
    console.error(
      "Supabase password reset email error:",
      resetError.message,
    );

    return jsonResponse(
      {
        error:
          "We couldn’t send your verification code. Please try again in a moment.",
      },
      500,
    );
  }

  // -----------------------------------------
  // SUCCESS
  // -----------------------------------------
  return jsonResponse({
    status: "sent",
    message:
      "A 6-digit verification code has been sent to your email address.",
  });
});
