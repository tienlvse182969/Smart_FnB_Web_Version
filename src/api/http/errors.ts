/**
 * Lỗi API thống nhất cho cả bản real lẫn mock: cùng một lớp `ApiError`, cùng cách phân loại,
 * cùng một chỗ báo cho người dùng (`reportApiError`).
 *
 *   401 → làm mới phiên, không được thì đăng xuất (xử lý trong client HTTP / mock)
 *   403 → "không đủ quyền"
 *   lỗi hạn mức/gói của BE → thông báo vượt hạn mức
 *   lỗi mạng → thông báo kèm nút thử lại
 */

/** Lỗi đã chuẩn hoá từ backend — `message` luôn là chuỗi hiển thị được cho người dùng. */
export class ApiError extends Error {
  readonly status: number;
  /** Danh sách lỗi validate khi backend trả `message` dạng mảng. */
  readonly details: string[];
  /** Mã lỗi nghiệp vụ backend gửi kèm, ví dụ "PLAN_LIMIT_REACHED". */
  readonly code: string | null;
  /** Body gốc — dùng khi cần đọc thêm dữ liệu đi kèm lỗi (quota, gói gợi ý…). */
  readonly body: unknown;
  /** true sau khi `reportApiError` đã báo cho người dùng — màn hình không báo lại lần nữa. */
  reported = false;

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

export type ApiErrorKind = "network" | "unauthorized" | "forbidden" | "quota" | "validation" | "conflict" | "server";

/** Mã lỗi nghiệp vụ liên quan tới hạn mức/tính năng của gói (BR-08). */
const QUOTA_CODE = /PLAN|QUOTA|LIMIT|FEATURE|SUBSCRIPTION/;

export function isQuotaError(err: unknown): boolean {
  return (err instanceof ApiError && !!err.code && QUOTA_CODE.test(err.code)) || isReadOnlyError(err);
}

/** Câu hiển thị cho mọi lỗi "chế độ chỉ đọc" (BR-09), dù BE có kèm mã hay không. Không lộ câu tiếng Anh thô của BE. */
export const READ_ONLY_TEXT = "Doanh nghiệp đang ở chế độ chỉ đọc (gói hết hạn hoặc tạm ngưng) nên không thể thay đổi. Liên hệ quản trị nền tảng để gia hạn.";

/**
 * Thao tác ghi bị chặn vì gói hết hạn/tạm ngưng. Mock trả mã `SUBSCRIPTION_READ_ONLY`; BE thật hiện trả 403 KHÔNG mã với câu
 * "The business subscription is read-only…" (`branch-access.service.ts:81-83`, api-contract-plan #31) nên nhận diện thêm theo câu đó.
 */
export function isReadOnlyError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && (err.code === "SUBSCRIPTION_READ_ONLY" || /subscription is read-only/i.test(err.message));
}

/**
 * Mã web gắn cho token đặt mật khẩu không dùng được (sai, hết hạn, đã dùng). BE trả 401 chung cho cả ba; status 401 được giữ
 * nguyên để log trung thực, còn mã này báo cho web biết đây KHÔNG phải hết phiên đăng nhập.
 */
export const SETUP_TOKEN_INVALID = "SETUP_TOKEN_INVALID";

export function classifyApiError(err: unknown): ApiErrorKind {
  if (!(err instanceof ApiError)) return "server";
  if (err.status === 0) return "network";
  if (isQuotaError(err)) return "quota";
  if (err.code === SETUP_TOKEN_INVALID) return "validation";
  if (err.status === 401) return "unauthorized";
  if (err.status === 403) return "forbidden";
  if (err.status === 409) return "conflict";
  if (err.status >= 400 && err.status < 500) return "validation";
  return "server";
}

/** Câu thông báo cho các loại lỗi dùng chung. Loại khác → dùng `err.message` của BE. */
export function describeApiError(err: unknown): string {
  const kind = classifyApiError(err);
  switch (kind) {
    case "network":
      return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
    case "unauthorized":
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case "forbidden":
      return "Bạn không đủ quyền thực hiện thao tác này.";
    case "quota":
      if (isReadOnlyError(err)) return READ_ONLY_TEXT;
      return `Đã vượt hạn mức hoặc gói hiện tại không có tính năng này. ${err instanceof ApiError ? err.message : ""}`.trim();
    default:
      return err instanceof Error ? err.message : "Có lỗi xảy ra";
  }
}

/**
 * Hiện lỗi từ một lời gọi API trong màn hình — trừ khi lớp API đã báo toàn cục (403, hạn mức, mạng, 401), để không
 * có hai thông báo cho cùng một lỗi. `show` thường là `message.error`.
 */
export function showApiError(show: (text: string) => unknown, err: unknown, fallback = "Có lỗi xảy ra"): void {
  if (err instanceof ApiError && err.reported) return;
  show(err instanceof Error && err.message ? err.message : fallback);
}

export interface ApiErrorEvent {
  kind: ApiErrorKind;
  error: ApiError;
  /** Chỉ có với lỗi mạng của thao tác đọc: gọi lại đúng yêu cầu vừa thất bại. */
  retry?: () => Promise<unknown>;
}

type ApiErrorHandler = (event: ApiErrorEvent) => void;

let handler: ApiErrorHandler | null = null;

/** App đăng ký một lần để hiện thông báo (message/notification). */
export function setApiErrorHandler(next: ApiErrorHandler | null): void {
  handler = next;
}

/** Các loại lỗi mà lớp API tự báo; loại còn lại (validate, 409…) để màn hình hiện ngay tại form. */
const GLOBAL_KINDS: ApiErrorKind[] = ["network", "forbidden", "quota", "unauthorized"];

/**
 * Báo một lỗi API cho người dùng, tối đa một lần cho mỗi đối tượng lỗi. Gọi từ `withErrorHandling`
 * (bọc mọi hàm của mọi module) — nên real và mock đi chung một đường.
 */
export function reportApiError(err: unknown, retry?: () => Promise<unknown>): void {
  if (!(err instanceof ApiError) || err.reported) return;
  const kind = classifyApiError(err);
  if (!GLOBAL_KINDS.includes(kind)) return;
  err.reported = true;
  handler?.({ kind, error: err, retry: kind === "network" ? retry : undefined });
}
