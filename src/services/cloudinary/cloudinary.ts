/**
 * Cloudinary image upload service
 * ------------------------------
 * Screens / other services import from @/services/cloudinary/cloudinary
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

import { Platform } from "react-native";

const CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

const UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

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

function getMimeAndName(localUri: string): {
  mimeType: string;
  fileName: string;
} {
  const clean = localUri.split("?")[0] ?? localUri;
  const extension =
    clean.split(".").pop()?.toLowerCase() || "jpg";

  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : extension === "heic" || extension === "heif"
          ? "image/heic"
          : "image/jpeg";

  const fileExtension =
    extension === "png" || extension === "webp"
      ? extension
      : "jpg";

  return {
    mimeType,
    fileName: `upload.${fileExtension}`,
  };
}

/**
 * Build a FormData part that works on React Native / Expo.
 *
 * Avoids "unsupported FormData part" by preferring a real Blob
 * (via fetch on the local file URI). Falls back to the classic
 * RN { uri, type, name } object when needed.
 */
async function appendImageFile(
  formData: FormData,
  localUri: string,
): Promise<void> {
  const { mimeType, fileName } = getMimeAndName(localUri);

  // Prefer real Blob — works with RN's FormData on modern Expo
  try {
    const fileRes = await fetch(localUri);
    const blob = await fileRes.blob();

    // Some RN versions need type forced on the blob
    const typedBlob =
      blob.type && blob.type !== "application/octet-stream"
        ? blob
        : blob.slice(0, blob.size, mimeType);

    formData.append("file", typedBlob, fileName);
    return;
  } catch {
    // Fall through to RN file descriptor
  }

  // Classic React Native FormData file descriptor
  // (required on some Android content:// URIs)
  const uri =
    Platform.OS === "ios" && localUri.startsWith("file://")
      ? localUri
      : localUri;

  formData.append("file", {
    uri,
    type: mimeType,
    name: fileName,
  } as any);
}

/**
 * Upload one local image URI to Cloudinary.
 *
 * Returns the secure Cloudinary URL.
 */
export async function uploadImage(
  localUri: string,
  folder: UploadFolder = UPLOAD_FOLDERS.avatars,
): Promise<string> {
  const result = await uploadImageFull(localUri, folder);
  return result.secure_url;
}

/**
 * Upload one image and return the complete Cloudinary response.
 */
export async function uploadImageFull(
  localUri: string,
  folder: UploadFolder = UPLOAD_FOLDERS.avatars,
): Promise<CloudinaryUploadResult> {
  assertConfig();

  if (!localUri?.trim()) {
    throw new Error("No image URI provided.");
  }

  const formData = new FormData();

  await appendImageFile(formData, localUri);

  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  // Do NOT set Content-Type — fetch must add the multipart boundary
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    throw new Error(
      errorText || `Cloudinary upload failed (${response.status})`,
    );
  }

  const data = (await response.json()) as CloudinaryUploadResult;

  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return data;
}

/**
 * Upload multiple local images.
 *
 * Failed uploads are ignored and only successful URLs are returned.
 */
export async function uploadImages(
  localUris: string[],
  folder: UploadFolder = UPLOAD_FOLDERS.portfolio,
): Promise<string[]> {
  const results = await Promise.allSettled(
    localUris.map((uri) => uploadImage(uri, folder)),
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
}

/**
 * Check whether Cloudinary is configured.
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}
