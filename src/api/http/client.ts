/**
 * HTTP client dùng chung cho backend thật (NestJS, prefix api/v1).
 *
 * Dùng `fetch` thay vì thêm axios — repo chưa có HTTP lib nào và nhu cầu hiện
 * tại (header Bearer, retry sau refresh, chuẩn hoá lỗi) không cần tới axios.
 */
import { API_BASE_URL } from "../../config";
import { ApiError } from "./errors";
import { withRefreshLock } from "./refreshLock";

export { ApiError };

const ACCESS_TOKEN_KEY = "smartfnb_access_token";
const REFRESH_TOKEN_KEY = "smartfnb_refresh_token";

/**
 * Cả access lẫn refresh token nằm trong localStorage để mọi tab của cùng trình duyệt thấy token
 * mới nhất: một tab refresh xong thì tab khác đọc lại là có token mới (xem `refreshSession`).
 * Luôn đọc từ storage, không cache trong biến, vì tab khác có thể vừa ghi đè.
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return memoryAccessToken;
  }
}

/** Dự phòng khi storage bị chặn (chế độ riêng tư): phiên vẫn chạy trong tab hiện tại. */
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return memoryRefreshToken;
  }
}

export function setTokens(access: string, refresh: string): void {
  memoryAccessToken = access;
  memoryRefreshToken = refresh;
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  } catch {
    // Storage bị chặn — phiên vẫn chạy được tới khi đóng tab.
  }
}

export function clearTokens(): void {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
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

/** Gọi khi một lời gọi trả 401 mà không cứu được bằng refresh (cả real lẫn mock dùng chung). */
export function notifySessionExpired(): void {
  clearTokens();
  onSessionExpired?.();
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

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

/** Gọi /auth/refresh bằng refresh token mới nhất trong storage, rồi ghi cặp token mới. */
async function callRefreshEndpoint<T extends RefreshResult>(): Promise<T> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError(401, "Phiên đăng nhập đã hết hạn");

  const res = await send("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }, null);
  const body = await parseBody(res);
  if (!res.ok) throw toApiError(res.status, body);

  const data = body as T;
  setTokens(data.accessToken, data.refreshToken);
  return data;
}

/**
 * Chỉ một lượt refresh chạy tại một thời điểm.
 *
 * - Trong một tab: nhiều request cùng dính 401 await chung một promise (`refreshInFlight`).
 * - Giữa nhiều tab: `withRefreshLock` xếp hàng. Tab chờ xong sẽ đọc lại access token trong
 *   storage; nếu khác token đã làm nó dính 401 (`staleAccessToken`) nghĩa là tab khác đã refresh
 *   rồi — dùng luôn token mới, KHÔNG gọi refresh lần nữa.
 */
let refreshInFlight: Promise<string> | null = null;

export function refreshSession(staleAccessToken: string | null = null): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(async () => {
      const current = getAccessToken();
      if (staleAccessToken && current && current !== staleAccessToken) return current;
      return (await callRefreshEndpoint()).accessToken;
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Khôi phục phiên sau khi tải lại trang: refresh dưới cùng khoá với các tab khác, trả về toàn bộ
 * payload (gồm user) để lớp auth dựng lại người dùng. Hai tab F5 cùng lúc vẫn không đá nhau ra.
 */
export function refreshForRestore<T extends RefreshResult>(): Promise<T> {
  return withRefreshLock(() => callRefreshEndpoint<T>());
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** true = không gắn Bearer và không thử refresh (login, refresh, logout). */
  anonymous?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await requestOnce<T>(path, options);
  } catch (err) {
    // Gắn phương thức HTTP vào lỗi để lớp báo lỗi biết đây là đọc (GET) hay ghi; `errors.ts` quyết định nút Thử lại theo đó.
    if (err instanceof ApiError && err.method === undefined) err.method = options.method ?? "GET";
    throw err;
  }
}

async function requestOnce<T>(path: string, options: RequestOptions): Promise<T> {
  const { method = "GET", body, anonymous = false } = options;
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);

  const token = anonymous ? null : getAccessToken();
  let res = await send(path, init, token);

  if (res.status === 401 && !anonymous) {
    let fresh: string;
    try {
      fresh = await refreshSession(token);
    } catch (err) {
      // Mất mạng giữa chừng không phải là hết phiên — để lỗi mạng đi tiếp.
      if (err instanceof ApiError && err.status === 0) throw err;
      notifySessionExpired();
      throw new ApiError(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
    res = await send(path, init, fresh);
  }

  const parsed = await parseBody(res);
  if (!res.ok) throw toApiError(res.status, parsed);
  return parsed as T;
}
