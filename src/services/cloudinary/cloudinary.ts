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

  const extension =
    localUri.split(".").pop()?.split("?")[0].toLowerCase() || "jpg";

  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  const fileExtension =
    extension === "png" || extension === "webp"
      ? extension
      : "jpg";

  const formData = new FormData();

  formData.append("file", {
    uri: localUri,
    type: mimeType,
    name: `upload.${fileExtension}`,
  } as unknown as Blob);

  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

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

