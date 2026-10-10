/**
 * Mock của module order: dữ liệu đơn giả lập (cùng bộ với báo cáo và trợ lý AI mock, `getBranchOrders`) đổi sang HÌNH DẠNG BE
 * (mã trạng thái BE, tiền là số) cộng vài đơn cố định hôm nay để đủ mọi trạng thái và có đơn kèm tuỳ chọn/topping (quyết định 67).
 * Ghi duy nhất: xác nhận thủ công chuyển khoản (BM-05, 7.4) — nhớ trong bộ nhớ (WeakMap theo trạng thái chuỗi, mất khi F5/`resetMockStates`),
 * cùng luật với BE `d98b4c1`. Huỷ đơn đã trả thêm ở 7.6.
 *
 * Kịch bản xác nhận thủ công (id đơn kết thúc bằng): `scn-qr-waiting` (QR chờ), `scn-mismatch-short` (Lệch số tiền, nhận thiếu),
 * `scn-mismatch-over` (Lệch số tiền, nhận dư), `scn-qr-failed` (khoản FAILED), `scn-cancelled-pending` (đơn huỷ còn khoản chờ),
 * `scn-qr-conflict` (bấm xác nhận thì BE trả 409 PAYMENT_ALREADY_SETTLED: webhook vừa về).
 */
import type { ConfirmPaymentInput, Order, OrderDetail, OrderDetailLine, OrderLine, OrderPage, OrderPaymentRecord, OrderQuery, OrderSummary } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { hashString } from "../../mock/prng";
import { getBranchOrders, getChainState } from "../../mock/store";
import type { OrderApi } from "./index";

const CASHIER = "Thu ngân mẫu";
const MANAGER = "Quản lý mẫu";
const MANUAL_SUFFIX = "scn-manual";
const MULTI_SUFFIX = "scn-multi";
const MISMATCH_SHORT_SUFFIX = "scn-mismatch-short";
const MISMATCH_OVER_SUFFIX = "scn-mismatch-over";
const FAILED_SUFFIX = "scn-qr-failed";
const CANCELLED_PENDING_SUFFIX = "scn-cancelled-pending";
const CONFLICT_SUFFIX = "scn-qr-conflict";

/** Một lần xác nhận đã nhận (thành công, hoặc webhook "về trước" ở kịch bản xung đột). */
interface Confirmation {
  receivedAmount: number;
  reason: string | null;
  transactionRef: string | null;
  at: string;
  /** false = webhook PayOS (không có người xác nhận/lý do). */
  manual: boolean;
}

const overlays = new WeakMap<object, Map<string, Confirmation>>();
function overlayOf(chainId: string): Map<string, Confirmation> {
  const key = getChainState(chainId);
  let map = overlays.get(key);
  if (!map) overlays.set(key, (map = new Map()));
  return map;
}

const ORDER_STATUS_OF: Record<Order["status"], string> = {
  pendingPayment: "CONFIRMED",
  paid: "SUBMITTED",
  preparing: "PREPARING",
  ready: "READY",
  completed: "DELIVERED",
  cancelled: "CANCELLED",
  needsAttention: "REQUIRES_ATTENTION",
};

const LINE_STATUS_OF: Record<OrderLine["status"], string> = {
  queued: "QUEUED",
  preparing: "PREPARING",
  done: "READY",
  soldOut: "OUT_OF_STOCK",
  cancelled: "CANCELLED",
};

/** Đơn cố định hôm nay (id ổn định theo chi nhánh), đủ các trạng thái mà dữ liệu sinh ngẫu nhiên có thể không có đúng lúc. */
function scenarioOrders(chainId: string, branchId: string, now: Date): Order[] {
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const base = { chainId, branchId } as const;
  return [
    {
      ...base,
      id: `${branchId}-scn-cash-waiting`,
      callNumber: null,
      createdAt: at(2),
      status: "pendingPayment",
      paymentMethod: "cash",
      paymentStatus: "initiated",
      lines: [{ id: "s1", menuItemId: "m-scn-1", name: "Cơm gà nướng", unitPrice: 65000, quantity: 1, options: [], status: "queued", lineTotal: 65000 }],
      total: 65000,
    },
    {
      ...base,
      id: `${branchId}-scn-qr-waiting`,
      callNumber: null,
      createdAt: at(5),
      status: "pendingPayment",
      paymentMethod: "qr",
      paymentStatus: "awaitingTransfer",
      lines: [{ id: "s2", menuItemId: "m-scn-2", name: "Canh chua cá", unitPrice: 75000, quantity: 1, options: [], status: "queued", lineTotal: 75000 }],
      total: 75000,
    },
    {
      ...base,
      id: `${branchId}-${MISMATCH_SHORT_SUFFIX}`,
      callNumber: null,
      createdAt: at(7),
      status: "needsAttention",
      paymentMethod: "qr",
      paymentStatus: "amountMismatch",
      lines: [{ id: "s8", menuItemId: "m-scn-8", name: "Canh chua cá", unitPrice: 75000, quantity: 1, options: [], status: "queued", lineTotal: 75000 }],
      total: 75000,
    },
    {
      ...base,
      id: `${branchId}-${MISMATCH_OVER_SUFFIX}`,
      callNumber: null,
      createdAt: at(9),
      status: "needsAttention",
      paymentMethod: "qr",
      paymentStatus: "amountMismatch",
      lines: [{ id: "s9", menuItemId: "m-scn-9", name: "Cơm gà nướng", unitPrice: 65000, quantity: 1, options: [], status: "queued", lineTotal: 65000 }],
      total: 65000,
    },
    {
      ...base,
      id: `${branchId}-${FAILED_SUFFIX}`,
      callNumber: null,
      createdAt: at(12),
      status: "pendingPayment",
      paymentMethod: "qr",
      paymentStatus: "expired",
      lines: [{ id: "s10", menuItemId: "m-scn-10", name: "Trà đào", unitPrice: 35000, quantity: 1, options: [], status: "queued", lineTotal: 35000 }],
      total: 35000,
    },
    {
      ...base,
      id: `${branchId}-${CANCELLED_PENDING_SUFFIX}`,
      callNumber: null,
      createdAt: at(14),
      status: "cancelled",
      paymentMethod: "qr",
      paymentStatus: "cancelled",
      lines: [{ id: "s11", menuItemId: "m-scn-11", name: "Cơm gà nướng", unitPrice: 65000, quantity: 1, options: [], status: "cancelled", lineTotal: 65000 }],
      total: 65000,
      cancelReason: "Khách bỏ đi",
    },
    {
      ...base,
      id: `${branchId}-${CONFLICT_SUFFIX}`,
      callNumber: null,
      createdAt: at(4),
      status: "pendingPayment",
      paymentMethod: "qr",
      paymentStatus: "awaitingTransfer",
      lines: [{ id: "s12", menuItemId: "m-scn-12", name: "Trà đào", unitPrice: 35000, quantity: 2, options: [], status: "queued", lineTotal: 70000 }],
      total: 70000,
    },
    ...(
      [
        ["paid", 3, "paid", "queued", 901],
        ["preparing", 8, "preparing", "preparing", 902],
        ["ready", 15, "ready", "done", 903],
      ] as const
    ).map(
      ([key, minutes, status, lineStatus, call]): Order => ({
        ...base,
        id: `${branchId}-scn-${key}`,
        callNumber: call,
        createdAt: at(minutes),
        status,
        paymentMethod: "cash",
        paymentStatus: "paid",
        lines: [{ id: `s-${key}`, menuItemId: "m-scn-4", name: "Cơm gà nướng", unitPrice: 65000, quantity: 1, options: [], status: lineStatus, lineTotal: 65000 }],
        total: 65000,
      }),
    ),
    {
      ...base,
      id: `${branchId}-scn-options`,
      callNumber: 900,
      createdAt: at(30),
      status: "completed",
      paymentMethod: "qr",
      paymentStatus: "paid",
      lines: [
        {
          id: "s3",
          menuItemId: "m-scn-3",
          name: "Trà đào",
          unitPrice: 35000,
          quantity: 2,
          options: [
            { groupName: "Kích cỡ", optionName: "L", priceDelta: 10000 },
            { groupName: "Mức đường", optionName: "50% đường", priceDelta: 0 },
            { groupName: "Topping", optionName: "Trân châu đen", priceDelta: 5000 },
          ],
          status: "done",
          lineTotal: 100000,
        },
      ],
      total: 100000,
    },
    {
      ...base,
      id: `${branchId}-${MANUAL_SUFFIX}`,
      callNumber: 904,
      createdAt: at(45),
      status: "completed",
      paymentMethod: "qr",
      paymentStatus: "paid",
      lines: [{ id: "s5", menuItemId: "m-scn-5", name: "Canh chua cá", unitPrice: 75000, quantity: 1, options: [], status: "done", lineTotal: 75000 }],
      total: 75000,
    },
    {
      ...base,
      id: `${branchId}-${MULTI_SUFFIX}`,
      callNumber: 905,
      createdAt: at(50),
      status: "completed",
      paymentMethod: "cash",
      paymentStatus: "paid",
      lines: [
        { id: "s6", menuItemId: "m-scn-6", name: "Cơm gà nướng", unitPrice: 65000, quantity: 1, options: [], status: "done", lineTotal: 65000 },
        { id: "s7", menuItemId: "m-scn-7", name: "Canh chua cá", unitPrice: 75000, quantity: 2, options: [], status: "done", lineTotal: 150000 },
      ],
      total: 215000,
    },
  ];
}

function paymentOf(order: Order, paid: boolean, processedBy: string): OrderPaymentRecord[] {
  const mismatch = order.paymentStatus === "amountMismatch";
  const pending = order.paymentStatus === "awaitingTransfer" || mismatch;
  const keep = order.id.endsWith(FAILED_SUFFIX) || order.id.endsWith(CANCELLED_PENDING_SUFFIX);
  if (!paid && !pending && !keep && order.paymentStatus !== "initiated") return [];
  const method = order.paymentMethod === "cash" ? "CASH" : "BANK_TRANSFER";
  const record: OrderPaymentRecord = {
    id: `${order.id}-pay`,
    paymentCode: `PAY-${order.id.slice(-8).toUpperCase()}`,
    method,
    status: paid ? "SUCCESS" : "PENDING",
    amount: order.total,
    receivedAmount: null,
    transactionRef: null,
    confirmationReason: null,
    confirmedAt: paid ? order.createdAt : null,
    paidAt: paid ? order.createdAt : null,
    createdAt: order.createdAt,
    failureReason: null,
    processedBy,
  };
  // Khoản lệch số tiền (BR-28): BE lưu số thực nhận ở `receivedAmount`; kịch bản "dư" nhận hơn, còn lại nhận thiếu 5.000.
  if (mismatch) {
    const received = order.id.endsWith(MISMATCH_OVER_SUFFIX) ? order.total + 5000 : Math.max(order.total - 5000, 1000);
    return [{ ...record, status: "AMOUNT_MISMATCH", receivedAmount: received }];
  }
  if (order.id.endsWith(FAILED_SUFFIX)) return [{ ...record, status: "FAILED", failureReason: "PAYOS_EXPIRED" }];
  if (order.id.endsWith(CANCELLED_PENDING_SUFFIX)) return [{ ...record, method: "BANK_TRANSFER", status: "PENDING" }];
  // Đơn xác nhận thủ công (BM-05): Manager xác nhận, có lý do, số tiền thực nhận và mã giao dịch.
  if (order.id.endsWith(MANUAL_SUFFIX)) {
    return [{ ...record, receivedAmount: order.total + 5000, transactionRef: "FT26100812345", confirmationReason: "Khách chìa màn hình chuyển khoản thành công, webhook không về", processedBy: MANAGER }];
  }
  // Đơn nhiều khoản: một QR bị bỏ (còn chờ) rồi thu tiền mặt.
  if (order.id.endsWith(MULTI_SUFFIX)) {
    return [{ ...record, id: `${record.id}-qr`, paymentCode: `${record.paymentCode}-QR`, method: "BANK_TRANSFER", status: "PENDING", confirmedAt: null, paidAt: null }, record];
  }
  return [record];
}

/** Mã đơn mock suy từ id (dùng chung với báo cáo chi nhánh mock để đơn huỷ dẫn đúng sang chi tiết). */
export function mockOrderCode(id: string): string {
  return `CTR-${String(hashString(id)).padStart(10, "0")}`;
}

/** Số gọi mock cấp khi xác nhận thủ công: nối tiếp các số kịch bản (901–905). */
const MANUAL_CALL_BASE = 920;

function toSummary(order: Order, confirmations?: Map<string, Confirmation>): OrderSummary {
  const summary = baseSummary(order);
  const hit = summary.payments.find((p) => confirmations?.has(p.id));
  if (!hit || !confirmations) return summary;
  // Đã xác nhận (trong phiên mock): như BE `settle` — khoản SUCCESS, đơn SUBMITTED/PAID, có số gọi.
  const c = confirmations.get(hit.id)!;
  const index = [...confirmations.keys()].indexOf(hit.id);
  return {
    ...summary,
    status: "SUBMITTED",
    paymentStatus: "PAID",
    paidAt: c.at,
    callNumber: MANUAL_CALL_BASE + index,
    payments: summary.payments.map((p) =>
      p.id === hit.id
        ? {
            ...p,
            status: "SUCCESS",
            receivedAmount: c.receivedAmount,
            transactionRef: c.transactionRef,
            confirmationReason: c.manual ? c.reason : null,
            confirmedAt: c.at,
            paidAt: c.at,
            failureReason: null,
            processedBy: c.manual ? MANAGER : p.processedBy,
          }
        : p,
    ),
  };
}

function baseSummary(order: Order): OrderSummary {
  // Đơn huỷ SAU khi trả vẫn PAID (5.5: huỷ đơn đã trả không đổi trạng thái thanh toán).
  const paid = order.paymentStatus === "paid" || order.refund !== undefined;
  return {
    id: order.id,
    // Mã đơn mock suy từ id nhưng không chứa chữ của id (id kịch bản có chữ như "preparing"), để dễ phân biệt với nhãn trạng thái.
    orderCode: mockOrderCode(order.id),
    callNumber: order.callNumber,
    placedAt: order.createdAt,
    paidAt: paid ? order.createdAt : null,
    total: order.total,
    status: ORDER_STATUS_OF[order.status],
    paymentStatus: paid ? "PAID" : "UNPAID",
    payments: paymentOf(order, paid, CASHIER),
    cashierName: CASHIER,
    cancelledAt: order.status === "cancelled" ? order.createdAt : null,
    cancellationReason: order.cancelReason ?? null,
  };
}

function toLine(line: OrderLine, delivered: boolean): OrderDetailLine {
  return {
    id: line.id,
    name: line.name,
    // Như BE: đơn giá lúc bán ĐÃ gồm giá cộng thêm của tuỳ chọn (`counter-operations.service.ts` `priceCartItem`).
    unitPrice: line.unitPrice + line.options.reduce((sum, o) => sum + o.priceDelta, 0),
    quantity: line.quantity,
    options: line.options.map((o) => ({ groupName: o.groupName, name: o.optionName, priceDelta: o.priceDelta })),
    total: line.lineTotal,
    status: delivered && line.status === "done" ? "DELIVERED" : LINE_STATUS_OF[line.status],
    note: line.id === "s3" ? "ít đá" : null,
    cancellationReason: null,
  };
}

function toDetail(order: Order, confirmations?: Map<string, Confirmation>): OrderDetail {
  const summary = toSummary(order, confirmations);
  return {
    ...summary,
    subtotal: order.total,
    discount: 0,
    tax: 0,
    serviceCharge: 0,
    note: null,
    cancelledBy: order.status === "cancelled" ? (order.refund ? MANAGER : CASHIER) : null,
    lines: order.lines.map((l) => toLine(l, order.status === "completed")),
  };
}

function allOrders(chainId: string, branchId: string): Order[] {
  return [...scenarioOrders(chainId, branchId, new Date()), ...getBranchOrders(chainId, branchId)];
}

function matches(order: Order, query: OrderQuery, confirmations: Map<string, Confirmation>): boolean {
  const s = toSummary(order, confirmations);
  const t = new Date(order.createdAt).getTime();
  if (query.from && t < new Date(query.from).getTime()) return false;
  if (query.to && t >= new Date(query.to).getTime()) return false;
  if (query.callNumber !== undefined && s.callNumber !== query.callNumber) return false;
  const code = query.orderCode?.trim().toLowerCase();
  if (code && !s.orderCode.toLowerCase().includes(code)) return false;
  if (query.status && s.status !== query.status) return false;
  if (query.paymentStatus && s.paymentStatus !== query.paymentStatus) return false;
  if (query.paymentMethod && !s.payments.some((p) => p.method === query.paymentMethod)) return false;
  return true;
}

export const orderMock: OrderApi = {
  async listOrders({ chainId, branchId }, query): Promise<OrderPage> {
    await mockDelay();
    const confirmations = overlayOf(chainId);
    const rows = allOrders(chainId, branchId)
      .filter((o) => matches(o, query, confirmations))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = (query.page - 1) * query.limit;
    return { items: rows.slice(start, start + query.limit).map((o) => toSummary(o, confirmations)), total: rows.length, page: query.page, limit: query.limit };
  },

  async getOrder({ chainId, branchId }, orderId) {
    await mockDelay();
    const found = allOrders(chainId, branchId).find((o) => o.id === orderId);
    if (!found) throw new ApiError(404, "Đơn không tồn tại");
    return toDetail(found, overlayOf(chainId));
  },

  async confirmPayment({ chainId, branchId }, paymentId, input: ConfirmPaymentInput) {
    await mockDelay();
    // BE `payments.service.ts:144-186`: chỉ kiểm quyền chi nhánh (không `assertSubscriptionAllowsWrite`); mock vẫn mô phỏng chỉ đọc
    // chung để màn thử được đường báo lỗi (quyết định 85).
    assertMockWritable();
    const reason = input.reason.trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new ApiError(400, "A manual confirmation reason of 3 to 500 characters is required");
    }
    if (!Number.isFinite(input.receivedAmount) || input.receivedAmount <= 0) throw new ApiError(400, "Actual received amount is required");
    const confirmations = overlayOf(chainId);
    const order = allOrders(chainId, branchId).find((o) => toSummary(o).payments.some((p) => p.id === paymentId));
    const payment = order && toSummary(order).payments.find((p) => p.id === paymentId);
    if (!order || !payment) throw new ApiError(404, "Payment not found");
    if (payment.method !== "BANK_TRANSFER") throw new ApiError(409, "Only bank transfers can be confirmed manually");
    const now = new Date().toISOString();
    if (order.id.endsWith(CONFLICT_SUFFIX) && !confirmations.has(paymentId)) {
      // Webhook PayOS vừa về trước khi Manager bấm: khoản đã thanh toán, lần xác nhận bị từ chối.
      confirmations.set(paymentId, { receivedAmount: payment.amount, reason: null, transactionRef: null, at: now, manual: false });
    }
    if (confirmations.has(paymentId) || (payment.status !== "PENDING" && payment.status !== "AMOUNT_MISMATCH")) {
      throw new ApiError(409, "PAYMENT_ALREADY_SETTLED");
    }
    if (order.status === "cancelled") throw new ApiError(409, "Order is no longer awaiting payment");
    if (input.receivedAmount < payment.amount) {
      throw new ApiError(409, "Số tiền thực nhận thấp hơn tổng tiền đơn hàng.", [], "PAYMENT_AMOUNT_INSUFFICIENT");
    }
    confirmations.set(paymentId, { receivedAmount: input.receivedAmount, reason, transactionRef: input.transactionRef?.trim() || null, at: now, manual: true });
  },
};

