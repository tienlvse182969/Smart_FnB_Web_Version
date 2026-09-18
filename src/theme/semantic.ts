/**
 * Màu trạng thái ngữ nghĩa — cố định, KHÔNG thay đổi theo branding tenant.
 * Dùng cho badge trạng thái, alert, tag trạng thái vận hành.
 */
export const STATUS_COLORS = {
  danger: {
    bg: "#FFF1F0",
    text: "#CF1322",
    border: "#FFA39E",
  },
  warning: {
    bg: "#FFFBE6",
    text: "#D46B08",
    border: "#FFE58F",
  },
  success: {
    bg: "#F6FFED",
    text: "#389E0D",
    border: "#B7EB8F",
  },
  info: {
    bg: "#E6F4FF",
    text: "#0958D9",
    border: "#91CAFF",
  },
  neutral: {
    bg: "#FAFAFA",
    text: "#595959",
    border: "#D9D9D9",
  },
  purple: {
    bg: "#F9F0FF",
    text: "#531DAB",
    border: "#D3ADF7",
  },
} as const;

export type StatusColorKey = keyof typeof STATUS_COLORS;

/**
 * Map trạng thái vận hành → màu ngữ nghĩa.
 * Thêm vào đây khi cần ánh xạ trạng thái mới.
 */

// OrderLine status colors
export const ORDER_LINE_STATUS_COLOR: Record<string, StatusColorKey> = {
  queued: "warning",
  cooking: "info",
  done: "purple",
  awaiting_pickup: "purple",
  served: "success",
  "sold-out": "danger",
  sold_out: "danger",
  cancelled: "neutral",
};

// FloorTable status colors — Trống / Đã đặt / Đang phục vụ / Tạm khoá (mục 4.6.B)
export const TABLE_STATUS_COLOR: Record<string, StatusColorKey> = {
  available: "success",
  reserved: "warning",
  occupied: "info",
  locked: "danger",
};

// TableSession status colors
export const SESSION_STATUS_COLOR: Record<string, StatusColorKey> = {
  open: "info",
  serving: "success",
  paid: "warning",
  closed: "neutral",
  cancelled: "neutral",
};

// Payment status colors
export const PAYMENT_STATUS_COLOR: Record<string, StatusColorKey> = {
  initiated: "neutral",
  awaiting_transfer: "warning",
  cash_received: "info",
  confirmed: "success",
  failed: "danger",
  expired: "danger",
  partially_refunded: "warning",
  refunded: "neutral",
  // Backward-compat cũ
  pending: "warning",
  refund: "warning",
};

// Tenant status colors
export const TENANT_STATUS_COLOR: Record<string, StatusColorKey> = {
  active: "success",
  suspended: "danger",
  expired: "neutral",
};
