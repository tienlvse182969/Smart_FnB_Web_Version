/** Kiểu dữ liệu Phiên bàn (TableSession) theo đặc tả v7. */

/**
 * Trạng thái phiên bàn:
 * - open: bàn vừa mở, khách đang gọi món
 * - serving: đồng nghĩa open nhưng đã có order (alias UI)
 * - paid: khách đã trả tiền nhưng waiter chưa đóng bàn
 * - closed: bàn đã được đóng, không còn chiếm chỗ
 * - cancelled: phiên bị huỷ (không có order nào)
 */
export type TableSessionStatus = "open" | "serving" | "paid" | "closed" | "cancelled";

/** Một lượt khách dùng bàn từ khi ngồi đến khi thanh toán xong. */
export type TableSession = {
  id: string;
  tenantId: string;
  branchId: string;
  /** Nhiều bàn nếu ghép. */
  tableIds: string[];
  guests: number;
  /** Tên waiter mở bàn. */
  openedBy: string;
  openedAt: string;
  status: TableSessionStatus;
  /**
   * Lúc waiter bấm "Báo quầy tính tiền" (BR-13: waiter không chọn hình thức,
   * không sinh QR, không xác nhận — chỉ báo quầy). Thay cho trạng thái bàn
   * "billing" cũ; bàn vẫn ở "occupied" trong lúc chờ quầy xử lý.
   */
  billRequestedAt?: string;
  paymentMethod?: "qr" | "cash";
  /** Tên waiter thu tiền mặt hộ; undefined nếu trả QR. */
  collectedBy?: string;
  /** Tên Branch Manager xác nhận thanh toán. */
  confirmedBy?: string;
  paidAt?: string;
  closedAt?: string;
};
