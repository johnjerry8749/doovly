/**
 * Profile & verification — Supabase only.
 */

import { supabase } from "@/lib/supabase";
import {
  loadSessionUser,
  getCachedSessionUser,
} from "@/lib/session";
import {
  getProfessionalById,
  ensureProfessionalsLoaded,
  invalidateProfessionalsCache,
} from "@/services/professionals";
import { getLoggedInProfessionalId } from "@/services/savedProviders";

const FALLBACK_IMG = require("@/assets/profile_1.jpg") as number;

export type ProfileEditData = {
  id: string;
  name: string;
  phone: string;
  email: string;
  profession: string;
  bio: string;
  city: string;
  image: number;
  verified: boolean;
};

export type VerificationStepStatus =
  | "pending"
  | "uploaded"
  | "approved"
  | "rejected";

export type VerificationState = {
  overall: "not_verified" | "under_review" | "verified" | "rejected";
  governmentId: VerificationStepStatus;
  selfie: VerificationStepStatus;
  certificate: VerificationStepStatus;
};

let verificationCache: VerificationState | null = null;

export function getProfileForEdit(): ProfileEditData | null {
  const s = getCachedSessionUser();
  if (!s) return null;

  const proId = getLoggedInProfessionalId() ?? s.professionalId;
  const pro = proId ? getProfessionalById(proId) : undefined;

  if (pro) {
    return {
      id: pro.id,
      name: pro.name || s.fullName || "",
      phone: (pro as { phone?: string }).phone ?? "",
      email: (pro as { email?: string }).email ?? s.email ?? "",
      profession: pro.profession ?? "",
      bio: pro.bio ?? "",
      city: pro.city ?? "",
      image: (pro.image as number) ?? FALLBACK_IMG,
      verified: pro.verified,
    };
  }

  return {
    id: s.publicId,
    name: s.fullName ?? "",
    phone: "",
    email: s.email ?? "",
    profession: "",
    bio: "",
    city: "",
    image: FALLBACK_IMG,
    verified: s.verified,
  };
}

export type ProfileUpdateInput = {
  name: string;
  phone: string;
  email: string;
  profession: string;
  bio: string;
  city: string;
};

export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await loadSessionUser(true);
  if (!s) return { ok: false, error: "Not logged in" };

  const name = input.name.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();
  const profession = input.profession.trim();
  const bio = input.bio.trim();
  const city = input.city.trim();

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({
      full_name: name || undefined,
      phone: phone || null,
      email: email || null,
      city: city || null,
    })
    .eq("id", s.uuid);

  if (profileErr) {
    return { ok: false, error: profileErr.message };
  }

  const refreshed = await loadSessionUser(true);
  const proUuid = refreshed?.professionalUuid ?? s.professionalUuid;

  if (proUuid) {
    const { error: proErr } = await supabase
      .from("professionals")
      .update({
        profession: profession || undefined,
        bio: bio || null,
        city: city || null,
        email: email || null,
        phone: phone || null,
      })
      .eq("id", proUuid);

    if (proErr) {
      return { ok: false, error: proErr.message };
    }
  }

  invalidateProfessionalsCache();
  await ensureProfessionalsLoaded();
  await loadSessionUser(true);

  return { ok: true };
}

function mapAppStatus(
  status: string | null | undefined,
): VerificationState["overall"] {
  switch (status) {
    case "verified":
      return "verified";
    case "rejected":
      return "rejected";
    case "pending":
      return "under_review";
    default:
      return "not_verified";
  }
}

function docStep(
  docs: { doc_type?: string; title?: string; uploaded?: boolean }[],
  key: string,
): VerificationStepStatus {
  const d = docs.find(
    (x) =>
      (x.title ?? "").toLowerCase().includes(key) ||
      (x.doc_type ?? "").toLowerCase().includes(key),
  );
  if (!d) return "pending";
  return d.uploaded ? "uploaded" : "pending";
}

export async function fetchVerificationStatus(): Promise<VerificationState> {
  const s = await loadSessionUser();
  if (!s?.professionalUuid) {
    verificationCache = {
      overall: "not_verified",
      governmentId: "pending",
      selfie: "pending",
      certificate: "pending",
    };
    return verificationCache;
  }

  if (s.verified) {
    verificationCache = {
      overall: "verified",
      governmentId: "approved",
      selfie: "approved",
      certificate: "approved",
    };
    return verificationCache;
  }

  const { data: app } = await supabase
    .from("verification_applications")
    .select("id, status")
    .eq("professional_id", s.professionalUuid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!app) {
    verificationCache = {
      overall: "not_verified",
      governmentId: "pending",
      selfie: "pending",
      certificate: "pending",
    };
    return verificationCache;
  }

  const { data: docs } = await supabase
    .from("verification_documents")
    .select("title, doc_type, uploaded")
    .eq("application_id", app.id);

  const list = docs ?? [];
  verificationCache = {
    overall: mapAppStatus(app.status),
    governmentId:
      app.status === "verified"
        ? "approved"
        : app.status === "rejected"
          ? "rejected"
          : docStep(list, "government") === "uploaded" ||
              docStep(list, "id") === "uploaded"
            ? "uploaded"
            : "pending",
    selfie:
      app.status === "verified"
        ? "approved"
        : app.status === "rejected"
          ? "rejected"
          : docStep(list, "selfie") === "uploaded"
            ? "uploaded"
            : "pending",
    certificate:
      app.status === "verified"
        ? "approved"
        : app.status === "rejected"
          ? "rejected"
          : docStep(list, "cert") === "uploaded"
            ? "uploaded"
            : "pending",
  };
  return verificationCache;
}

export function getVerificationStatus(): VerificationState {
  if (verificationCache) return { ...verificationCache };
  const proId = getLoggedInProfessionalId();
  const pro = proId ? getProfessionalById(proId) : undefined;
  if (pro?.verified) {
    return {
      overall: "verified",
      governmentId: "approved",
      selfie: "approved",
      certificate: "approved",
    };
  }
  return {
    overall: "not_verified",
    governmentId: "pending",
    selfie: "pending",
    certificate: "pending",
  };
}

const STEP_TITLE: Record<"governmentId" | "selfie" | "certificate", string> = {
  governmentId: "Government ID",
  selfie: "Selfie",
  certificate: "Certificate",
};

export async function uploadVerificationStep(
  step: "governmentId" | "selfie" | "certificate",
): Promise<VerificationState> {
  const s = await loadSessionUser();
  if (!s?.professionalUuid) {
    throw new Error("Professional profile required");
  }

  let appId: string | null = null;
  const { data: existing } = await supabase
    .from("verification_applications")
    .select("id, status")
    .eq("professional_id", s.professionalUuid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    appId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from("verification_applications")
      .insert({
        professional_id: s.professionalUuid,
        user_id: s.uuid,
        status: "pending",
        email: s.email,
      })
      .select("id")
      .single();
    if (error) throw error;
    appId = created.id;
  }

  const title = STEP_TITLE[step];
  const { data: doc } = await supabase
    .from("verification_documents")
    .select("id")
    .eq("application_id", appId)
    .eq("title", title)
    .maybeSingle();

  if (doc) {
    await supabase
      .from("verification_documents")
      .update({ uploaded: true })
      .eq("id", doc.id);
  } else {
    await supabase.from("verification_documents").insert({
      application_id: appId,
      title,
      file_name: `${step}.jpg`,
      doc_type: "image",
      uploaded: true,
    });
  }

  return fetchVerificationStatus();
}

export async function submitVerification(): Promise<VerificationState> {
  const s = await loadSessionUser();
  if (!s?.professionalUuid) throw new Error("Professional profile required");

  const { data: existing } = await supabase
    .from("verification_applications")
    .select("id")
    .eq("professional_id", s.professionalUuid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("verification_applications")
      .update({
        status: "pending",
        submitted_on: new Date().toISOString().slice(0, 10),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("verification_applications").insert({
      professional_id: s.professionalUuid,
      user_id: s.uuid,
      status: "pending",
      submitted_on: new Date().toISOString().slice(0, 10),
      email: s.email,
    });
  }

  return fetchVerificationStatus();
}
