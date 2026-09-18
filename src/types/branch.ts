/** Kiểu dữ liệu Chi nhánh và Sơ đồ bàn theo đặc tả v7. */

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

/**
 * Trạng thái của bàn theo đặc tả v7 mục 5.3 — chỉ 4 giá trị này.
 * Không có "billing": khi khách yêu cầu tính tiền, bàn vẫn "occupied",
 * việc "đang chờ thanh toán" nằm ở `TableSession.billRequestedAt`.
 * Thanh toán xong → đóng phiên → bàn về "available" ngay (không có "cần dọn").
 */
export type TableStatus = "available" | "reserved" | "occupied" | "locked";

/** Bàn trong sơ đồ mặt bằng chi nhánh. */
export type FloorTable = {
  id: string;
  branchId: string;
  area: string;
  seats: number;
  status: TableStatus;
  /** Phiên bàn đang chiếm bàn này, null nếu đang trống/khoá/đã đặt trước. */
  currentSessionId: string | null;
  /**
   * Danh sách id bàn liền kề khai báo tay (cùng khu vực),
   * dùng làm đầu vào cho tính năng ghép bàn (BR-25: chỉ ghép bàn cùng khu vực).
   */
  adjacentTableIds: string[];
};
