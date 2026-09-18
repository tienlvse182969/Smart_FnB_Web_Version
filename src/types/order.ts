/** Kiểu dữ liệu Order, OrderLine, ServeTask theo đặc tả v7. */

/**
 * Trạng thái tổng của một order (suy ra từ các OrderLine, không lưu).
 * - sent: mới gửi, bếp chưa nhận
 * - processing: bếp đang làm ít nhất 1 món
 * - completed: mọi món đã bưng
 * - cancelled: toàn bộ dòng bị huỷ
 */
export type OrderStatus = "sent" | "processing" | "completed" | "cancelled";

/** Một lần waiter bấm gửi món. Gọi thêm tạo order mới trong cùng phiên. */
export type Order = {
  id: string;
  tenantId: string;
  sessionId: string;
  createdBy: string;
  createdAt: string;
  /** Trạng thái suy ra từ OrderLine — không lưu field này. */
  // status: OrderStatus; // computed
};

/**
 * Trạng thái của một dòng món trong order.
 * - queued: đã gửi bếp, chờ bếp nhận
 * - cooking: bếp đang làm
 * - done: bếp làm xong, chờ bưng
 * - awaiting_pickup: waiter đã nhận (claimLine) nhưng chưa bưng
 * - served: đã bưng lên bàn
 * - sold_out: hết suất, không làm được
 * - cancelled: waiter huỷ trước khi bếp nhận
 */
export type OrderLineStatus =
  | "queued"
  | "cooking"
  | "done"
  | "awaiting_pickup"
  | "served"
  | "sold_out"
  | "cancelled";

/** Một món trong order — đơn vị bếp xử lý. */
export type OrderLine = {
  id: string;
  orderId: string;
  menuItemId: string;
  /** Tên tại thời điểm bán — không tham chiếu bảng món. */
  name: string;
  /** Giá tại thời điểm bán — không tham chiếu bảng món. */
  unitPrice: number;
  qty: number;
  note?: string;
  status: OrderLineStatus;
  /** Waiter đã nhận việc bưng món. */
  claimedBy?: string;
  claimedAt?: string;
  /** Lúc bếp bắt đầu làm. */
  startedAt?: string;
  /** Lúc bếp bấm xong — mốc tính thời gian chờ bưng. */
  doneAt?: string;
};

/**
 * Nhiệm vụ bưng món — tạo ngay khi bếp bấm "xong" (OrderLine -> awaiting_pickup).
 * Mọi waiter đang trong ca thấy chung nhiệm vụ; ai bấm `claimLine` trước thì
 * `claimedBy`/`claimedAt` được ghi, người bấm sau nhận lỗi (BR-11).
 */
export type ServeTask = {
  id: string;
  tenantId: string;
  branchId: string;
  orderLineId: string;
  createdAt: string;
  /** null = chưa ai nhận. */
  claimedBy: string | null;
  claimedAt?: string;
};

/**
 * Cảnh báo "hết món" do bếp báo trên một dòng món — gửi cho Manager và MỌI
 * waiter của chi nhánh, không lọc theo ca và không gắn "waiter phụ trách bàn"
 * (khác với nhiệm vụ bưng món, vốn lọc theo người đang trong ca — BR-43 chỉ
 * áp cho thông báo món xong, không áp cho cảnh báo hết món).
 */
export type SoldOutAlert = {
  id: string;
  tenantId: string;
  branchId: string;
  orderLineId: string;
  menuItemId: string;
  menuItemName: string;
  reportedBy: string;
  createdAt: string;
};

/**
 * Item hiển thị trên màn bếp (view object, không lưu). `status` chỉ 3 giá
 * trị bếp còn thao tác được — "awaiting_pickup" hiện read-only ("Xong · chờ
 * bưng") rồi biến mất khỏi hàng đợi khi waiter bưng xong (BR-10).
 */
export type KitchenQueueItem = {
  orderLineId: string;
  /** Nhãn bàn, ghép "+" nếu phiên gộp nhiều bàn. */
  table: string;
  category: string;
  name: string;
  qty: number;
  note?: string;
  status: "queued" | "cooking" | "awaiting_pickup";
  /** Phút đã chờ, tính từ giờ tạo order. */
  waited: number;
};

/** Item trong giỏ trước khi gửi bếp (dùng trong WaiterApp). */
export type CartItem = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  note?: string;
};

/** Món trên menu của chi nhánh kèm trạng thái khả dụng đã suy sẵn. */
export type WaiterMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  remaining: number | null;
};
