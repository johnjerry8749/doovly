import { createClient } from "@supabase/supabase-js";

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
  /*
   * CORS preflight
   */
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  /*
   * Only POST is allowed.
   */
  if (request.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  /*
   * Read and validate request body.
   */
  let email = "";

  try {
    const body = await request.json();

    if (typeof body?.email === "string") {
      email = body.email.trim().toLowerCase();
    }
  } catch {
    return jsonResponse(
      {
        error: "Invalid request body",
      },
      400,
    );
  }

  if (
    !email ||
    email.length > 320 ||
    !isValidEmail(email)
  ) {
    return jsonResponse(
      {
        error: "Enter a valid email address",
      },
      400,
    );
  }

  /*
   * Supabase environment variables.
   *
   * These are available to the Edge Function.
   * NEVER put SUPABASE_SERVICE_ROLE_KEY in the Expo app.
   */
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
      "Password reset function is missing Supabase environment variables.",
    );

    return jsonResponse(
      {
        error: "Password reset is unavailable",
      },
      500,
    );
  }

  /*
   * Admin client.
   *
   * This client is ONLY inside the Edge Function.
   */
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

  /*
   * Public Auth client.
   *
   * Used to request the normal Supabase password
   * reset email.
   */
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

  /*
   * --------------------------------------------------
   * RATE LIMIT
   * --------------------------------------------------
   *
   * 3 attempts per email every 15 minutes.
   *
   * Your existing database function expects:
   *
   * p_email_hash
   * p_limit
   * p_window_seconds
   */
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
      "Password reset rate-limit check failed:",
      rateLimitError.message,
    );

    return jsonResponse(
      {
        error: "Password reset is unavailable",
      },
      500,
    );
  }

  const rateLimit =
    rateLimitData as RateLimitResult | null;

  if (!rateLimit) {
    console.error(
      "Password reset rate-limit returned no data.",
    );

    return jsonResponse(
      {
        error: "Password reset is unavailable",
      },
      500,
    );
  }

  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        status: "rate_limited",
        retry_after_seconds:
          rateLimit.retry_after_seconds ?? 900,
      },
      429,
    );
  }

  /*
   * --------------------------------------------------
   * CHECK WHETHER EMAIL EXISTS IN DOOVLY
   * --------------------------------------------------
   *
   * Your public.profiles table already contains:
   *
   * id
   * email
   * full_name
   * ...
   *
   * We use the service-role client here so the mobile
   * application never gets direct access to this lookup.
   */
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
      "Password reset account lookup failed:",
      profileError.message,
    );

    return jsonResponse(
      {
        error: "Password reset is unavailable",
      },
      500,
    );
  }

  /*
   * Email is not registered in Doovly.
   */
  if (!profile) {
    return jsonResponse({
      status: "not_registered",
    });
  }

  /*
   * --------------------------------------------------
   * SEND PASSWORD RESET EMAIL
   * --------------------------------------------------
   */
  const redirectTo =
    Deno.env.get(
      "PASSWORD_RESET_REDIRECT_URL",
    ) ??
    "doovly://auth/reset-password";

  const {
    error: resetError,
  } =
    await authClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo,
      },
    );

  if (resetError) {
    console.error(
      "Supabase password reset email failed:",
      resetError.message,
    );

    return jsonResponse(
      {
        error: "Could not send the reset email",
      },
      500,
    );
  }

  /*
   * Everything succeeded.
   */
  return jsonResponse({
    status: "sent",
  });
});

