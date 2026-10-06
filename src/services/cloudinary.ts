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
  const cleanUri = String(uri || "").split("?")[0].split("#")[0];
  const lastSegment = cleanUri.substring(cleanUri.lastIndexOf("/") + 1);
  const dotIndex = lastSegment.lastIndexOf(".");
  const extension =
    dotIndex >= 0
      ? lastSegment.substring(dotIndex + 1).toLowerCase()
      : "";

  if (extension === "png") {
    return { type: "image/png", extension: "png" };
  }

  if (extension === "webp") {
    return { type: "image/webp", extension: "webp" };
  }

  if (extension === "heic" || extension === "heif") {
    return {
      type: extension === "heic" ? "image/heic" : "image/heif",
      extension,
    };
  }

  return { type: "image/jpeg", extension: "jpg" };
}

async function createUploadForm(localUri: string, folder: UploadFolder) {
  const { type, extension } = getMimeType(localUri);

  let imageResponse: Response;

  try {
    imageResponse = await fetch(localUri);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `Could not read the selected image: ${message}`,
    );
  }

  if (!imageResponse.ok) {
    throw new Error(
      `Could not read the selected image (${imageResponse.status}).`,
    );
  }

  const blob = await imageResponse.blob();

  if (!blob || blob.size <= 0) {
    throw new Error("The selected image is empty or could not be read.");
  }

  const form = new FormData();

  // React Native 0.86 / Expo 57 does not reliably support the old
  // { uri, type, name } FormData part. Use a real Blob instead.
  form.append(
    "file",
    blob,
    `upload.${extension}`,
  );

  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  return form;
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

  const form = await createUploadForm(localUri, folder);

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
      `Cloudinary network request failed: ${message}`,
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
      // Keep the raw response.
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
