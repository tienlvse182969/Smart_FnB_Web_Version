/** Kiểu dữ liệu Chi nhánh. */

/** Trạng thái hoạt động của chi nhánh. */
export type BranchStatus = "open" | "closed" | "suspended";

/** Chi nhánh thuộc một tenant. */
export type Branch = {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  /** Số điện thoại chi nhánh. */
  phone: string;
  /** Giờ mở cửa dạng "HH:MM". */
  openTime: string;
  /** Giờ đóng cửa dạng "HH:MM". */
  closeTime: string;
  status: BranchStatus;
};

