/** Kiểu dữ liệu Ví & Thanh toán nền tảng theo đặc tả v7 mục 12. */

/**
 * Loại bút toán sổ cái.
 * - hold: giữ tiền (sau khi payment confirmed)
 * - settle: giải phóng hold thành số dư thực
 * - fee: trừ phí nền tảng
 * - refund: hoàn tiền cho khách
 * - withdraw_hold: giữ tiền khi yêu cầu rút
 * - withdraw_release: giải phóng hold rút (nếu từ chối)
 * - withdraw_paid: đã thanh toán rút thành công
 */
export type LedgerEntryType =
  | "hold"
  | "settle"
  | "fee"
  | "refund"
  | "withdraw_hold"
  | "withdraw_release"
  | "withdraw_paid";

/**
 * Bút toán sổ cái ví — chỉ thêm, không sửa xoá.
 * Số dư ví KHÔNG lưu thành field riêng — luôn tính từ tổng LedgerEntry.
 */
export type LedgerEntry = {
  id: string;
  tenantId: string;
  /** Chi nhánh nguồn của bút toán (BR-41) — không có ở bút toán rút tiền (rút theo cả doanh nghiệp). */
  branchId?: string;
  type: LedgerEntryType;
  /**
   * Luôn là số dương (độ lớn của bút toán). Chiều cộng/trừ vào số dư do
   * loại bút toán quyết định trong công thức tính ở `wallet.service.ts`,
   * không lưu dấu trong `amount` — sổ cái chỉ thêm, không sửa/xoá (BR-34).
   */
  amount: number;
  /** Tham chiếu đến payment hoặc withdrawal. */
  refId?: string;
  note?: string;
  createdAt: string;
};

/** Lô thanh toán định kỳ từ nền tảng cho tenant. */
export type SettlementBatch = {
  id: string;
  tenantId: string;
  /** Tổng tiền settle trong lô. */
  totalAmount: number;
  /** Danh sách ledgerEntryId. */
  entryIds: string[];
  createdAt: string;
  settledAt?: string;
};

/** Trạng thái yêu cầu rút tiền. */
export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "paid"
  | "rejected"
  | "cancelled"
  | "failed";

/** Tài khoản ngân hàng nhận tiền. */
export type PayoutAccount = {
  id: string;
  tenantId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
  createdAt: string;
};

/** Yêu cầu rút tiền từ ví về tài khoản ngân hàng. */
export type WithdrawalRequest = {
  id: string;
  tenantId: string;
  amount: number;
  status: WithdrawalStatus;
  /** Snapshot tài khoản tại thời điểm gửi yêu cầu. */
  payoutAccountSnapshot: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  note?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
};
