/**
 * Cloudinary image upload service
 * ------------------------------
 * Screens / other services import from @/services/cloudinary
 *
 * Setup:
 * 1. Create a Cloudinary account → Dashboard → copy Cloud Name
 * 2. Settings → Upload → Upload presets → Add unsigned preset
 * 3. Put values in .env (see .env.example)
 *
 * Folders on Cloudinary (passed as `folder` on each upload):
 *   doovly/avatars       – profile photos
 *   doovly/portfolio     – portfolio gallery
 *   doovly/verification  – ID / verification docs
 *   doovly/requests      – service request attachments
 *   doovly/chat          – chat media
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

/** Allowed Cloudinary folder paths for this app */
export type UploadFolder =
  | "doovly/avatars"
  | "doovly/portfolio"
  | "doovly/verification"
  | "doovly/requests"
  | "doovly/chat";

export const UPLOAD_FOLDERS = {
  avatars: "doovly/avatars",
  portfolio: "doovly/portfolio",
  verification: "doovly/verification",
  requests: "doovly/requests",
  chat: "doovly/chat",
} as const satisfies Record<string, UploadFolder>;

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

function assertConfig() {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env",
    );
  }
}

/**
 * Upload a local image URI (from expo-image-picker) to Cloudinary.
 * Returns the secure CDN URL to store in your DB / mock data.
 */
export async function uploadImage(
  localUri: string,
  folder: UploadFolder = UPLOAD_FOLDERS.avatars,
): Promise<string> {
  const result = await uploadImageFull(localUri, folder);
  return result.secure_url;
}

/**
 * Same as uploadImage but returns full Cloudinary response metadata.
 */
export async function uploadImageFull(
  localUri: string,
  folder: UploadFolder = UPLOAD_FOLDERS.avatars,
): Promise<CloudinaryUploadResult> {
  assertConfig();

  const ext = localUri.split(".").pop()?.toLowerCase() || "jpg";
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : "image/jpeg";

  const form = new FormData();
  form.append("file", {
    uri: localUri,
    type: mime,
    name: `upload.${ext === "png" || ext === "webp" ? ext : "jpg"}`,
  } as unknown as Blob);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Cloudinary upload failed (${res.status})`);
  }

  const data = (await res.json()) as CloudinaryUploadResult;
  return data;
}

/**
 * Upload multiple local URIs. Continues on individual failures and returns
 * only successful URLs (order matches successful inputs).
 */
export async function uploadImages(
  localUris: string[],
  folder: UploadFolder = UPLOAD_FOLDERS.portfolio,
): Promise<string[]> {
  const results = await Promise.allSettled(
    localUris.map((uri) => uploadImage(uri, folder)),
  );
  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);
}

/** Whether Cloudinary env vars are present (useful for UI hints). */
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}
