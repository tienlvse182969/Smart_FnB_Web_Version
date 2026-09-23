/**
 * Cấu hình tính năng theo giai đoạn triển khai — đặc tả v7.
 *
 * Các màn hình/tab đánh dấu "giai đoạn 2" (GĐ2) đã có UI dựng sẵn nhưng
 * KHÔNG thuộc phạm vi vận hành chính thức của bản v7 hiện tại — vẫn giữ code
 * lại để tái sử dụng sau, nhưng ẩn khỏi menu chính bằng cờ dưới đây. Bật lại
 * bằng cách đổi giá trị `true`, không cần sửa code màn hình.
 */
export const FEATURE_FLAGS = {
  /** Nhật ký (Audit log) — Platform Admin. */
  auditLog: false,
  /** Đối soát tay — Branch Manager (mục 4.5.B). */
  manualReconciliation: false,
};

/** Gốc API backend thật, ví dụ http://localhost:3100/api/v1. */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3100/api/v1";

/**
 * Waiter và Kitchen đã chuyển sang ứng dụng tablet. Cờ này tắt route, menu và
 * mọi lối vào hai phân hệ đó trên web — code màn hình vẫn giữ nguyên.
 */
export const ENABLE_STAFF_APPS: boolean =
  import.meta.env.VITE_ENABLE_STAFF_APPS === "true";
