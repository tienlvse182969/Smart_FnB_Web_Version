/**
 * Sổ giao dịch bán hàng (BM-07, mục 32, BR-93, BR-94). Hình dạng theo BE `cash-ledger.service.ts` (`2491dce`):
 * `GET /branches/:branchId/cash-ledger` và `GET /restaurant-chains/:chainId/cash-ledger` — lọc `from`, `to`, `direction`, `paymentMethod`,
 * `cashierId`, `sourceType`, phân trang `page`, `pageSize` (≤ 100). Mọi tổng do BE tính; Web không tự cộng hay lọc.
 */
export type LedgerDirection = "INFLOW" | "OUTFLOW";

export interface LedgerEntry {
  id: string;
  branchId: string;
  direction: LedgerDirection;
  /** Mã nguồn BE (CASH_PAYMENT, PAYOS_WEBHOOK, PAYOS_RECHECK, MANUAL_CONFIRMATION, REFUND); giá trị lạ giữ nguyên chuỗi. */
  sourceType: string;
  /** Mã `PaymentMethod` của BE. Dòng chi hoàn tiền luôn là CASH (BR-81). */
  method: string | null;
  /** Số nguyên đồng, luôn dương; dấu lấy từ `direction`. */
  amount: number;
  occurredAt: string;
  /** Ngày bán theo giờ Việt Nam `YYYY-MM-DD` (BE `order.businessDate`). */
  businessDate: string | null;
  /** Mã đơn (BE không còn trả id đơn trong sổ): mở chi tiết qua Tra cứu đơn theo mã. */
  orderCode: string | null;
  callNumber: number | null;
  /** Người thao tác: thu ngân xử lý thanh toán, hoặc người hoàn tiền. */
  actorName: string | null;
  /** Lý do hoàn / ghi chú của khoản hoàn. */
  note: string | null;
}

/** Tổng do BE tính (số nguyên đồng). */
export interface LedgerSummary {
  cashCollected: number;
  qrCollected: number;
  cashRefunded: number;
  /** Tiền mặt thuần = phải có trong két. */
  netCash: number;
  netTotal: number;
}

export interface LedgerPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface LedgerBranchSummary {
  branchId: string;
  code: string;
  name: string;
  summary: LedgerSummary;
}

export interface Ledger {
  items: LedgerEntry[];
  pagination: LedgerPagination;
  summary: LedgerSummary;
  /** Chỉ có ở sổ cả chuỗi (Brand Manager): tổng từng chi nhánh. */
  branches: LedgerBranchSummary[];
}

/** Ngày `YYYY-MM-DD` theo giờ Việt Nam. */
export interface LedgerQuery {
  from: string;
  to: string;
  direction?: LedgerDirection;
  /** `CASH` hoặc `BANK_TRANSFER` (QR). */
  paymentMethod?: string;
  /** Mã nhân viên (employeeId) của thu ngân. */
  cashierId?: string;
  page?: number;
  pageSize?: number;
}
