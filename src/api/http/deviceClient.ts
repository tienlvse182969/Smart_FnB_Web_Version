/**
 * HTTP client của THIẾT BỊ ghép (màn hình gọi số, đặc tả 11.10, BR-45; quyết định 105). Tách hẳn khỏi `client.ts` (phiên người dùng):
 *   - xác thực bằng token thiết bị do chính màn hình giữ, KHÔNG đọc/ghi `smartfnb_access_token`, không refresh, không đăng xuất;
 *   - không gọi `reportApiError` (màn TV không có thông báo nổi): lỗi trả về cho màn tự hiện bằng `describeApiError`.
 * Lỗi cùng lớp `ApiError` như phiên người dùng (status 0 = mất mạng) để dùng chung bảng dịch tiếng Việt.
 */
import { API_BASE_URL } from "../../config";
import { ApiError } from "./errors";
import { parseBody, toApiError } from "./client";

export interface DeviceRequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Token thiết bị (Bearer). Không có = công khai (tạo mã ghép). */
  token?: string | null;
}

export async function deviceRequest<T>(path: string, { method = "GET", body, token = null }: DeviceRequestOptions = {}): Promise<T> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  } catch {
    const err = new ApiError(0, "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
    err.method = method;
    throw err;
  }
  const parsed = await parseBody(res);
  if (!res.ok) {
    const err = toApiError(res.status, parsed);
    err.method = method;
    throw err;
  }
  return parsed as T;
}
