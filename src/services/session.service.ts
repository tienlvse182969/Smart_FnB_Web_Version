/** Service quản lý Phiên bàn (TableSession) — đặc tả v7 mục 5.3/5.4. */
import { db } from "../mock/db";
import type { TableSession, TableSessionStatus } from "../types";
import { assertTenantWritable } from "./_guard";
import { delay, newId, nowISO } from "./_utils";

/** Danh sách phiên bàn theo chi nhánh. */
export async function listSessions(
  branchId: string,
  status?: TableSessionStatus
): Promise<TableSession[]> {
  await delay();
  let list = db.tableSessions.filter((s) => s.branchId === branchId);
  if (status) {
    list = list.filter((s) => s.status === status);
  }
  return list;
}

/** Lấy 1 phiên bàn theo ID. */
export async function getSession(id: string): Promise<TableSession | undefined> {
  await delay();
  return db.tableSessions.find((s) => s.id === id);
}

/** Mở phiên bàn mới (có thể ghép nhiều bàn). */
export async function openSession(
  tenantId: string,
  branchId: string,
  tableIds: string[],
  guests: number,
  openedBy: string
): Promise<TableSession> {
  await delay();
  assertTenantWritable(tenantId);
  const sessionId = `SES-${newId()}`;
  const now = nowISO();

  const newSession: TableSession = {
    id: sessionId,
    tenantId,
    branchId,
    tableIds,
    guests,
    openedBy,
    openedAt: now,
    status: "open",
  };

  db.tableSessions.unshift(newSession);

  for (const tableId of tableIds) {
    const table = db.floorTables.find((t) => t.id === tableId);
    if (table) {
      table.status = "occupied";
      table.currentSessionId = sessionId;
    }
  }

  return newSession;
}

/**
 * Waiter báo quầy tính tiền (BR-13). Không nhận hình thức thanh toán — việc
 * chọn QR hay tiền mặt, sinh mã QR và xác nhận thu tiền là việc của Branch
 * Manager ở `payment.service.ts`. Bàn giữ nguyên "occupied": không có trạng
 * thái bàn "billing" — chỉ đánh dấu thời điểm trên phiên bàn.
 */
export async function requestPayment(sessionId: string): Promise<void> {
  await delay();
  const session = db.tableSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Phiên bàn không tồn tại");
  assertTenantWritable(session.tenantId);
  session.billRequestedAt = nowISO();
}

/**
 * Huỷ phiên khi khách bỏ về trước khi gọi món (mục 5.4: Mở → Huỷ) — chỉ cho
 * phép khi phiên CHƯA có order nào. Giải phóng bàn về "available" ngay,
 * giống `closeSession`.
 */
export async function cancelSession(sessionId: string): Promise<void> {
  await delay();
  const session = db.tableSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Phiên bàn không tồn tại");
  assertTenantWritable(session.tenantId);
  const hasOrders = db.orders.some((o) => o.sessionId === sessionId);
  if (hasOrders) {
    throw new Error("Chỉ huỷ được phiên chưa gọi món nào — phiên này đã có order");
  }

  session.status = "cancelled";
  session.closedAt = nowISO();

  for (const tableId of session.tableIds) {
    const table = db.floorTables.find((t) => t.id === tableId);
    if (table && table.currentSessionId === sessionId) {
      table.status = "available";
      table.currentSessionId = null;
    }
  }
}

/** Cập nhật trạng thái phiên bàn. */
export async function updateSessionStatus(
  sessionId: string,
  status: TableSessionStatus
): Promise<void> {
  await delay();
  const session = db.tableSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Phiên bàn không tồn tại");
  session.status = status;
}

/**
 * Đóng phiên bàn và giải phóng bàn.
 * BR-14: waiter chỉ đóng được phiên bàn SAU KHI Manager đã xác nhận thanh
 * toán, tức phiên phải đang ở trạng thái "paid".
 */
export async function closeSession(sessionId: string): Promise<void> {
  await delay();
  const session = db.tableSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Phiên bàn không tồn tại");
  assertTenantWritable(session.tenantId);
  if (session.status !== "paid") {
    throw new Error("Chỉ đóng được phiên bàn đã thanh toán (status = paid)");
  }

  session.status = "closed";
  session.closedAt = nowISO();

  for (const tableId of session.tableIds) {
    const table = db.floorTables.find((t) => t.id === tableId);
    if (table && table.currentSessionId === sessionId) {
      table.status = "available";
      table.currentSessionId = null;
    }
  }
}
