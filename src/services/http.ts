/**
 * HTTP client dùng chung cho backend thật (NestJS, prefix api/v1).
 *
 * Dùng `fetch` thay vì thêm axios — repo chưa có HTTP lib nào và nhu cầu hiện
 * tại (header Bearer, retry sau refresh, chuẩn hoá lỗi) không cần tới axios.
 */
import { API_BASE_URL } from "../config";

/** Lỗi đã chuẩn hoá từ backend — `message` luôn là chuỗi hiển thị được cho người dùng. */
export class ApiError extends Error {
  readonly status: number;
  /** Danh sách lỗi validate khi backend trả `message` dạng mảng. */
  readonly details: string[];
  /** Mã lỗi nghiệp vụ backend gửi kèm, ví dụ "PLAN_LIMIT_REACHED". */
  readonly code: string | null;
  /** Body gốc — dùng khi cần đọc thêm dữ liệu đi kèm lỗi (quota, gói gợi ý…). */
  readonly body: unknown;

  constructor(
    status: number,
    message: string,
    details: string[] = [],
    code: string | null = null,
    body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.code = code;
    this.body = body;
  }
}

const ACCESS_TOKEN_KEY = "smartfnb_access_token";
const REFRESH_TOKEN_KEY = "smartfnb_refresh_token";

/**
 * Access token giữ trong biến module (đọc nhanh, không đụng storage mỗi request).
 * Bản sao trong sessionStorage chỉ để sống qua F5 mà không phải chờ refresh.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  try {
    accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    accessToken = null;
  }
  return accessToken;
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  } catch {
    // Chế độ riêng tư chặn storage — phiên vẫn chạy được tới khi đóng tab.
  }
}

export function clearTokens(): void {
  accessToken = null;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Store đăng ký hàm này để dọn state và đưa về /login khi phiên hết hiệu lực. */
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

function toApiError(status: number, body: unknown): ApiError {
  const payload = body as { message?: unknown; error?: unknown } | null;
  const raw = payload?.message;
  // `error` là tên lỗi HTTP ("Bad Request") hoặc mã nghiệp vụ ("PLAN_LIMIT_REACHED").
  const rawCode = typeof payload?.error === "string" ? payload.error : null;
  const code = rawCode && /^[A-Z][A-Z0-9_]+$/.test(rawCode) ? rawCode : null;

  if (Array.isArray(raw)) {
    const details = raw.map(String);
    return new ApiError(status, details[0] ?? "Yêu cầu không hợp lệ", details, code, body);
  }
  if (typeof raw === "string" && raw.trim()) {
    return new ApiError(status, raw, [], code, body);
  }
  return new ApiError(status, `Máy chủ trả lỗi ${status}`, [], code, body);
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    return await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra backend có đang chạy không.");
  }
}

/**
 * Chỉ một lượt refresh chạy tại một thời điểm. Nhiều request cùng dính 401 sẽ
 * await chung promise này — quan trọng vì backend xoay vòng refresh token,
 * gọi song song sẽ làm token thứ hai thành vô hiệu.
 */
let refreshInFlight: Promise<string> | null = null;

async function runRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError(401, "Phiên đăng nhập đã hết hạn");

  const res = await send("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  }, null);

  const body = await parseBody(res);
  if (!res.ok) throw toApiError(res.status, body);

  const data = body as { accessToken: string; refreshToken: string };
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export function refreshSession(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** true = không gắn Bearer và không thử refresh (login, refresh, logout). */
  anonymous?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, anonymous = false } = options;
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res = await send(path, init, anonymous ? null : getAccessToken());

  if (res.status === 401 && !anonymous) {
    try {
      const fresh = await refreshSession();
      res = await send(path, init, fresh);
    } catch {
      clearTokens();
      onSessionExpired?.();
      throw new ApiError(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  const parsed = await parseBody(res);
  if (!res.ok) throw toApiError(res.status, parsed);
  return parsed as T;
}
