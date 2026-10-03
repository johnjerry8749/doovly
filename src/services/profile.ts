/**
 * Profile & verification service
 * -----------------------------
 * Screens import ONLY from here.
 *
 * NOW  → Supabase auth user + profiles (+ professionals when present)
 * Fallback → mock data if offline / not logged in
 *
 * Do not change function names when adding the backend — only the insides.
 */

import { supabase } from "@/lib/supabase";
import {
  getProfessionalById,
} from "@/services/professionals";
import {
  getLoggedInProfessionalId,
} from "@/services/savedProviders";
import { PROFESSIONALS } from "@/data/professionals";
import { uploadImage, UPLOAD_FOLDERS } from "@/services/cloudinary";

// =====================================================
// TYPES
// =====================================================

export type ProfileEditData = {
  id: string;
  name: string;
  phone: string;
  email: string;
  profession: string;
  bio: string;
  city: string;
  image: number | { uri: string };
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

// =====================================================
// MOCK OVERRIDES (fallback only)
// =====================================================

let mockPhone = "+234 810 123 4567";
let mockEmail = "john.chukwuemeka@email.com";
let mockBio =
  "Experienced plumber with 8+ years fixing residential and commercial systems across Lagos.";

let verificationState: VerificationState = {
  overall: "not_verified",
  governmentId: "pending",
  selfie: "pending",
  certificate: "pending",
};

// =====================================================
// PROFILE
// =====================================================

/**
 * Profile data for Edit Profile screen.
 * Prefers Supabase auth user + profiles row.
 * Falls back to mock professional if needed.
 */
export async function getProfileForEdit(): Promise<ProfileEditData | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id, full_name, phone, email, avatar_url, city, role",
        )
        .eq("id", user.id)
        .maybeSingle();

      let profession = "";
      let bio = "";
      let verified = false;
      let city = profile?.city ?? "";

      const { data: pro } = await supabase
        .from("professionals")
        .select("profession, bio, city, is_verified, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pro) {
        profession = pro.profession ?? "";
        bio = pro.bio ?? "";
        verified = !!pro.is_verified;
        if (pro.city) city = pro.city;
      }

      const avatar =
        profile?.avatar_url || pro?.avatar_url
          ? { uri: (profile?.avatar_url || pro?.avatar_url) as string }
          : require("@/assets/images/icon.png");

      return {
        id: user.id,
        name:
          profile?.full_name ||
          (user.user_metadata?.full_name as string) ||
          "",
        phone: profile?.phone || user.phone || "",
        email: profile?.email || user.email || "",
        profession,
        bio,
        city,
        image: avatar,
        verified,
      };
    }
  } catch (e) {
    console.warn("getProfileForEdit Supabase error, using mock:", e);
  }

  // Fallback: mock logged-in professional
  const proId = getLoggedInProfessionalId();
  if (!proId) return null;

  const pro = getProfessionalById(proId);
  if (!pro) return null;

  return {
    id: pro.id,
    name: pro.name,
    phone: mockPhone,
    email: mockEmail,
    profession: pro.profession,
    bio: pro.bio ?? mockBio,
    city: pro.city,
    image: pro.image,
    verified: pro.verified,
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

/**
 * Update profile.
 * Writes to Supabase profiles (+ professionals when present).
 * Falls back to mock mutation if not logged in via Supabase.
 */
export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: input.name.trim(),
          phone: input.phone.trim() || null,
          email: input.email.trim() || null,
          city: input.city.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        return { ok: false, error: profileError.message };
      }

      // Update professionals row if this user is a professional
      const { data: existingPro } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingPro) {
        await supabase
          .from("professionals")
          .update({
            profession: input.profession.trim() || undefined,
            bio: input.bio.trim() || null,
            city: input.city.trim() || undefined,
            phone: input.phone.trim() || null,
            email: input.email.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }

      // Keep auth email in sync when changed
      if (
        input.email.trim() &&
        input.email.trim() !== (user.email ?? "")
      ) {
        await supabase.auth.updateUser({
          email: input.email.trim(),
          data: { full_name: input.name.trim() },
        });
      } else {
        await supabase.auth.updateUser({
          data: { full_name: input.name.trim() },
        });
      }

      return { ok: true };
    }
  } catch (e) {
    console.warn("updateProfile Supabase error:", e);
  }

  // Fallback mock path
  await new Promise((r) => setTimeout(r, 200));

  const proId = getLoggedInProfessionalId();
  if (!proId) return { ok: false, error: "Not logged in" };

  const pro = PROFESSIONALS.find((p) => p.id === String(proId));
  if (!pro) return { ok: false, error: "Profile not found" };

  pro.name = input.name.trim() || pro.name;
  pro.profession = input.profession.trim() || pro.profession;
  pro.city = input.city.trim() || pro.city;
  pro.bio = input.bio.trim() || pro.bio;
  mockPhone = input.phone.trim() || mockPhone;
  mockEmail = input.email.trim() || mockEmail;
  mockBio = input.bio.trim() || mockBio;

  return { ok: true };
}

/**
 * Upload avatar local URI to Cloudinary, then save URL on profiles
 * (+ professionals.avatar_url when present).
 */
export async function updateAvatar(
  localUri: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const url = await uploadImage(localUri, UPLOAD_FOLDERS.avatars);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Not logged in" };
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    // Keep professional avatar in sync when the user is a pro
    await supabase
      .from("professionals")
      .update({
        avatar_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    return { ok: true, url };
  } catch (e) {
    console.warn("updateAvatar error:", e);
    const message =
      e instanceof Error ? e.message : "Could not upload photo.";
    return { ok: false, error: message };
  }
}

// =====================================================
// VERIFICATION
// =====================================================

export function getVerificationStatus(): VerificationState {
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

  return { ...verificationState };
}

export async function uploadVerificationStep(
  step: "governmentId" | "selfie" | "certificate",
): Promise<VerificationState> {
  await new Promise((r) => setTimeout(r, 600));
  verificationState = {
    ...verificationState,
    [step]: "uploaded",
  };
  return { ...verificationState };
}

export async function submitVerification(): Promise<VerificationState> {
  await new Promise((r) => setTimeout(r, 500));

  if (
    verificationState.governmentId === "pending" ||
    verificationState.selfie === "pending"
  ) {
    return { ...verificationState };
  }

  verificationState = {
    ...verificationState,
    overall: "under_review",
  };
  return { ...verificationState };
}
