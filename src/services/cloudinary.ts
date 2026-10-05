/**
 * Cloudinary image upload service
 * Screens / other services import from @/services/cloudinary
 *
 * Required Expo public environment variables:
 * EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
 * EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
 */

const CLOUD_NAME =
  (process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();

const UPLOAD_PRESET =
  (process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "").trim();

export type UploadFolder =
  | "doovly/avatars"
  | "doovly/portfolio"
  | "doovly/verification"
  | "doovly/requests"
  | "doovly/chat";

export const UPLOAD_FOLDERS: Record<string, UploadFolder> = {
  avatars: "doovly/avatars",
  portfolio: "doovly/portfolio",
  verification: "doovly/verification",
  requests: "doovly/requests",
  chat: "doovly/chat",
};

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

function getMimeType(uri: string) {
  const cleanUri = uri.split("?")[0].split("#")[0];
  const extension = cleanUri.split(".").pop()?.toLowerCase() || "";

  switch (extension) {
    case "png":
      return { type: "image/png", extension: "png" };

    case "webp":
      return { type: "image/webp", extension: "webp" };

    case "heic":
    case "heif":
      // Cloudinary can receive these, but the safest client-side fallback
      // is to keep the real MIME type instead of incorrectly labeling them JPEG.
      return {
        type: extension === "heic" ? "image/heic" : "image/heif",
        extension,
      };

    case "jpg":
    case "jpeg":
      return { type: "image/jpeg", extension: "jpg" };

    default:
      return { type: "image/jpeg", extension: "jpg" };
  }
}

export async function uploadImage(
  localUri: string,
  folder: UploadFolder = UPLOAD_FOLDERS.avatars,
): Promise<string> {
  const result = await uploadImageFull(localUri, folder);
  return result.secure_url;
}

export async function uploadImageFull(
  localUri: string,
  folder: UploadFolder = UPLOAD_FOLDERS.avatars,
): Promise<CloudinaryUploadResult> {
  assertConfig();

  if (!localUri) {
    throw new Error("No image URI was provided.");
  }

  const { type, extension } = getMimeType(localUri);
  const form = new FormData();

  form.append("file", {
    uri: localUri,
    type,
    name: `upload.${extension}`,
  } as any);

  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  const endpoint =
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/image/upload`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: form,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Cloudinary network request failed: ${message}. Check your internet connection, Cloudinary cloud name, and Expo build environment.`,
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    let cloudinaryMessage = responseText;

    try {
      const parsed = JSON.parse(responseText) as {
        error?: { message?: string };
      };

      cloudinaryMessage = parsed.error?.message || responseText;
    } catch {
      // Keep the raw response when Cloudinary did not return JSON.
    }

    throw new Error(
      `Cloudinary upload failed (${response.status}): ${cloudinaryMessage || response.statusText}`,
    );
  }

  let data: CloudinaryUploadResult;

  try {
    data = JSON.parse(responseText) as CloudinaryUploadResult;
  } catch {
    throw new Error("Cloudinary returned an invalid upload response.");
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary returned no secure image URL.");
  }

  return data;
}

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

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}
