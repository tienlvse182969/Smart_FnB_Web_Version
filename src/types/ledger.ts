/**
 * Sổ giao dịch bán hàng (BM-07, mục 32, BR-93, BR-94). Hình dạng theo BE `cash-ledger.service.ts` (bc36e64):
 * `GET /branches/:branchId/cash-ledger` và `GET /restaurant-chains/:chainId/cash-ledger`, query `from`, `to`.
 *
 * Các trường đánh dấu "CHỜ BE" (L6, `_audit/05`) hiện BE chưa trả; để optional để màn hình tự hiện khi BE có.
 */
export type LedgerDirection = "INFLOW" | "OUTFLOW";
export type LedgerSourceType = "CASH_PAYMENT" | "PAYOS_WEBHOOK" | "PAYOS_RECHECK" | "MANUAL_CONFIRMATION" | "REFUND";

export interface LedgerEntry {
  id: string;
  branchId: string;
  /** Mở chi tiết đơn bằng id (`/store-manager/orders/:orderId`). */
  orderId: string | null;
  direction: LedgerDirection;
  /** Mã nguồn BE; giá trị lạ vẫn giữ nguyên chuỗi để hiện "Khác (<mã>)". */
  sourceType: string;
  /** Mã `PaymentMethod` của BE (CASH, BANK_TRANSFER…) hoặc null. */
  method: string | null;
  /** Số nguyên đồng, luôn dương; dấu lấy từ `direction`. */
  amount: number;
  occurredAt: string;
  // CHỜ BE (L6)
  orderCode?: string | null;
  callNumber?: number | null;
  actorName?: string | null;
  note?: string | null;
}

/** 3 tổng BE trả (số nguyên đồng). Web không tự cộng. */
export interface LedgerSummary {
  inflow: number;
  outflow: number;
  net: number;
  // CHỜ BE (L6): thu tiền mặt, thu QR, chi tiền mặt, tiền mặt thuần
  cashIn?: number;
  qrIn?: number;
  cashOut?: number;
  cashNet?: number;
}

export interface Ledger {
  items: LedgerEntry[];
  summary: LedgerSummary;
  /** BE cắt ở 500 dòng mới nhất (`take: 500`); nếu có đủ 500 dòng thì có thể còn dòng cũ hơn. */
  mayBeTruncated: boolean;
}

/** Ngày `YYYY-MM-DD` theo giờ Việt Nam. */
export interface LedgerQuery {
  from: string;
  to: string;
}
