/** Kiểu dữ liệu Thanh toán theo đặc tả v7 mục 11. */

/** Phương thức thanh toán. */
export type PaymentMethod = "qr" | "cash";

/**
 * Trạng thái thanh toán:
 * - initiated: mới tạo, chưa có hành động
 * - awaiting_transfer: đã tạo QR, chờ khách chuyển
 * - cash_received: waiter xác nhận đã nhận tiền mặt
 * - confirmed: Branch Manager xác nhận thanh toán thành công
 * - failed: thanh toán thất bại (hết hạn QR, sai số...)
 * - expired: QR hết hạn (tự động)
 * - partially_refunded: đã hoàn một phần
 * - refunded: đã hoàn toàn bộ
 */
export type PaymentStatus =
  | "initiated"
  | "awaiting_transfer"
  | "cash_received"
  | "confirmed"
  | "failed"
  | "expired"
  | "partially_refunded"
  | "refunded";

/** Giao dịch thanh toán của một phiên bàn. */
export type Payment = {
  id: string;
  tenantId: string;
  branchId: string;
  sessionId: string;
  /** Mã hoá đơn duy nhất — hiển thị cho khách. */
  invoiceCode: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Tên waiter thu tiền mặt hộ (chỉ khi method="cash"). */
  collectedBy?: string;
  /** Tên Branch Manager xác nhận. */
  confirmedBy?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

// Backward-compat alias (các màn cũ dùng Transaction)
export type TxStatus = "pending" | "confirmed" | "refund" | "failed";
export type Transaction = {
  id: string;
  branchId: string;
  table: string;
  session: string;
  amount: number;
  method: "VietQR" | "Tiền mặt";
  status: TxStatus;
  time: string;
  note?: string;
};
