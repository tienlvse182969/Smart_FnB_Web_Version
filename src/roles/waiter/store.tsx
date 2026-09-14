import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  branchMenuItems,
  floorTables,
  menuItems,
  minutesSince,
  nowLabel,
  orderLines as orderLinesSeed,
  orders as ordersSeed,
  tableSessions as sessionsSeed,
  type FloorTable,
  type Order,
  type OrderLine,
  type TableDisplayState,
  type TableSession,
} from "../../data";

/* ============================================================
 * Waiter store (Bước 4)
 * Tablet dùng chung: mọi màn của waiter đọc/ghi trên CÙNG một state
 * để mở bàn ở màn này thấy được ở màn kia. Suy dẫn (tổng tiền, trạng
 * thái bàn, hoá đơn) tính từ state, không lưu field thừa.
 * ============================================================ */

/** Chi nhánh của tablet này. Tạm hardcode Quận 1. */
export const WAITER_BRANCH_ID = "BR-Q1";

/** Waiter đang cầm tablet — một nhân viên role="Waiter" đang trong ca. */
export const CURRENT_WAITER = "Võ Hoàng Nam";

/** Món trong giỏ trước khi gửi bếp. */
export type CartItem = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  note?: string;
};

/** Món trên menu của chi nhánh, kèm trạng thái khả dụng đã suy sẵn. */
export type WaiterMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean; // isMenuItemVisible tại thời điểm hiện tại
  remaining: number | null;
};

type SubmitResult =
  | { ok: true; orderId: string }
  | { ok: false; soldOut: string[] };

type WaiterStore = {
  branchId: string;
  waiter: string;
  sessions: TableSession[];
  orders: Order[];
  lines: OrderLine[];

  // ---- suy dẫn ----
  tableState: (tableId: string) => TableDisplayState;
  openSessionForTable: (tableId: string) => TableSession | null;
  sessionForTableAny: (tableId: string) => TableSession | null;
  sessionTotal: (sessionId: string) => number;
  linesOfSession: (sessionId: string) => OrderLine[];
  ordersOfSession: (sessionId: string) => Order[];
  menu: WaiterMenuItem[];
  remainingOf: (menuItemId: string) => number | null;

  // ---- thao tác ----
  openTable: (tableIds: string[], guests: number) => string;
  cancelSession: (sessionId: string) => void;
  submitOrder: (sessionId: string, cart: CartItem[]) => SubmitResult;
  updateLine: (lineId: string, qty: number, note?: string) => void;
  cancelLine: (lineId: string) => void;
  claimLine: (lineId: string) => void;
  serveLine: (lineId: string) => void;
  requestPayment: (sessionId: string) => void;
  closeTable: (sessionId: string) => void;
};

const Ctx = createContext<WaiterStore | null>(null);

const ACTIVE = (s: TableSession) => s.status !== "cancelled";

export function WaiterStoreProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<TableSession[]>(() =>
    sessionsSeed.filter((s) => s.branchId === WAITER_BRANCH_ID).map((s) => ({ ...s })),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    ordersSeed
      .filter((o) => sessionsSeed.some((s) => s.id === o.sessionId && s.branchId === WAITER_BRANCH_ID))
      .map((o) => ({ ...o })),
  );
  const [lines, setLines] = useState<OrderLine[]>(() =>
    orderLinesSeed
      .filter((l) => ordersSeed.some((o) => o.id === l.orderId))
      .map((l) => ({ ...l })),
  );
  // Số suất còn lại của chi nhánh (mutable), keyed theo menuItemId.
  const [remaining, setRemaining] = useState<Record<string, number | null>>(() => {
    const r: Record<string, number | null> = {};
    for (const b of branchMenuItems) {
      if (b.branchId === WAITER_BRANCH_ID) r[b.menuItemId] = b.remaining;
    }
    return r;
  });

  const seq = useMemo(() => ({ order: 100, line: 1000, session: 9000 }), []);

  const value = useMemo<WaiterStore>(() => {
    const orderIdsOfSession = (sessionId: string) =>
      new Set(orders.filter((o) => o.sessionId === sessionId).map((o) => o.id));

    const linesOfSession = (sessionId: string) => {
      const ids = orderIdsOfSession(sessionId);
      return lines.filter((l) => ids.has(l.orderId));
    };

    const sessionTotal = (sessionId: string) =>
      linesOfSession(sessionId)
        .filter((l) => l.status !== "cancelled" && l.status !== "sold-out")
        .reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

    const openSessionForTable = (tableId: string) =>
      sessions.find((s) => s.status === "open" && s.tableIds.includes(tableId)) ?? null;

    const sessionForTableAny = (tableId: string) =>
      sessions.find(
        (s) => (s.status === "open" || s.status === "paid") && s.tableIds.includes(tableId),
      ) ?? null;

    const tableState = (tableId: string): TableDisplayState => {
      const occ = sessionForTableAny(tableId);
      if (occ) return occ.status === "paid" ? "paid" : "serving";
      return floorTables.find((t) => t.id === tableId)?.state ?? "available";
    };

    const branchAvailable = new Map(
      branchMenuItems
        .filter((b) => b.branchId === WAITER_BRANCH_ID)
        .map((b) => [b.menuItemId, b.available]),
    );
    const menu: WaiterMenuItem[] = menuItems
      .filter((m) => branchAvailable.has(m.id)) // chỉ món CÓ MẶT ở chi nhánh
      .map((m) => {
        const rem = remaining[m.id] ?? null;
        const available =
          m.activeChain && branchAvailable.get(m.id) === true && (rem === null || rem > 0);
        return { id: m.id, name: m.name, category: m.category, price: m.price, available, remaining: rem };
      });

    const openTable = (tableIds: string[], guests: number) => {
      const id = `S-w${seq.session++}`;
      setSessions((p) => [
        ...p,
        {
          id,
          branchId: WAITER_BRANCH_ID,
          tableIds,
          guests,
          openedBy: CURRENT_WAITER,
          openedAt: nowLabel(),
          status: "open",
        },
      ]);
      return id;
    };

    const cancelSession = (sessionId: string) =>
      setSessions((p) => p.map((s) => (s.id === sessionId ? { ...s, status: "cancelled" } : s)));

    const submitOrder = (sessionId: string, cart: CartItem[]): SubmitResult => {
      // Chặn nếu có món vừa hết suất giữa chừng.
      const soldOut = cart
        .filter((c) => {
          const rem = remaining[c.menuItemId];
          return rem !== null && rem !== undefined && rem < c.qty;
        })
        .map((c) => c.name);
      if (soldOut.length > 0) return { ok: false, soldOut };

      const orderId = `O-w${seq.order++}`;
      setOrders((p) => [
        ...p,
        { id: orderId, sessionId, createdBy: CURRENT_WAITER, createdAt: nowLabel() },
      ]);
      setLines((p) => [
        ...p,
        ...cart.map((c) => ({
          id: `OL-w${seq.line++}`,
          orderId,
          menuItemId: c.menuItemId,
          name: c.name,
          unitPrice: c.unitPrice,
          qty: c.qty,
          note: c.note?.trim() ? c.note.trim() : undefined,
          status: "queued" as const,
        })),
      ]);
      // Trừ suất còn lại cho món có giới hạn.
      setRemaining((p) => {
        const next = { ...p };
        for (const c of cart) {
          if (next[c.menuItemId] !== null && next[c.menuItemId] !== undefined) {
            next[c.menuItemId] = (next[c.menuItemId] as number) - c.qty;
          }
        }
        return next;
      });
      return { ok: true, orderId };
    };

    const updateLine = (lineId: string, qty: number, note?: string) =>
      setLines((p) => {
        const line = p.find((l) => l.id === lineId);
        if (!line || line.status !== "queued") return p;
        const delta = qty - line.qty; // tăng => trừ thêm suất, giảm => cộng lại
        setRemaining((r) => {
          if (r[line.menuItemId] === null || r[line.menuItemId] === undefined) return r;
          return { ...r, [line.menuItemId]: (r[line.menuItemId] as number) - delta };
        });
        return p.map((l) =>
          l.id === lineId ? { ...l, qty, note: note?.trim() ? note.trim() : undefined } : l,
        );
      });

    const cancelLine = (lineId: string) =>
      setLines((p) => {
        const line = p.find((l) => l.id === lineId);
        if (!line || line.status !== "queued") return p;
        setRemaining((r) => {
          if (r[line.menuItemId] === null || r[line.menuItemId] === undefined) return r;
          return { ...r, [line.menuItemId]: (r[line.menuItemId] as number) + line.qty };
        });
        return p.map((l) => (l.id === lineId ? { ...l, status: "cancelled" } : l));
      });

    const claimLine = (lineId: string) =>
      setLines((p) =>
        p.map((l) =>
          l.id === lineId && l.status === "done" && !l.claimedBy
            ? { ...l, claimedBy: CURRENT_WAITER }
            : l,
        ),
      );

    const serveLine = (lineId: string) =>
      setLines((p) => p.map((l) => (l.id === lineId ? { ...l, status: "served" } : l)));

    const requestPayment = (sessionId: string) =>
      setSessions((p) =>
        p.map((s) => (s.id === sessionId ? { ...s, paymentRequested: true } : s)),
      );

    const closeTable = (sessionId: string) =>
      setSessions((p) =>
        p.map((s) => (s.id === sessionId && s.status === "paid" ? { ...s, status: "closed" } : s)),
      );

    return {
      branchId: WAITER_BRANCH_ID,
      waiter: CURRENT_WAITER,
      sessions: sessions.filter(ACTIVE),
      orders,
      lines,
      tableState,
      openSessionForTable,
      sessionForTableAny,
      sessionTotal,
      linesOfSession,
      ordersOfSession: (sessionId: string) =>
        orders.filter((o) => o.sessionId === sessionId),
      menu,
      remainingOf: (menuItemId: string) => remaining[menuItemId] ?? null,
      openTable,
      cancelSession,
      submitOrder,
      updateLine,
      cancelLine,
      claimLine,
      serveLine,
      requestPayment,
      closeTable,
    };
  }, [sessions, orders, lines, remaining, seq]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWaiter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWaiter must be used within WaiterStoreProvider");
  return ctx;
}

/** Danh sách bàn của chi nhánh cùng khu vực — dùng vẽ sơ đồ. */
export const branchFloorTables: FloorTable[] = floorTables;

/** Phút đã chờ tính từ một mốc "HH:MM". */
export { minutesSince };
