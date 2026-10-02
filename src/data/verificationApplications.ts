/**
 * Mock verification applications for admin panel.
 * Swap list/update in services/verificationApplications.ts to apiRequest when backend is ready.
 */

export type VerificationStatus = "Pending" | "Verified" | "Rejected";

export type VerificationDocument = {
  id: string;
  title: string;
  fileName: string;
  type: "pdf" | "image" | "other";
  uploaded: boolean;
};

export type VerificationApplication = {
  id: string;
  name: string;
  profession: string;
  location: string;
  avatar: number | { uri: string };
  status: VerificationStatus;
  submittedOn: string;
  email: string;
  phone: string;
  experience: string;
  documents: VerificationDocument[];
};

const AVATAR_1 = require("@/assets/profile_1.jpg");
const AVATAR_2 = require("@/assets/profile_2.jpg");
const AVATAR_3 = require("@/assets/profile_3.jpg");
const AVATAR_4 = require("@/assets/profile_4.jpg");

const defaultDocs = (prefix: string): VerificationDocument[] => [
  {
    id: `${prefix}-gov`,
    title: "Government ID",
    fileName: "aadhar_card.pdf",
    type: "pdf",
    uploaded: true,
  },
  {
    id: `${prefix}-lic`,
    title: "Medical License",
    fileName: "medical_license.pdf",
    type: "pdf",
    uploaded: true,
  },
  {
    id: `${prefix}-cert`,
    title: "Professional Certificate",
    fileName: "degree_certificate.pdf",
    type: "pdf",
    uploaded: true,
  },
  {
    id: `${prefix}-photo`,
    title: "Profile Photo",
    fileName: "profile_photo.jpg",
    type: "image",
    uploaded: true,
  },
];

let MOCK_APPLICATIONS: VerificationApplication[] = [
  {
    id: "va-1",
    name: "Dr. Aisha Rahman",
    profession: "General Physician",
    location: "Bengaluru, Karnataka",
    avatar: AVATAR_1,
    status: "Pending",
    submittedOn: "Jan 12, 2025",
    email: "aisha.rahman@email.com",
    phone: "+91 98765 43210",
    experience: "5+ Years",
    documents: defaultDocs("va-1"),
  },
  {
    id: "va-2",
    name: "Dr. Arjun Mehta",
    profession: "Orthopedic Surgeon",
    location: "Pune, Maharashtra",
    avatar: AVATAR_2,
    status: "Pending",
    submittedOn: "Jan 10, 2025",
    email: "arjun.mehta@email.com",
    phone: "+91 91234 56789",
    experience: "8+ Years",
    documents: defaultDocs("va-2"),
  },
  {
    id: "va-3",
    name: "Dr. Sophia Lee",
    profession: "Dentist",
    location: "Toronto, ON",
    avatar: AVATAR_3,
    status: "Verified",
    submittedOn: "Jan 8, 2025",
    email: "sophia.lee@email.com",
    phone: "+1 416 555 0192",
    experience: "6+ Years",
    documents: defaultDocs("va-3"),
  },
  {
    id: "va-4",
    name: "Michael Chen",
    profession: "Physiotherapist",
    location: "Vancouver, BC",
    avatar: AVATAR_4,
    status: "Verified",
    submittedOn: "Jan 5, 2025",
    email: "michael.chen@email.com",
    phone: "+1 604 555 0144",
    experience: "4+ Years",
    documents: defaultDocs("va-4"),
  },
  {
    id: "va-5",
    name: "Priya Patel",
    profession: "Nutritionist",
    location: "Calgary, AB",
    avatar: AVATAR_1,
    status: "Verified",
    submittedOn: "Jan 3, 2025",
    email: "priya.patel@email.com",
    phone: "+1 403 555 0188",
    experience: "3+ Years",
    documents: defaultDocs("va-5"),
  },
  {
    id: "va-6",
    name: "James Wilson",
    profession: "Mental Health Counselor",
    location: "Montreal, QC",
    avatar: AVATAR_2,
    status: "Verified",
    submittedOn: "Dec 28, 2024",
    email: "james.wilson@email.com",
    phone: "+1 514 555 0167",
    experience: "7+ Years",
    documents: defaultDocs("va-6"),
  },
  {
    id: "va-7",
    name: "Emily Davis",
    profession: "Dermatologist",
    location: "Ottawa, ON",
    avatar: AVATAR_3,
    status: "Verified",
    submittedOn: "Dec 20, 2024",
    email: "emily.davis@email.com",
    phone: "+1 613 555 0111",
    experience: "9+ Years",
    documents: defaultDocs("va-7"),
  },
  {
    id: "va-8",
    name: "David Okoro",
    profession: "Cardiologist",
    location: "Toronto, ON",
    avatar: AVATAR_4,
    status: "Verified",
    submittedOn: "Dec 15, 2024",
    email: "david.okoro@email.com",
    phone: "+1 647 555 0133",
    experience: "12+ Years",
    documents: defaultDocs("va-8"),
  },
];

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
