
/**
 * Profile & verification service
 * ------------------------------
 * Screens import ONLY from this service.
 *
 * DATA SOURCE:
 *   Supabase only
 *
 * AVATAR FLOW:
 *   Expo Image Picker
 *        ↓
 *   Cloudinary
 *        ↓
 *   secure_url
 *        ↓
 *   profiles.avatar_url
 *        ↓
 *   professionals.avatar_url
 *
 * IMPORTANT:
 *   - Real authenticated Supabase user only
 */

import { supabase } from "@/lib/supabase";
import {
  uploadImage,
  UPLOAD_FOLDERS,
} from "@/services/cloudinary/cloudinary";

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

export type ProfileUpdateInput = {
  name: string;
  phone: string;
  email: string;
  profession: string;
  bio: string;
  city: string;
};

export type VerificationStepStatus =
  | "pending"
  | "uploaded"
  | "approved"
  | "rejected";

export type VerificationState = {
  overall:
    | "not_verified"
    | "under_review"
    | "verified"
    | "rejected";

  governmentId: VerificationStepStatus;
  selfie: VerificationStepStatus;
  certificate: VerificationStepStatus;
};

// =====================================================
// PROFILE
// =====================================================

/**
 * Get the currently authenticated user's profile.
 *
 * Data comes from:
 *
 *   profiles
 *   professionals
 *
 * Both records belong to the authenticated Supabase user.
 */
export async function getProfileForEdit(): Promise<
  ProfileEditData | null
> {
  try {
    // -------------------------------------------------
    // Get authenticated user
    // -------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error(
        "getProfileForEdit auth error:",
        authError.message,
      );

      return null;
    }

    if (!user) {
      console.warn(
        "getProfileForEdit: no authenticated user.",
      );

      return null;
    }

    // -------------------------------------------------
    // Get profile
    // -------------------------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          phone,
          email,
          avatar_url,
          city,
          role
        `,
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "getProfileForEdit profile error:",
        profileError.message,
      );

      return null;
    }

    // -------------------------------------------------
    // Get professional
    // -------------------------------------------------

    const {
      data: professional,
      error: professionalError,
    } = await supabase
      .from("professionals")
      .select(
        `
          id,
          user_id,
          profession,
          bio,
          city,
          is_verified,
          avatar_url
        `,
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (professionalError) {
      console.error(
        "getProfileForEdit professional error:",
        professionalError.message,
      );

      return null;
    }

    // -------------------------------------------------
    // Avatar
    // -------------------------------------------------

    const avatarUrl =
      profile?.avatar_url ||
      professional?.avatar_url ||
      "";

    const image = avatarUrl
      ? { uri: avatarUrl }
      : require("@/assets/images/icon.png");

    // -------------------------------------------------
    // Return real Supabase data
    // -------------------------------------------------

    return {
      id: user.id,

      name:
        profile?.full_name ||
        (user.user_metadata?.full_name as string) ||
        "",

      phone:
        profile?.phone ||
        user.phone ||
        "",

      email:
        profile?.email ||
        user.email ||
        "",

      profession:
        professional?.profession ||
        "",

      bio:
        professional?.bio ||
        "",

      city:
        professional?.city ||
        profile?.city ||
        "",

      image,

      verified:
        Boolean(professional?.is_verified),
    };
  } catch (error) {
    console.error(
      "getProfileForEdit error:",
      error,
    );

    return null;
  }
}

// =====================================================
// UPDATE PROFILE
// =====================================================

/**
 * Update the authenticated user's profile.
 *
 * profiles:
 *   - full_name
 *   - phone
 *   - email
 *   - city
 *
 * professionals:
 *   - profession
 *   - bio
 *   - city
 *   - phone
 *   - email
 *
 * auth.users:
 *   - email
 *   - full_name metadata
 */
export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<
  { ok: true } |
  { ok: false; error: string }
> {
  try {
    // -------------------------------------------------
    // Get authenticated user
    // -------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return {
        ok: false,
        error: authError.message,
      };
    }

    if (!user) {
      return {
        ok: false,
        error: "You are not logged in.",
      };
    }

    // -------------------------------------------------
    // Clean values
    // -------------------------------------------------

    const name =
      input.name.trim();

    const phone =
      input.phone.trim();

    const email =
      input.email.trim();

    const profession =
      input.profession.trim();

    const bio =
      input.bio.trim();

    const city =
      input.city.trim();

    const updatedAt =
      new Date().toISOString();

    // -------------------------------------------------
    // Validate required name
    // -------------------------------------------------

    if (!name) {
      return {
        ok: false,
        error: "Full name is required.",
      };
    }

    // -------------------------------------------------
    // Update profiles
    // -------------------------------------------------

    const {
      error: profileError,
    } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        phone: phone || null,
        email: email || null,
        city: city || null,
        updated_at: updatedAt,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error(
        "updateProfile profiles error:",
        profileError.message,
      );

      return {
        ok: false,
        error: profileError.message,
      };
    }

    // -------------------------------------------------
    // Find professional
    // -------------------------------------------------

    const {
      data: professional,
      error: professionalLookupError,
    } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (professionalLookupError) {
      console.error(
        "updateProfile professional lookup error:",
        professionalLookupError.message,
      );

      return {
        ok: false,
        error:
          professionalLookupError.message,
      };
    }

    if (!professional) {
      return {
        ok: false,
        error:
          "Professional profile was not found.",
      };
    }

    // -------------------------------------------------
    // Update professional
    // -------------------------------------------------

    const {
      error: professionalError,
    } = await supabase
      .from("professionals")
      .update({
        profession: profession || null,
        bio: bio || null,
        city: city || null,
        phone: phone || null,
        email: email || null,
        updated_at: updatedAt,
      })
      .eq("user_id", user.id);

    if (professionalError) {
      console.error(
        "updateProfile professionals error:",
        professionalError.message,
      );

      return {
        ok: false,
        error: professionalError.message,
      };
    }

    // -------------------------------------------------
    // Update Supabase Auth user
    // -------------------------------------------------

    const emailChanged =
      Boolean(email) &&
      email !== (user.email ?? "");

    const {
      error: authUpdateError,
    } = await supabase.auth.updateUser({
      ...(emailChanged
        ? { email }
        : {}),

      data: {
        full_name: name,
      },
    });

    if (authUpdateError) {
      console.error(
        "updateProfile auth error:",
        authUpdateError.message,
      );

      return {
        ok: false,
        error: authUpdateError.message,
      };
    }

    return {
      ok: true,
    };
  } catch (error) {
    console.error(
      "updateProfile error:",
      error,
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not update profile.",
    };
  }
}

// =====================================================
// AVATAR
// =====================================================

/**
 * Upload profile avatar to Cloudinary and save the
 * returned secure URL in Supabase.
 *
 * Cloudinary folder:
 *   doovly/avatars
 *
 * Supabase:
 *   profiles.avatar_url
 *   professionals.avatar_url
 */
export async function updateAvatar(
  localUri: string,
): Promise<
  { ok: true; url: string } |
  { ok: false; error: string }
> {
  try {
    // -------------------------------------------------
    // Validate image
    // -------------------------------------------------

    if (!localUri?.trim()) {
      return {
        ok: false,
        error: "No image selected.",
      };
    }

    // -------------------------------------------------
    // Get authenticated user
    // -------------------------------------------------

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return {
        ok: false,
        error: authError.message,
      };
    }

    if (!user) {
      return {
        ok: false,
        error: "You are not logged in.",
      };
    }

    // -------------------------------------------------
    // Upload image to Cloudinary
    // -------------------------------------------------

    const url = await uploadImage(
      localUri,
      UPLOAD_FOLDERS.avatars,
    );

    if (!url) {
      return {
        ok: false,
        error:
          "Cloudinary did not return an image URL.",
      };
    }

    const updatedAt =
      new Date().toISOString();

    // -------------------------------------------------
    // Save URL to profiles
    // -------------------------------------------------

    const {
      error: profileError,
    } = await supabase
      .from("profiles")
      .update({
        avatar_url: url,
        updated_at: updatedAt,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error(
        "updateAvatar profiles error:",
        profileError.message,
      );

      return {
        ok: false,
        error: profileError.message,
      };
    }

    // -------------------------------------------------
    // Save URL to professionals
    // -------------------------------------------------

    const {
      data: professional,
      error: professionalLookupError,
    } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (professionalLookupError) {
      console.error(
        "updateAvatar professional lookup error:",
        professionalLookupError.message,
      );

      return {
        ok: false,
        error:
          professionalLookupError.message,
      };
    }

    if (!professional) {
      return {
        ok: false,
        error:
          "Professional profile was not found.",
      };
    }

    const {
      error: professionalError,
    } = await supabase
      .from("professionals")
      .update({
        avatar_url: url,
        updated_at: updatedAt,
      })
      .eq("user_id", user.id);

    if (professionalError) {
      console.error(
        "updateAvatar professionals error:",
        professionalError.message,
      );

      return {
        ok: false,
        error:
          professionalError.message,
      };
    }

    // -------------------------------------------------
    // Success
    // -------------------------------------------------

    return {
      ok: true,
      url,
    };
  } catch (error) {
    console.error(
      "updateAvatar error:",
      error,
    );

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not upload photo.",
    };
  }
}

// =====================================================
// VERIFICATION
// =====================================================

/**
 * Verification status.
 *
 * NOTE:
 * The Edit Profile service no longer uses mock
 * verification data.
 *
 * Until verification columns/table are connected,
 * this returns the real professional verification
 * status from Supabase.
 */
export async function getVerificationStatus(): Promise<VerificationState> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        overall: "not_verified",
        governmentId: "pending",
        selfie: "pending",
        certificate: "pending",
      };
    }

    const {
      data: professional,
      error,
    } = await supabase
      .from("professionals")
      .select("is_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(
        "getVerificationStatus error:",
        error.message,
      );

      return {
        overall: "not_verified",
        governmentId: "pending",
        selfie: "pending",
        certificate: "pending",
      };
    }

    if (professional?.is_verified) {
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
  } catch (error) {
    console.error(
      "getVerificationStatus error:",
      error,
    );

    return {
      overall: "not_verified",
      governmentId: "pending",
      selfie: "pending",
      certificate: "pending",
    };
  }
}

// =====================================================
// VERIFICATION UPLOAD
// =====================================================

/**
 * Verification upload.
 *
 * This currently returns the current real Supabase
 * verification state. Actual government ID/selfie/
 * certificate storage should be connected when the
 * verification tables/columns are ready.
 */
export async function uploadVerificationStep(
  step:
    | "governmentId"
    | "selfie"
    | "certificate",
): Promise<VerificationState> {
  console.warn(
    `uploadVerificationStep("${step}") is not connected to a Supabase verification table yet.`,
  );

  return getVerificationStatus();
}

// =====================================================
// VERIFICATION SUBMISSION
// =====================================================

/**
 * Submit verification.
 *
 * This currently returns the current real Supabase
 * verification state until the verification workflow
 * is connected to its database records.
 */
export async function submitVerification(): Promise<VerificationState> {
  return getVerificationStatus();
}

