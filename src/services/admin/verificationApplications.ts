import { supabase } from "@/lib/supabase";

export type VerificationStatus = "Pending" | "Verified" | "Rejected";
export type VerificationDocument = {
  id: string;
  title: string;
  fileName: string;
  type: "image" | "pdf";
  preview?: any;
  fileUrl?: string;
};
export type VerificationApplication = {
  id: string;
  name: string;
  profession: string;
  location: string;
  email: string;
  phone: string;
  status: VerificationStatus;
  submittedOn: string;
  avatar: any;
  documents: VerificationDocument[];
};

let cache: VerificationApplication[] = [];

function map(
  row: any,
  profile?: any,
  professional?: any,
  documents: any[] = [],
): VerificationApplication {
  return {
    id: row.id,
    name: profile?.full_name ?? "Unnamed User",
    profession: professional?.profession ?? "Professional",
    location: profile?.city ?? professional?.city ?? "",
    email: row.email ?? profile?.email ?? "",
    phone: row.phone ?? profile?.phone ?? "",
    status: (row.status ?? "Pending") as VerificationStatus,
    submittedOn: row.submitted_on ?? row.created_at ?? "",
    avatar: profile?.avatar_url ? { uri: profile.avatar_url } : undefined,
    documents: documents.map((d: any) => ({
      id: d.id,
      title: d.title ?? "Document",
      fileName: d.file_name ?? "",
      type: d.doc_type === "image" ? "image" : "pdf",
      preview: d.file_url ? { uri: d.file_url } : undefined,
      fileUrl: d.file_url,
    })),
  };
}

async function loadApplicationRows() {
  const { data, error } = await supabase
    .from("verification_applications")
    .select(
      "id,professional_id,user_id,status,submitted_on,email,phone,created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function loadRelatedRows(applicationRows: any[]) {
  const userIds = [
    ...new Set(
      applicationRows
        .map((row) => row.user_id)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const professionalIds = [
    ...new Set(
      applicationRows
        .map((row) => row.professional_id)
        .filter(Boolean)
        .map(String),
    ),
  ];
  const applicationIds = applicationRows.map((row) => String(row.id));

  const [profilesRes, professionalsRes, documentsRes] = await Promise.all([
    userIds.length
      ? supabase
          .from("profiles")
          .select("id,full_name,email,phone,city,avatar_url")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null } as any),
    professionalIds.length
      ? supabase
          .from("professionals")
          .select("id,profession,city,user_id")
          .in("id", professionalIds)
      : Promise.resolve({ data: [], error: null } as any),
    applicationIds.length
      ? supabase
          .from("verification_documents")
          .select(
            "id,application_id,title,file_name,doc_type,file_url",
          )
          .in("application_id", applicationIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (professionalsRes.error) throw professionalsRes.error;
  if (documentsRes.error) throw documentsRes.error;

  const profiles = new Map(
    (profilesRes.data ?? []).map((row: any) => [String(row.id), row]),
  );
  const professionals = new Map(
    (professionalsRes.data ?? []).map((row: any) => [
      String(row.id),
      row,
    ]),
  );
  const documentsByApplication = new Map<string, any[]>();

  for (const document of documentsRes.data ?? []) {
    const key = String(document.application_id);
    const list = documentsByApplication.get(key) ?? [];
    list.push(document);
    documentsByApplication.set(key, list);
  }

  return { profiles, professionals, documentsByApplication };
}

export async function listVerificationApplicationsAsync() {
  const rows = await loadApplicationRows();
  const related = await loadRelatedRows(rows);

  cache = rows.map((row) =>
    map(
      row,
      related.profiles.get(String(row.user_id)),
      related.professionals.get(String(row.professional_id)),
      related.documentsByApplication.get(String(row.id)) ?? [],
    ),
  );

  return cache;
}

export function listVerificationApplications() {
  return cache;
}

export function getVerificationStats(list = cache) {
  return {
    total: list.length,
    pending: list.filter((x) => x.status === "Pending").length,
    verified: list.filter((x) => x.status === "Verified").length,
    rejected: list.filter((x) => x.status === "Rejected").length,
  };
}

export async function updateVerificationStatus(
  id: string,
  status: VerificationStatus,
) {
  const { data, error } = await supabase
    .from("verification_applications")
    .update({
      status: status.toLowerCase(),
    })
    .eq("id", id)
    .select(
      "id,professional_id,user_id,status,submitted_on,email,phone,created_at",
    )
    .single();

  if (error) throw error;

  if (status === "Verified" && data.professional_id) {
    const { error: professionalError } = await supabase
      .from("professionals")
      .update({ is_verified: true })
      .eq("id", data.professional_id);

    if (professionalError) throw professionalError;
  }

  await listVerificationApplicationsAsync();
  return cache.find((item) => item.id === id) ?? map(data);
}

export async function bulkUpdateVerificationStatus(
  ids: string[],
  status: VerificationStatus,
) {
  if (!ids.length) return;

  const { error } = await supabase
    .from("verification_applications")
    .update({ status: status.toLowerCase() })
    .in("id", ids);

  if (error) throw error;

  if (status === "Verified") {
    const { data: applications, error: applicationsError } = await supabase
      .from("verification_applications")
      .select("professional_id")
      .in("id", ids);

    if (applicationsError) throw applicationsError;

    const professionalIds = [
      ...new Set(
        (applications ?? [])
          .map((row) => row.professional_id)
          .filter(Boolean)
          .map(String),
      ),
    ];

    if (professionalIds.length) {
      const { error: professionalError } = await supabase
        .from("professionals")
        .update({ is_verified: true })
        .in("id", professionalIds);

      if (professionalError) throw professionalError;
    }
  }

  await listVerificationApplicationsAsync();
}
