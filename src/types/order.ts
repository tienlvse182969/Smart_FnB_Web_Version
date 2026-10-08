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

// ---------------------------------------------------------------------------
// Tra cứu đơn của Manager (BM-04, GĐ7): hình dạng theo `GET /manager/orders` của BE. Mã trạng thái giữ nguyên mã BE
// (xem `api/modules/order/codes.ts` để ra nhãn); tiền là số; thời gian là ISO giữ nguyên.
// ---------------------------------------------------------------------------

export type OrderPaymentRecord = {
  id: string;
  paymentCode: string;
  /** Mã BE: CASH | BANK_TRANSFER | … */
  method: string;
  /** Mã BE: PENDING | SUCCESS | … */
  status: string;
  amount: number;
  /** Số tiền thực nhận (xác nhận thủ công); null với tiền mặt. */
  receivedAmount: number | null;
  transactionRef: string | null;
  confirmationReason: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
  failureReason: string | null;
  /** Người xử lý/xác nhận (thu ngân hoặc Manager). */
  processedBy: string | null;
};

/** Một dòng của danh sách tra cứu. */
export type OrderSummary = {
  id: string;
  orderCode: string;
  callNumber: number | null;
  placedAt: string | null;
  paidAt: string | null;
  total: number;
  /** Mã BE (OrderStatus). */
  status: string;
  /** Mã BE (OrderPaymentStatus). */
  paymentStatus: string;
  payments: OrderPaymentRecord[];
  /** Thu ngân tạo đơn (họ tên, hoặc mã nhân viên nếu thiếu tên); null nếu không rõ. */
  cashierName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

export type OrderDetailOption = {
  groupName: string | null;
  name: string;
  priceDelta: number;
};

export type OrderDetailLine = {
  id: string;
  name: string;
  /** Giá lúc bán của món (chưa gồm tuỳ chọn). */
  unitPrice: number;
  quantity: number;
  options: OrderDetailOption[];
  /** Thành tiền của dòng. */
  total: number;
  /** Mã BE (OrderItemStatus). */
  status: string;
  note: string | null;
  cancellationReason: string | null;
};

export type OrderDetail = OrderSummary & {
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  note: string | null;
  cancelledBy: string | null;
  lines: OrderDetailLine[];
};

/** Bộ lọc gửi lên BE. `from`/`to` là ISO có múi giờ (đã đổi từ ngày giờ Việt Nam). */
export type OrderQuery = {
  from?: string;
  to?: string;
  callNumber?: number;
  orderCode?: string;
  /** Mã BE OrderStatus. */
  status?: string;
  /** Mã BE OrderPaymentStatus. */
  paymentStatus?: string;
  /** Mã BE PaymentMethod. */
  paymentMethod?: string;
  page: number;
  limit: number;
};

export type OrderPage = {
  items: OrderSummary[];
  total: number;
  page: number;
  limit: number;
};
