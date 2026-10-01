/**
 * v7 — vận hành phục vụ tại bàn: bàn mock, phiên bàn, dòng món waiter/kitchen,
 * thanh toán theo phiên, ca làm. Đặc tả v9 bỏ toàn bộ. Gỡ ở bước xoá v7.
 */
import type {
  CartItem,
  FloorTable,
  OrderLineStatus,
  TableSession,
  WorkSession,
} from "../../types";
import {
  createTable as serviceCreateTable,
  setTableLocked as serviceSetTableLocked,
  setAdjacent as serviceSetAdjacent,
  openSession as serviceOpenSession,
  closeSession as serviceCloseSession,
  cancelSession as serviceCancelSession,
  requestPayment as serviceRequestPayment,
  submitOrder as serviceSubmitOrder,
  type SubmitOrderResult,
  updateLineStatus as serviceUpdateLineStatus,
  markLineDone as serviceMarkLineDone,
  reportSoldOut as serviceReportSoldOut,
  claimLine as serviceClaimLine,
  markLineServed as serviceMarkLineServed,
  createPayment as serviceCreatePayment,
  confirmPayment as serviceConfirmPayment,
  type BranchOrderLine,
} from "../../services";
import {
  claimOperationalLine,
  readyOperationalItem,
  serveOperationalLine,
  startOperationalItem,
  submitOperationalOrder,
  unavailableOperationalItem,
} from "../../services/operational-api";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface LegacyOperationsSlice {
  tables: FloorTable[];
  sessions: TableSession[];
  orderLines: BranchOrderLine[];
  /** Lượt làm việc hôm nay của chi nhánh — dùng để lọc thông báo theo BR-43 (chỉ người đang inShift). */
  workSessions: WorkSession[];

  openTable: (tableIds: string[], guests: number) => Promise<TableSession>;
  closeSession: (sessionId: string) => Promise<void>;
  /** Huỷ phiên khi khách bỏ về trước khi gọi món (mục 5.4) — chỉ khi chưa có order. */
  cancelSession: (sessionId: string) => Promise<void>;
  submitOrder: (sessionId: string, cart: CartItem[]) => Promise<SubmitOrderResult>;
  updateLineStatus: (
    lineId: string,
    status: Exclude<OrderLineStatus, "done" | "sold_out">
  ) => Promise<void>;
  markLineDone: (lineId: string) => Promise<void>;
  reportSoldOut: (lineId: string) => Promise<void>;
  claimLine: (lineId: string) => Promise<void>;
  markLineServed: (lineId: string) => Promise<void>;
  /** Waiter báo quầy tính tiền — không chọn hình thức (BR-13). */
  requestPayment: (sessionId: string) => Promise<void>;
  /** Branch Manager sinh QR/ghi nhận tiền mặt cho phiên bàn (BR-13). */
  collectPayment: (
    sessionId: string,
    amount: number,
    method: "qr" | "cash",
    collectedBy?: string
  ) => Promise<void>;
  confirmPayment: (paymentId: string) => Promise<void>;

  // Sơ đồ bàn (Branch Manager, chế độ Quản trị — mục 4.5.F)
  createFloorTable: (id: string, area: string, seats: number) => Promise<void>;
  toggleTableLock: (tableId: string) => Promise<void>;
  toggleAdjacentTables: (tableIdA: string, tableIdB: string) => Promise<void>;
}

export const createLegacyOperationsSlice: SliceCreator<LegacyOperationsSlice> = (_set, get) => ({
  tables: [],
  sessions: [],
  orderLines: [],
  workSessions: [],

  openTable: async (tableIds: string[], guests: number) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser || !currentUser.tenantId || !currentBranchId) {
      throw new Error("Chưa đăng nhập hoặc chưa chọn chi nhánh");
    }

    const session = await serviceOpenSession(
      currentUser.tenantId!,
      currentBranchId!,
      tableIds,
      guests,
      currentUser.name
    );

    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
    return session;
  },

  closeSession: async (sessionId: string) => {
    await serviceCloseSession(sessionId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  cancelSession: async (sessionId: string) => {
    await serviceCancelSession(sessionId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  submitOrder: async (sessionId: string, cart: CartItem[]) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser || (!currentUser.apiBacked && (!currentUser.tenantId || !currentBranchId))) {
      throw new Error("Chưa xác thực");
    }

    if (currentUser.apiBacked) {
      const result = await submitOperationalOrder(sessionId, cart);
      await get().refreshOperationalData();
      return result;
    }

    const result = await serviceSubmitOrder(
      currentUser.tenantId!,
      currentBranchId!,
      sessionId,
      currentUser.name,
      cart
    );

    if (result.ok) {
      await get().refreshOperationalData();
      broadcast.send({ type: "REFETCH_ALL" });
    }
    return result;
  },

  updateLineStatus: async (
    lineId: string,
    status: Exclude<OrderLineStatus, "done" | "sold_out">
  ) => {
    if (get().currentUser?.apiBacked) {
      if (status !== "cooking") throw new Error("Chuyển trạng thái này chưa được API hỗ trợ");
      await startOperationalItem(lineId);
      await get().refreshOperationalData();
      return;
    }
    await serviceUpdateLineStatus(lineId, status);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  markLineDone: async (lineId: string) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;
    if (currentUser.apiBacked) {
      await readyOperationalItem(lineId);
      await get().refreshOperationalData();
      return;
    }
    if (!currentUser.tenantId || !currentBranchId) return;

    await serviceMarkLineDone(lineId, currentUser.tenantId, currentBranchId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  reportSoldOut: async (lineId: string) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;
    if (currentUser.apiBacked) {
      await unavailableOperationalItem(lineId);
      await get().refreshOperationalData();
      return;
    }
    if (!currentUser.tenantId || !currentBranchId) return;

    await serviceReportSoldOut(lineId, currentUser.tenantId, currentBranchId, currentUser.name);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  claimLine: async (lineId: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    if (currentUser.apiBacked) {
      await claimOperationalLine(lineId);
      await get().refreshOperationalData();
      return;
    }

    await serviceClaimLine(lineId, currentUser.name);

    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  markLineServed: async (lineId: string) => {
    if (get().currentUser?.apiBacked) {
      await serveOperationalLine(lineId);
      await get().refreshOperationalData();
      return;
    }
    await serviceMarkLineServed(lineId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  requestPayment: async (sessionId: string) => {
    await serviceRequestPayment(sessionId);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  collectPayment: async (
    sessionId: string,
    amount: number,
    method: "qr" | "cash",
    collectedBy?: string
  ) => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser || !currentUser.tenantId || !currentBranchId) return;

    await serviceCreatePayment(
      currentUser.tenantId,
      currentBranchId,
      sessionId,
      amount,
      method,
      currentUser.role,
      collectedBy
    );

    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  confirmPayment: async (paymentId: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    await serviceConfirmPayment(paymentId, currentUser.name, currentUser.role);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  createFloorTable: async (id: string, area: string, seats: number) => {
    const { currentBranchId } = get();
    if (!currentBranchId) return;

    await serviceCreateTable(currentBranchId, id, area, seats);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  toggleTableLock: async (tableId: string) => {
    const { tables } = get();
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;

    await serviceSetTableLocked(tableId, table.status !== "locked");
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },

  toggleAdjacentTables: async (tableIdA: string, tableIdB: string) => {
    const { tables } = get();
    const a = tables.find((t) => t.id === tableIdA);
    if (!a) return;
    const linked = a.adjacentTableIds.includes(tableIdB);

    await serviceSetAdjacent(tableIdA, tableIdB, !linked);
    await get().refreshOperationalData();
    broadcast.send({ type: "REFETCH_ALL" });
  },
});
