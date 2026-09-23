/**
 * Profile & verification service
 * -----------------------------
 * Screens import ONLY from here.
 *
 * NOW  → reads/writes mock data from professionals + in-memory overrides
 * LATER → swap bodies to apiRequest("/me", "/me/verification", etc.)
 *
 * Do not change function names when adding the backend — only the insides.
 */

import {
  getProfessionalById,
  type Professional,
} from "@/services/professionals";
import {
  getLoggedInProfessionalId,
  getCurrentUser,
} from "@/services/savedProviders";
import { PROFESSIONALS } from "@/data/professionals";

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
  image: number;
  verified: boolean;
};

export type VerificationStepStatus = "pending" | "uploaded" | "approved" | "rejected";

export type VerificationState = {
  overall: "not_verified" | "under_review" | "verified" | "rejected";
  governmentId: VerificationStepStatus;
  selfie: VerificationStepStatus;
  certificate: VerificationStepStatus;
};

// =====================================================
// MOCK OVERRIDES (in-memory, reset on reload)
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
 * NOW  → from logged-in professional + mock phone/email/bio
 * LATER → GET /me or GET /professionals/:id
 */
export function getProfileForEdit(): ProfileEditData | null {
  // TODO backend: return apiRequest<ProfileEditData>("/me")
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
    bio: mockBio,
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
 * NOW  → mutates mock data
 * LATER → PATCH /me
 */
export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // TODO backend:
  // return apiRequest("/me", { method: "PATCH", body: JSON.stringify(input) })
  await new Promise((r) => setTimeout(r, 400));

  const proId = getLoggedInProfessionalId();
  if (!proId) return { ok: false, error: "Not logged in" };

  const pro = PROFESSIONALS.find((p) => p.id === String(proId));
  if (!pro) return { ok: false, error: "Profile not found" };

  pro.name = input.name.trim() || pro.name;
  pro.profession = input.profession.trim() || pro.profession;
  pro.city = input.city.trim() || pro.city;
  mockPhone = input.phone.trim() || mockPhone;
  mockEmail = input.email.trim() || mockEmail;
  mockBio = input.bio.trim() || mockBio;

  return { ok: true };
}

// =====================================================
// VERIFICATION
// =====================================================

/**
 * Current verification status.
 * NOW  → in-memory mock
 * LATER → GET /me/verification
 */
export function getVerificationStatus(): VerificationState {
  // TODO backend: return apiRequest<VerificationState>("/me/verification")
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

/**
 * Mark a step as uploaded (mock).
 * LATER → POST /me/verification/:step with file
 */
export async function uploadVerificationStep(
  step: "governmentId" | "selfie" | "certificate",
): Promise<VerificationState> {
  // TODO backend: FormData upload
  await new Promise((r) => setTimeout(r, 600));
  verificationState = {
    ...verificationState,
    [step]: "uploaded",
  };
  return { ...verificationState };
}

/**
 * Submit for review.
 * LATER → POST /me/verification/submit
 */
export async function submitVerification(): Promise<VerificationState> {
  // TODO backend: return apiRequest("/me/verification/submit", { method: "POST" })
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
