/**
 * Ánh xạ trạng thái nghiệp vụ → màu ngữ nghĩa (đặc tả v9 mục 5). Cố định, KHÔNG đổi theo
 * nhận diện của doanh nghiệp (BR-42). Khoá là mã trạng thái tiếng Anh, chú thích là tên
 * trạng thái đúng như đặc tả.
 */
import { SEMANTIC, type SemanticKey } from "./tokens";

export { SEMANTIC as STATUS_COLORS };
export type StatusColorKey = SemanticKey;

/** Đơn — mục 5.3. */
export const ORDER_STATUS_COLOR = {
  pendingPayment: "warning", // Chờ thanh toán
  paid: "info", // Đã thanh toán
  preparing: "purple", // Đang pha
  ready: "success", // Sẵn sàng (đã gọi số)
  completed: "neutral", // Hoàn tất
  cancelled: "neutral", // Đã huỷ
  needsAttention: "error", // Cần xử lý
} as const satisfies Record<string, StatusColorKey>;

/** Dòng món — mục 5.4. */
export const ORDER_LINE_STATUS_COLOR = {
  queued: "warning", // Chờ pha
  preparing: "purple", // Đang pha
  done: "success", // Xong
  soldOut: "error", // Hết món
  cancelled: "neutral", // Đã huỷ
} as const satisfies Record<string, StatusColorKey>;

/** Thanh toán — mục 5.5. */
export const PAYMENT_STATUS_COLOR = {
  initiated: "neutral", // Khởi tạo
  awaitingTransfer: "warning", // Chờ chuyển khoản
  paid: "success", // Đã thanh toán
  expired: "error", // Hết hạn
  cancelled: "neutral", // Đã huỷ
  amountMismatch: "error", // Lệch số tiền
} as const satisfies Record<string, StatusColorKey>;

/** Hoàn tiền của đơn đã huỷ — mục 6.5, BR-49. */
export const REFUND_STATUS_COLOR = {
  refundedCash: "success", // Đã hoàn tiền mặt tại quầy
  awaitingOwnerRefund: "warning", // Chờ chủ chuỗi hoàn
  refunded: "success", // Đã hoàn
} as const satisfies Record<string, StatusColorKey>;

/** Liên kết PayOS — mục 5.6. */
export const PAYOS_STATUS_COLOR = {
  unlinked: "neutral", // Chưa liên kết
  verifying: "warning", // Đang kiểm tra
  linked: "success", // Đã liên kết
  error: "error", // Lỗi
} as const satisfies Record<string, StatusColorKey>;

/** Doanh nghiệp — mục 5.2. */
export const TENANT_STATUS_COLOR = {
  active: "success", // Hoạt động
  suspended: "error", // Tạm ngưng
  expired: "warning", // Hết hạn — chỉ đọc
} as const satisfies Record<string, StatusColorKey>;

/** Hồ sơ đăng ký — mục 5.1. */
export const REGISTRATION_STATUS_COLOR = {
  pending: "warning", // Chờ duyệt
  approved: "success", // Đã duyệt
  rejected: "error", // Bị từ chối
} as const satisfies Record<string, StatusColorKey>;
