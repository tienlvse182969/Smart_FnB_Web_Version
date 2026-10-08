/**
 * Mã trạng thái của BE (`prisma/schema.prisma`: OrderStatus :120-130, OrderPaymentStatus :132-137, OrderItemStatus :139-149,
 * PaymentMethod :183-189, PaymentStatus :191-197) → nhãn tiếng Việt theo đặc tả v9 mục 5.3 (đơn), 5.4 (dòng món), 5.5 (thanh toán).
 *
 * Map ĐỦ mọi giá trị enum của BE. Giá trị BE không có trong đặc tả (dữ liệu v7 hoặc trạng thái nháp của POS) hiện "Khác (<mã>)"
 * cho tới khi Khánh duyệt nhãn (BAN-GIAO, quyết định 70). Màu theo BR-42: đỏ cảnh báo, vàng đang chờ, xanh xong, xám vô hiệu.
 * "Cần xử lý" và "Lệch số tiền" KHÔNG suy ra ở đây: BE chưa có (#44).
 */
import type { StatusColorKey } from "../../../theme";

export const ORDER_STATUS_CODES = ["PENDING", "SUBMITTED", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED", "DELIVERED", "CANCELLED"] as const;
export const ORDER_PAYMENT_STATUS_CODES = ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"] as const;
export const ORDER_ITEM_STATUS_CODES = ["PENDING", "QUEUED", "CONFIRMED", "PREPARING", "READY", "SERVED", "DELIVERED", "OUT_OF_STOCK", "CANCELLED"] as const;
export const PAYMENT_METHOD_CODES = ["CASH", "CARD", "BANK_TRANSFER", "E_WALLET", "OTHER"] as const;
export const PAYMENT_STATUS_CODES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

export interface StatusInfo {
  label: string;
  tone: StatusColorKey;
  /** false = giá trị chưa có trong đặc tả (hoặc BE trả mã lạ): nhãn "Khác (<mã>)". */
  known: boolean;
}

const other = (code: string): StatusInfo => ({ label: `Khác (${code})`, tone: "neutral", known: false });
const known = (label: string, tone: StatusColorKey): StatusInfo => ({ label, tone, known: true });

/** Đơn (5.3). Đơn quầy v9: CONFIRMED = đã chốt, chờ trả; SUBMITTED = đã trả, chờ pha; DELIVERED = pha chế bấm Đã giao (Hoàn tất). */
const ORDER_STATUS: Record<(typeof ORDER_STATUS_CODES)[number], StatusInfo> = {
  PENDING: other("PENDING"),
  SUBMITTED: known("Đã thanh toán", "info"),
  CONFIRMED: known("Chờ thanh toán", "warning"),
  PREPARING: known("Đang pha", "purple"),
  READY: known("Sẵn sàng", "success"),
  SERVED: other("SERVED"),
  COMPLETED: known("Hoàn tất", "neutral"),
  DELIVERED: known("Hoàn tất", "neutral"),
  CANCELLED: known("Đã huỷ", "neutral"),
};

export function orderStatusInfo(code: string): StatusInfo {
  return (ORDER_STATUS as Record<string, StatusInfo>)[code] ?? other(code);
}

/** Dòng món (5.4). */
const ORDER_ITEM_STATUS: Record<(typeof ORDER_ITEM_STATUS_CODES)[number], StatusInfo> = {
  PENDING: other("PENDING"),
  QUEUED: known("Chờ pha", "warning"),
  CONFIRMED: other("CONFIRMED"),
  PREPARING: known("Đang pha", "purple"),
  READY: known("Xong", "success"),
  SERVED: other("SERVED"),
  DELIVERED: known("Xong", "success"),
  OUT_OF_STOCK: known("Hết món", "error"),
  CANCELLED: known("Đã huỷ", "neutral"),
};

export function orderItemStatusInfo(code: string): StatusInfo {
  return (ORDER_ITEM_STATUS as Record<string, StatusInfo>)[code] ?? other(code);
}

/** Hình thức thanh toán: đặc tả chỉ có tiền mặt và QR (chuyển khoản qua PayOS). */
const PAYMENT_METHOD: Record<(typeof PAYMENT_METHOD_CODES)[number], StatusInfo> = {
  CASH: known("Tiền mặt", "neutral"),
  CARD: other("CARD"),
  BANK_TRANSFER: known("Chuyển khoản (QR)", "neutral"),
  E_WALLET: other("E_WALLET"),
  OTHER: other("OTHER"),
};

export function paymentMethodInfo(code: string): StatusInfo {
  return (PAYMENT_METHOD as Record<string, StatusInfo>)[code] ?? other(code);
}

/**
 * Một khoản thanh toán (5.5). PENDING của tiền mặt = "Khởi tạo", của chuyển khoản = "Chờ chuyển khoản". FAILED, REFUNDED,
 * PARTIALLY_REFUNDED chưa có trong đặc tả (huỷ đơn đã trả không đổi trạng thái thanh toán, 5.5).
 */
export function paymentStatusInfo(code: string, methodCode?: string): StatusInfo {
  switch (code) {
    case "SUCCESS":
      return known("Đã thanh toán", "success");
    case "PENDING":
      return methodCode === "CASH" ? known("Khởi tạo", "neutral") : known("Chờ chuyển khoản", "warning");
    default:
      return other(code);
  }
}

/**
 * Trạng thái thanh toán của CẢ ĐƠN trong danh sách: từ `paymentStatus` của đơn, trạng thái đơn và các khoản thanh toán kèm theo.
 * Đơn chưa trả: có khoản chuyển khoản đang chờ → "Chờ chuyển khoản"; đơn đã huỷ → "Đã huỷ"; còn lại → "Khởi tạo".
 * PARTIALLY_PAID và REFUNDED là dữ liệu v7, chưa có trong đặc tả.
 */
export function orderPaymentInfo(order: {
  status: string;
  paymentStatus: string;
  payments: { method: string; status: string }[];
}): StatusInfo {
  switch (order.paymentStatus) {
    case "PAID":
      return known("Đã thanh toán", "success");
    case "UNPAID":
      if (order.status === "CANCELLED") return known("Đã huỷ", "neutral");
      if (order.payments.some((p) => p.status === "PENDING" && p.method !== "CASH")) return known("Chờ chuyển khoản", "warning");
      return known("Khởi tạo", "neutral");
    default:
      return other(order.paymentStatus);
  }
}

/** Lựa chọn của ô lọc: giá trị gửi BE → nhãn. Ô trạng thái đơn bỏ các mã chưa có trong đặc tả. */
export const ORDER_STATUS_FILTER: { value: string; label: string }[] = [
  { value: "CONFIRMED", label: "Chờ thanh toán" },
  { value: "SUBMITTED", label: "Đã thanh toán" },
  { value: "PREPARING", label: "Đang pha" },
  { value: "READY", label: "Sẵn sàng" },
  { value: "DELIVERED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã huỷ" },
];

/** BE lọc theo `paymentStatus` của đơn: PAID hoặc UNPAID (UNPAID gồm Khởi tạo, Chờ chuyển khoản, Đã huỷ). */
export const ORDER_PAYMENT_FILTER: { value: string; label: string }[] = [
  { value: "PAID", label: "Đã thanh toán" },
  { value: "UNPAID", label: "Chưa thanh toán" },
];

export const PAYMENT_METHOD_FILTER: { value: string; label: string }[] = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản (QR)" },
];
