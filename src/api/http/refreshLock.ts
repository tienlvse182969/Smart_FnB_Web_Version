/**
 * Chỉ MỘT tab được refresh token tại một thời điểm.
 *
 * Backend xoay vòng refresh token (mỗi token dùng một lần). Hai tab cùng hết hạn access token mà
 * cùng gọi /auth/refresh thì tab sau mang token đã bị thu hồi → bị đá ra. `navigator.locks` giữ
 * khoá theo origin: tab sau CHỜ tab trước xong rồi mới chạy `task` — và `task` phải đọc lại token
 * mới trong storage chứ không dùng token đã chụp trước khi chờ.
 *
 * Trình duyệt không có Web Locks thì chạy thẳng (chỉ còn khử trùng trong cùng tab).
 */
const LOCK_NAME = "smartfnb-refresh-token";

export function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return task();
  return locks.request(LOCK_NAME, task) as Promise<T>;
}
