/**
 * Mock verification applications for admin panel.
 * Built from src/data/professionals.ts so names match the rest of the app.
 * Swap list/update in services/verificationApplications.ts to apiRequest when backend is ready.
 */

import { PROFESSIONALS } from "@/data/professionals";

export type VerificationStatus = "Pending" | "Verified" | "Rejected";

export type VerificationDocument = {
  id: string;
  title: string;
  fileName: string;
  type: "pdf" | "image" | "other";
  uploaded: boolean;
  /**
   * Mock preview asset (local require) or remote URL string.
   * Later: set to API-provided file/preview URL.
   */
  preview?: number | { uri: string };
};

export type VerificationApplication = {
  id: string;
  professionalId: string;
  name: string;
  profession: string;
  location: string;
  avatar: number | { uri: string };
  status: VerificationStatus;
  submittedOn: string;
  email: string;
  phone: string;
  documents: VerificationDocument[];
};

const defaultDocs = (
  prefix: string,
  avatar: number | { uri: string },
): VerificationDocument[] => [
  {
    id: `${prefix}-gov`,
    title: "Government ID",
    fileName: "government_id.pdf",
    type: "pdf",
    uploaded: true,
    preview: avatar,
  },
  {
    id: `${prefix}-lic`,
    title: "Professional License",
    fileName: "professional_license.pdf",
    type: "pdf",
    uploaded: true,
    preview: avatar,
  },
  {
    id: `${prefix}-cert`,
    title: "Professional Certificate",
    fileName: "certificate.pdf",
    type: "pdf",
    uploaded: true,
    preview: avatar,
  },
  {
    id: `${prefix}-photo`,
    title: "Profile Photo",
    fileName: "profile_photo.jpg",
    type: "image",
    uploaded: true,
    preview: avatar,
  },
];

function buildFromProfessionals(): VerificationApplication[] {
  return PROFESSIONALS.map((p, index) => {
    const status: VerificationStatus = p.verified ? "Verified" : "Pending";

    const submitted = new Date(2025, 0, 12 - index * 3);
    const submittedOn = submitted.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return {
      id: `va-${p.id}`,
      professionalId: p.id,
      name: p.name,
      profession: p.profession,
      location: p.city,
      avatar: p.image,
      status,
      submittedOn,
      email: p.email,
      phone: p.phone,
      documents: defaultDocs(`va-${p.id}`, p.image),
    };
  });
}

let MOCK_APPLICATIONS: VerificationApplication[] = buildFromProfessionals();

export function getMockVerificationApplications(): VerificationApplication[] {
  return [...MOCK_APPLICATIONS];
}

export function updateMockVerificationStatus(
  id: string,
  status: VerificationStatus,
): VerificationApplication | undefined {
  const idx = MOCK_APPLICATIONS.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  MOCK_APPLICATIONS[idx] = { ...MOCK_APPLICATIONS[idx], status };
  return MOCK_APPLICATIONS[idx];
}

export function bulkUpdateMockVerificationStatus(
  ids: string[],
  status: VerificationStatus,
): void {
  const set = new Set(ids);
  MOCK_APPLICATIONS = MOCK_APPLICATIONS.map((a) =>
    set.has(a.id) ? { ...a, status } : a,
  );
}

export function getVerificationStats(list: VerificationApplication[]) {
  const pending = list.filter((a) => a.status === "Pending").length;
  const verified = list.filter((a) => a.status === "Verified").length;
  const rejected = list.filter((a) => a.status === "Rejected").length;
  return {
    total: list.length,
    pending,
    verified,
    rejected,
  };
}
