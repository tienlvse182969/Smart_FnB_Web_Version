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

/** Lỗi 5xx của BE: không bao giờ hiện câu thô của BE ("Internal server error"…). */
export const SERVER_ERROR_TEXT = "Máy chủ đang gặp sự cố, thử lại sau ít phút.";
export const GENERIC_ERROR_TEXT = "Không thực hiện được yêu cầu. Kiểm tra lại thông tin rồi thử lại.";

/** Có dấu tiếng Việt = câu do web hoặc BE đã Việt hoá, giữ nguyên. */
const HAS_VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** Câu tiếng Anh của BE đã biết → tiếng Việt. Câu không có trong bảng rơi về câu chung theo mã trạng thái (xem `translateBackendMessage`). */
const BACKEND_TEXT: [RegExp, string][] = [
  [/category with this name already exists/i, "Tên danh mục đã tồn tại trong chuỗi."],
  [/menu item with this sku already exists|sku already exists/i, "Mã SKU đã tồn tại trong chuỗi."],
  [/category.*item\(s\)|item\(s\)|still has (menu )?items?/i, "Danh mục còn món nên không xoá được. Chuyển hoặc xoá món trước."],
  [/email, phone,? (or|and) employee code already exists/i, "Email, số điện thoại hoặc mã nhân viên đã tồn tại."],
  [/representative email already belongs/i, "Email người đại diện đã thuộc một tài khoản khác."],
  [/only a pending application/i, "Chỉ hồ sơ đang chờ duyệt mới xử lý được."],
  [/current usage exceeds/i, "Mức đang dùng vượt hạn mức của gói mới."],
  [/already suspended/i, "Doanh nghiệp đã ở trạng thái tạm ngưng."],
  [/not suspended/i, "Doanh nghiệp không ở trạng thái tạm ngưng."],
  [/renew the expired subscription/i, "Gia hạn gói đã hết hạn trước khi kích hoạt lại."],
  [/service plan code already exists/i, "Mã gói đã tồn tại."],
  [/subscription is not active/i, "Gói dịch vụ của doanh nghiệp không còn hiệu lực."],
  [/account limit|plan limit|limit has been reached|exceed/i, "Đã đạt hạn mức của gói dịch vụ."],
  [/printer address is required/i, "Cần nhập địa chỉ máy in."],
  [/pairing code/i, "Mã ghép không đúng, đã hết hạn hoặc đã được dùng."],
  [/already uses this service plan/i, "Doanh nghiệp đang dùng gói này rồi."],
  [/target plan price is (higher|lower)/i, "Hướng đổi gói không khớp với giá gói mới."],
  [/not found/i, "Không tìm thấy dữ liệu cần thao tác (có thể đã bị xoá)."],
  [/already exists|already used|duplicate|in use/i, "Dữ liệu bị trùng hoặc đang được dùng ở nơi khác."],
  [/should not be empty|must be|is required|must contain|invalid/i, "Thông tin nhập chưa hợp lệ. Kiểm tra lại rồi thử lại."],
];

/** Câu tiếng Việt cho lỗi BE không thuộc loại dùng chung (400, 404, 409…). Không bao giờ trả câu tiếng Anh thô. */
export function translateBackendMessage(err: ApiError): string {
  const message = err.message ?? "";
  if (HAS_VIETNAMESE.test(message)) return message;
  const hit = BACKEND_TEXT.find(([re]) => re.test(message));
  if (hit) return hit[1];
  if (err.status === 404) return "Không tìm thấy dữ liệu cần thao tác (có thể đã bị xoá).";
  if (err.status === 409) return "Dữ liệu xung đột với bản ghi đã có. Tải lại rồi thử lại.";
  return GENERIC_ERROR_TEXT;
}

/** Câu thông báo tiếng Việt cho mọi lỗi API (5xx, mạng, 401, 403, hạn mức, còn lại). Không bao giờ hiện tiếng Anh thô. */
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
      return `Đã vượt hạn mức hoặc gói hiện tại không có tính năng này. ${err instanceof ApiError ? translateBackendMessage(err) : ""}`.trim();
    default:
      if (err instanceof ApiError) return err.status >= 500 ? SERVER_ERROR_TEXT : translateBackendMessage(err);
      return err instanceof Error && HAS_VIETNAMESE.test(err.message) ? err.message : "Có lỗi xảy ra. Thử lại sau.";
  }
}

/** Lỗi cùng loại, cùng màn, cùng nội dung trong khoảng này chỉ hiện một thông báo. */
export const ERROR_DEDUPE_MS = 3000;
const lastShown = new Map<string, number>();
const currentRoute = () => (typeof window === "undefined" ? "" : window.location.pathname);

/**
 * Hiện lỗi từ một lời gọi API trong màn hình — trừ khi lớp API đã báo toàn cục (403, hạn mức, mạng, 401), để không
 * có hai thông báo cho cùng một lỗi. `show` thường là `message.error`. Câu hiện ra luôn là tiếng Việt (`describeApiError`);
 * nhiều request song song cùng lỗi chỉ hiện một thông báo (khoá = loại lỗi + màn + nội dung, trong `ERROR_DEDUPE_MS`).
 * `fallback` chỉ dùng khi lỗi không phải `ApiError` và không có câu tiếng Việt nào.
 */
export function showApiError(show: (text: string) => unknown, err: unknown, fallback = "Có lỗi xảy ra"): void {
  if (err instanceof ApiError && err.reported) return;
  const known = err instanceof ApiError || (err instanceof Error && HAS_VIETNAMESE.test(err.message));
  const content = known ? describeApiError(err) : fallback;
  const key = `${classifyApiError(err)}:${currentRoute()}:${content}`;
  const now = Date.now();
  const last = lastShown.get(key);
  if (last !== undefined && now - last < ERROR_DEDUPE_MS) return;
  lastShown.set(key, now);
  show(content);
}

/** Chỉ cho test: xoá bộ nhớ chống trùng. */
export function resetErrorDedupe(): void {
  lastShown.clear();
}

/**
 * Màn tự hiện khối lỗi trong trang (kèm nút Thử lại) nên không cần thông báo nổi trùng cho 403 và mất mạng.
 * Khớp theo đường dẫn hiện tại; các loại lỗi khác (hạn mức, 401) vẫn báo toàn cục.
 */
export const INLINE_ERROR_ROUTES = ["/owner/reports", "/manager/branch-info"];

export interface ApiErrorEvent {
  kind: ApiErrorKind;
  error: ApiError;
  /**
   * Có nút "Thử lại": chỉ với lỗi ĐỌC (list/get/load/find/count) thuộc loại mất mạng hoặc 5xx. Nút không gọi lại request mà làm mới
   * màn đang mở (`requestRefresh` trong store → `RefreshBoundary`). Lỗi ghi, 403, 401, 404, 409 và 4xx khác không có nút.
   */
  canRetry: boolean;
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
export function reportApiError(err: unknown, isRead?: unknown): void {
  if (!(err instanceof ApiError) || err.reported) return;
  const kind = classifyApiError(err);
  const retryable = !!isRead && (kind === "network" || kind === "server");
  // 5xx của thao tác GHI để màn hình tự hiện (toast tại chỗ); 5xx của thao tác ĐỌC được báo toàn cục kèm nút Thử lại.
  if (!GLOBAL_KINDS.includes(kind) && !(kind === "server" && retryable)) return;
  err.reported = true;
  if ((kind === "forbidden" || kind === "network" || kind === "server") && INLINE_ERROR_ROUTES.includes(currentRoute())) return;
  handler?.({ kind, error: err, canRetry: retryable });
}
