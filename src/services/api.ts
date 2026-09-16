/**
 * Base API client.
 * When you add a backend, set API_URL and implement real fetch here.
 * Screens should NOT call fetch directly — only services/* should.
 */

// TODO: replace with your real API base URL (e.g. https://api.doovly.com)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Generic JSON request helper.
 * Right now unused (mock services), but ready for backend.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      "API_URL not set. Using mock data from src/data instead.",
      0,
    );
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(body || res.statusText, res.status);
  }

  return res.json() as Promise<T>;
}
