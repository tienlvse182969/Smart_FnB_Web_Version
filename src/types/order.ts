/**
 * Đơn hàng theo đặc tả v9 mục 5.3–5.5, 6.5, 12.3. Tiền là số nguyên đồng (BR-19).
 * Đơn lưu giá lúc bán: tên, giá món và tên/giá cộng thêm của từng tuỳ chọn (BR-15).
 */

/** Chờ thanh toán / Đã thanh toán / Đang pha / Sẵn sàng / Hoàn tất / Đã huỷ / Cần xử lý. */
export type OrderStatus =
  | "pendingPayment"
  | "paid"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "needsAttention";

/** Chờ pha / Đang pha / Xong / Hết món / Đã huỷ. */
export type OrderLineStatus = "queued" | "preparing" | "done" | "soldOut" | "cancelled";

/** Tiền mặt, hoặc QR qua PayOS. */
export type PaymentMethod = "cash" | "qr";

/** Khởi tạo / Chờ chuyển khoản / Đã thanh toán / Hết hạn / Đã huỷ / Lệch số tiền. */
export type PaymentStatus =
  | "initiated"
  | "awaitingTransfer"
  | "paid"
  | "expired"
  | "cancelled"
  | "amountMismatch";

/** Hoàn tiền của đơn đã thanh toán rồi huỷ (BR-49): Đã hoàn tiền mặt tại quầy / Chờ chủ chuỗi hoàn / Đã hoàn. */
export type RefundStatus = "refundedCash" | "awaitingOwnerRefund" | "refunded";

export type OrderLineOption = {
  groupName: string;
  optionName: string;
  /** Giá cộng thêm lúc bán. */
  priceDelta: number;
};

export type OrderLine = {
  id: string;
  /** Chỉ để truy vết; giá và tên đã chụp ở các trường dưới (BR-15). */
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  options: OrderLineOption[];
  status: OrderLineStatus;
  /** (unitPrice + Σ priceDelta) × quantity */
  lineTotal: number;
};

export type OrderRefund = {
  amount: number;
  status: RefundStatus;
};

export type Order = {
  id: string;
  /** Số gọi (BR-22) — có từ lúc đơn Đã thanh toán, bắt đầu lại mỗi ngày trong chi nhánh. */
  callNumber: number | null;
  chainId: string;
  branchId: string;
  /** ISO. */
  createdAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  lines: OrderLine[];
  total: number;
  cancelReason?: string;
  /** Chỉ có khi huỷ sau khi đã thanh toán. */
  refund?: OrderRefund;
};
