/**
 * Mock của module order: dữ liệu đơn giả lập (cùng bộ với báo cáo và trợ lý AI mock, `getBranchOrders`) đổi sang HÌNH DẠNG BE
 * (mã trạng thái BE, tiền là số) cộng vài đơn cố định hôm nay để đủ mọi trạng thái và có đơn kèm tuỳ chọn/topping (quyết định 67).
 * Chỉ đọc: mock chưa có thao tác ghi đơn (xác nhận thủ công, huỷ đơn đã trả thêm ở 7.4–7.6).
 */
import type { Order, OrderDetail, OrderDetailLine, OrderLine, OrderPage, OrderPaymentRecord, OrderQuery, OrderSummary } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { hashString } from "../../mock/prng";
import { getBranchOrders } from "../../mock/store";
import type { OrderApi } from "./index";

const CASHIER = "Thu ngân mẫu";
const MANAGER = "Quản lý mẫu";
const MANUAL_SUFFIX = "scn-manual";
const MULTI_SUFFIX = "scn-multi";

const ORDER_STATUS_OF: Record<Order["status"], string> = {
  pendingPayment: "CONFIRMED",
  paid: "SUBMITTED",
  preparing: "PREPARING",
  ready: "READY",
  completed: "DELIVERED",
  cancelled: "CANCELLED",
  needsAttention: "CONFIRMED",
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
  const pending = order.paymentStatus === "awaitingTransfer" || order.paymentStatus === "amountMismatch";
  if (!paid && !pending && order.paymentStatus !== "initiated") return [];
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

function toSummary(order: Order): OrderSummary {
  // Đơn huỷ SAU khi trả vẫn PAID (5.5: huỷ đơn đã trả không đổi trạng thái thanh toán).
  const paid = order.paymentStatus === "paid" || order.refund !== undefined;
  return {
    id: order.id,
    // Mã đơn mock suy từ id nhưng không chứa chữ của id (id kịch bản có chữ như "preparing"), để dễ phân biệt với nhãn trạng thái.
    orderCode: `CTR-${String(hashString(order.id)).padStart(10, "0")}`,
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

function toDetail(order: Order): OrderDetail {
  const summary = toSummary(order);
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

function matches(order: Order, query: OrderQuery): boolean {
  const s = toSummary(order);
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
    const rows = allOrders(chainId, branchId)
      .filter((o) => matches(o, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = (query.page - 1) * query.limit;
    return { items: rows.slice(start, start + query.limit).map(toSummary), total: rows.length, page: query.page, limit: query.limit };
  },

  async getOrder({ chainId, branchId }, orderId) {
    await mockDelay();
    const found = allOrders(chainId, branchId).find((o) => o.id === orderId);
    if (!found) throw new ApiError(404, "Đơn không tồn tại");
    return toDetail(found);
  },
};

