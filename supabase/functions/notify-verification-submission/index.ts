import { withSupabase } from "npm:@supabase/server@^1";
import { createClient } from "npm:@supabase/supabase-js@^2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const body = await req.json().catch(() => ({}));
      const applicationId = String(body.applicationId ?? "").trim();
      if (!applicationId) {
        return Response.json({ error: "applicationId is required." }, { status: 400 });
      }

      const admin = ctx.supabaseAdmin;
      const userId = String(ctx.userClaims?.sub ?? "");
      if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

      const { data: application, error: applicationError } = await admin
        .from("verification_applications")
        .select("id,user_id,professional_id,status,submitted_at,admin_notified_at")
        .eq("id", applicationId)
        .maybeSingle();

      if (applicationError) throw applicationError;
      if (!application) {
        return Response.json({ error: "Verification application not found." }, { status: 404 });
      }
      if (String(application.user_id) !== userId) {
        return Response.json({ error: "You do not own this application." }, { status: 403 });
      }
      if (application.status !== "pending") {
        return Response.json({ error: "Verification application is not pending." }, { status: 409 });
      }

      const { data: docs, error: docsError } = await admin
        .from("verification_documents")
        .select("title,uploaded")
        .eq("application_id", applicationId);

      if (docsError) throw docsError;

      const hasGovernmentId = (docs ?? []).some(
        (d) => d.uploaded && String(d.title).toLowerCase().includes("government"),
      );
      const hasSelfie = (docs ?? []).some(
        (d) => d.uploaded && String(d.title).toLowerCase().includes("selfie"),
      );

      if (!hasGovernmentId || !hasSelfie) {
        return Response.json(
          { error: "Government ID and Selfie are required before submitting." },
          { status: 400 },
        );
      }

      const { data: claimed, error: claimError } = await admin
        .from("verification_applications")
        .update({
          submitted_at: application.submitted_at ?? new Date().toISOString(),
          admin_notified_at: application.admin_notified_at ?? new Date().toISOString(),
        })
        .eq("id", applicationId)
        .is("admin_notified_at", null)
        .select("id")
        .maybeSingle();

      if (claimError) throw claimError;
      if (!claimed) return Response.json({ ok: true, alreadyNotified: true });

      const [{ data: applicant }, { data: professional }, { data: admins, error: adminsError }] =
        await Promise.all([
          admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
          admin.from("professionals").select("profession,city").eq("id", application.professional_id).maybeSingle(),
          admin.from("profiles").select("id,email,full_name").eq("role", "admin").eq("is_suspended", false),
        ]);

      if (adminsError) throw adminsError;

      const name = String(applicant?.full_name ?? "A user");
      const profession = String(professional?.profession ?? "Professional");
      const city = String(professional?.city ?? "");
      const title = "New Verification Submission";
      const message = city
        ? `${name} submitted verification documents for review (${profession}, ${city}).`
        : `${name} submitted verification documents for review (${profession}).`;
      const link = "/admin/Verification%20Aplications";

      const rows = (admins ?? []).map((adminProfile) => ({
        user_id: adminProfile.id,
        type: "verification",
        title,
        body: message,
        unread: true,
        data: { type: "verification", applicationId, link },
      }));

      if (rows.length) {
        const { error } = await admin.from("notifications").insert(rows);
        if (error) throw error;
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      const from = Deno.env.get("RESEND_FROM_EMAIL");
      const emailErrors: string[] = [];

      if (resendKey && from) {
        for (const adminProfile of admins ?? []) {
          const email = String(adminProfile.email ?? "").trim();
          if (!email) continue;

          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: [email],
              subject: title,
              text: `${message}\n\nOpen Doovly Admin > Verification Applications to review the submitted documents.`,
            }),
          });

          if (!response.ok) {
            emailErrors.push(`Email to ${email}: ${await response.text()}`);
          }
        }
      } else {
        emailErrors.push("RESEND_API_KEY or RESEND_FROM_EMAIL is not configured.");
      }

      return Response.json({
        ok: true,
        alreadyNotified: false,
        adminCount: admins?.length ?? 0,
        emailConfigured: Boolean(resendKey && from),
        emailErrors,
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }),
};
