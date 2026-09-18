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
