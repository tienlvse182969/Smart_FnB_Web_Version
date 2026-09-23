const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const operationalApiEnabled = Boolean(configuredBaseUrl);
const apiBaseUrl = (configuredBaseUrl || "").replace(/\/$/, "");
const TOKEN_KEY = "smartfnb_access_token";

type ApiErrorBody = { message?: string | string[]; error?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function saveAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function hasAccessToken(): boolean {
  return Boolean(sessionStorage.getItem(TOKEN_KEY));
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getApiOrigin(): string | null {
  if (!apiBaseUrl) return null;
  return new URL(apiBaseUrl, window.location.origin).origin;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!operationalApiEnabled)
    throw new Error("VITE_API_BASE_URL chưa được cấu hình");
  const token = sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message || body.error || `Yêu cầu thất bại (${response.status})`;
    if (response.status === 401) clearAccessToken();
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}
