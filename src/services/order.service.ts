/** Service quản lý Order, OrderLine, Kitchen Queue và Phục vụ — đặc tả v7 mục 4.6/4.7. */
import { db } from "../mock/db";
import type {
  CartItem,
  KitchenQueueItem,
  MenuItem,
  Order,
  OrderLine,
  OrderLineStatus,
  OrderStatus,
  ServeTask,
  SoldOutAlert,
} from "../types";
import type { RoleKey } from "../types";
import { delay, minutesSinceISO, newId, nowISO } from "./_utils";
import { isSellable } from "./menu.service";
import { assertTenantWritable } from "./_guard";

/** BR-21: Platform Admin không xem nội dung đơn hàng của doanh nghiệp. */
function assertNotAdmin(actingRole: RoleKey) {
  if (actingRole === "admin") {
    throw new Error("Platform Admin không được xem đơn hàng của doanh nghiệp (BR-21)");
  }
}

/** Lấy danh sách order thuộc 1 phiên bàn. */
export async function listOrders(sessionId: string): Promise<Order[]> {
  await delay();
  return db.orders.filter((o) => o.sessionId === sessionId);
}

/** Lấy danh sách order lines của 1 order. */
export async function listOrderLines(orderId: string): Promise<OrderLine[]> {
  await delay();
  return db.orderLines.filter((l) => l.orderId === orderId);
}

/** Lấy toàn bộ order lines thuộc 1 phiên bàn. */
export async function listSessionOrderLines(sessionId: string): Promise<OrderLine[]> {
  await delay();
  const sessionOrders = db.orders.filter((o) => o.sessionId === sessionId);
  const orderIds = new Set(sessionOrders.map((o) => o.id));
  return db.orderLines.filter((l) => orderIds.has(l.orderId));
}

/** OrderLine kèm thông tin join từ Order/TableSession — dùng cho UI (Waiter/Kitchen). */
export type BranchOrderLine = OrderLine & {
  sessionId: string;
  tableIds: string[];
  openedAt: string;
  /** Giờ tạo order chứa dòng món này — mốc tính "đã chờ" cho hàng đợi bếp. */
  orderCreatedAt: string;
};

/** Lấy toàn bộ order lines theo chi nhánh (thông qua session). */
export async function listBranchOrderLines(branchId: string, actingRole: RoleKey): Promise<BranchOrderLine[]> {
  assertNotAdmin(actingRole);
  await delay();
  const branchSessions = db.tableSessions.filter((s) => s.branchId === branchId);
  const sessionMap = new Map(branchSessions.map((s) => [s.id, s]));
  const branchOrders = db.orders.filter((o) => sessionMap.has(o.sessionId));
  const orderMap = new Map(branchOrders.map((o) => [o.id, o]));

  const result: BranchOrderLine[] = [];
  for (const line of db.orderLines) {
    const order = orderMap.get(line.orderId);
    if (order) {
      const session = sessionMap.get(order.sessionId)!;
      result.push({
        ...line,
        sessionId: session.id,
        tableIds: session.tableIds,
        openedAt: session.openedAt,
        orderCreatedAt: order.createdAt,
      });
    }
  }
  return result;
}

/** Danh sách nhiệm vụ bưng món chưa ai nhận, theo chi nhánh. */
export async function listUnclaimedServeTasks(branchId: string): Promise<ServeTask[]> {
  await delay();
  return db.serveTasks.filter((t) => t.branchId === branchId && t.claimedBy === null);
}

/** Danh sách cảnh báo hết món của chi nhánh — gửi Manager + mọi waiter. */
export async function listSoldOutAlerts(branchId: string): Promise<SoldOutAlert[]> {
  await delay();
  return db.soldOutAlerts.filter((a) => a.branchId === branchId);
}

export type SubmitOrderResult =
  | { ok: true; order: Order; lines: OrderLine[] }
  | { ok: false; soldOut: string[] };

/**
 * Gửi order mới (waiter gửi bếp — BR-05: chạy thẳng xuống bếp, không có
 * bước duyệt trung gian). Trước khi chốt, kiểm tra lại từng món theo BR-06
 * (`activeChain && isAvailable`) và số suất còn lại — món vừa hết giữa
 * chừng thì chặn toàn bộ order và trả về danh sách tên món để waiter bỏ
 * khỏi giỏ. Nếu hợp lệ, trừ `remainingToday` / cộng `soldToday` ngay lúc
 * chốt (BR-07), không chờ bếp xác nhận.
 */
export async function submitOrder(
  tenantId: string,
  branchId: string,
  sessionId: string,
  createdBy: string,
  cart: CartItem[]
): Promise<SubmitOrderResult> {
  await delay();
  assertTenantWritable(tenantId);

  const soldOut: string[] = [];
  for (const item of cart) {
    const menuItem = db.menuItems.find((m) => m.id === item.menuItemId);
    const branchItem = db.branchMenuItems.find(
      (bm) => bm.branchId === branchId && bm.menuItemId === item.menuItemId
    );
    const sellable = !!menuItem && isSellable(menuItem, branchItem);
    const enoughStock =
      !branchItem || branchItem.remainingToday == null || branchItem.remainingToday >= item.qty;
    if (!sellable || !enoughStock) soldOut.push(item.name);
  }
  if (soldOut.length > 0) return { ok: false, soldOut };

  const orderId = `ORD-${newId()}`;
  const now = nowISO();

  const newOrder: Order = {
    id: orderId,
    tenantId,
    sessionId,
    createdBy,
    createdAt: now,
  };
  db.orders.unshift(newOrder);

  const newLines: OrderLine[] = cart.map((item) => ({
    id: `LINE-${newId()}`,
    orderId,
    menuItemId: item.menuItemId,
    name: item.name,
    unitPrice: item.unitPrice,
    qty: item.qty,
    note: item.note,
    status: "queued",
  }));

  db.orderLines.push(...newLines);

  for (const item of cart) {
    const branchItem = db.branchMenuItems.find(
      (bm) => bm.branchId === branchId && bm.menuItemId === item.menuItemId
    );
    if (branchItem) {
      if (branchItem.remainingToday != null) branchItem.remainingToday -= item.qty;
      branchItem.soldToday += item.qty;
    }
  }

  const session = db.tableSessions.find((s) => s.id === sessionId);
  if (session && session.status === "open") {
    session.status = "serving";
  }

  return { ok: true, order: newOrder, lines: newLines };
}

/**
 * Bếp cập nhật trạng thái dòng món. Chỉ 4 nút theo mục 4.7.C: chờ (queued),
 * đang làm (cooking), xong (done) và hết món (sold_out) — "xong" và
 * "hết món" có hiệu ứng phụ riêng nên tách hàm dùng cho hai trường hợp đó
 * (`markLineDone`, `reportSoldOut`); hàm này dùng cho queued/cooking/huỷ.
 */
function tenantIdOfOrder(orderId: string): string | undefined {
  return db.orders.find((o) => o.id === orderId)?.tenantId;
}

export async function updateLineStatus(
  lineId: string,
  status: Exclude<OrderLineStatus, "done" | "sold_out">
): Promise<void> {
  await delay();
  const line = db.orderLines.find((l) => l.id === lineId);
  if (!line) throw new Error("Dòng món không tồn tại");
  const tid = tenantIdOfOrder(line.orderId);
  if (tid) assertTenantWritable(tid);

  line.status = status;
  const now = nowISO();
  if (status === "cooking" && !line.startedAt) {
    line.startedAt = now;
  }
}

/**
 * Bếp bấm "xong" (BR-10): dòng món chuyển thẳng sang `awaiting_pickup` (gộp
 * bước "Xong"/"Chờ bưng" của 5.6 vào một thao tác) và tạo ngay một
 * `ServeTask` chưa ai nhận, để mọi waiter đang trong ca thấy và tranh nhận.
 */
export async function markLineDone(
  lineId: string,
  tenantId: string,
  branchId: string
): Promise<ServeTask> {
  await delay();
  assertTenantWritable(tenantId);
  const line = db.orderLines.find((l) => l.id === lineId);
  if (!line) throw new Error("Dòng món không tồn tại");

  const now = nowISO();
  line.status = "awaiting_pickup";
  line.doneAt = now;

  const task: ServeTask = {
    id: `TASK-${newId()}`,
    tenantId,
    branchId,
    orderLineId: lineId,
    createdAt: now,
    claimedBy: null,
  };
  db.serveTasks.push(task);
  return task;
}

/**
 * Waiter nhận nhiệm vụ bưng món (BR-11): chỉ người bấm nhận trước mới thắng.
 * Khoá bằng cách tìm nhiệm vụ CÒN CHƯA AI NHẬN của dòng món này — nếu không
 * còn (đã bị người khác nhận trước), ném lỗi rõ ràng cho người bấm sau.
 * Không đổi lại `OrderLineStatus` — dòng món đã ở `awaiting_pickup` từ lúc
 * bếp bấm xong (`markLineDone`).
 */
export async function claimLine(lineId: string, claimedBy: string): Promise<void> {
  await delay();
  const line = db.orderLines.find((l) => l.id === lineId);
  if (!line) throw new Error("Dòng món không tồn tại");
  const tid = tenantIdOfOrder(line.orderId);
  if (tid) assertTenantWritable(tid);

  const task = db.serveTasks.find((t) => t.orderLineId === lineId && t.claimedBy === null);
  if (!task) {
    throw new Error("Đã có người nhận");
  }

  const now = nowISO();
  task.claimedBy = claimedBy;
  task.claimedAt = now;
  line.claimedBy = claimedBy;
  line.claimedAt = now;
}

/** Đánh dấu món đã bưng lên bàn. */
export async function markLineServed(lineId: string): Promise<void> {
  await delay();
  const line = db.orderLines.find((l) => l.id === lineId);
  if (!line) throw new Error("Dòng món không tồn tại");
  const tid1 = tenantIdOfOrder(line.orderId);
  if (tid1) assertTenantWritable(tid1);
  line.status = "served";
}

/** Huỷ dòng món — chỉ khi còn "Trong hàng đợi" (BR-09). */
export async function cancelLine(lineId: string): Promise<void> {
  await delay();
  const line = db.orderLines.find((l) => l.id === lineId);
  if (!line) throw new Error("Dòng món không tồn tại");
  const tid2 = tenantIdOfOrder(line.orderId);
  if (tid2) assertTenantWritable(tid2);
  if (line.status !== "queued") {
    throw new Error("Chỉ huỷ được dòng món khi còn trong hàng đợi");
  }
  line.status = "cancelled";
}

/**
 * Bếp báo hết món trên một dòng món đang xử lý. Tạo cảnh báo gửi Manager và
 * MỌI waiter của chi nhánh — không lọc theo ca đang làm, không gắn cho một
 * waiter cụ thể (khác nhiệm vụ bưng món).
 */
export async function reportSoldOut(
  lineId: string,
  tenantId: string,
  branchId: string,
  reportedBy: string
): Promise<SoldOutAlert> {
  await delay();
  assertTenantWritable(tenantId);
  const line = db.orderLines.find((l) => l.id === lineId);
  if (!line) throw new Error("Dòng món không tồn tại");

  line.status = "sold_out";

  const alert: SoldOutAlert = {
    id: `ALERT-${newId()}`,
    tenantId,
    branchId,
    orderLineId: lineId,
    menuItemId: line.menuItemId,
    menuItemName: line.name,
    reportedBy,
    createdAt: nowISO(),
  };
  db.soldOutAlerts.push(alert);
  return alert;
}

/**
 * Dựng hàng đợi bếp hiển thị (view, không lưu) từ `BranchOrderLine` +
 * `MenuItem` (để lấy danh mục). Dùng chung cho màn Kitchen VÀ chỉ số
 * "món đang chờ bếp" trên dashboard Branch Manager — không viết bản riêng
 * ở từng nơi để tránh lệch số liệu.
 */
export function kitchenQueue(orderLines: BranchOrderLine[], menuItems: MenuItem[]): KitchenQueueItem[] {
  const categoryById = new Map(menuItems.map((m) => [m.id, m.category]));

  const items: KitchenQueueItem[] = orderLines
    .filter(
      (l): l is BranchOrderLine & { status: KitchenQueueItem["status"] } =>
        l.status === "queued" || l.status === "cooking" || l.status === "awaiting_pickup",
    )
    .map((l) => ({
      orderLineId: l.id,
      table: l.tableIds.map((id) => id.split("-").pop() ?? id).join(" + "),
      category: categoryById.get(l.menuItemId) ?? "Khác",
      name: l.name,
      qty: l.qty,
      note: l.note,
      status: l.status,
      waited: minutesSinceISO(l.orderCreatedAt),
    }));

  return items.sort((a, b) => b.waited - a.waited);
}

/** Suy ra OrderStatus từ danh sách OrderLine. */
export function computeOrderStatus(lines: OrderLine[]): OrderStatus {
  if (lines.length === 0) return "sent";
  if (lines.every((l) => l.status === "cancelled")) return "cancelled";
  if (lines.every((l) => l.status === "served" || l.status === "sold_out" || l.status === "cancelled")) {
    return "completed";
  }
  if (lines.some((l) => l.status === "cooking" || l.status === "done" || l.status === "awaiting_pickup")) {
    return "processing";
  }
  return "sent";
}
