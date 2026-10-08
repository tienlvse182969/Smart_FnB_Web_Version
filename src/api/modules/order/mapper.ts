/**
 * Chuyển phản hồi `GET /manager/orders` và `GET /manager/orders/:id` (BE `manager-operations.service.ts`) sang kiểu của web.
 * Mọi trường đọc phòng thủ: thiếu hoặc sai kiểu thì rơi về mặc định, không ném lỗi (BE là nguồn ngoài).
 * Tiền BE là chuỗi thập phân ("65000", "280000.00") → số.
 */
import type { OrderDetail, OrderDetailLine, OrderDetailOption, OrderPage, OrderPaymentRecord, OrderSummary } from "../../../types";
import { parseAmount } from "../../../lib/reportFormat";

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const strOr = (v: unknown, fallback: string): string => str(v) ?? fallback;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObject) : []);

/** Họ tên của nhân viên (`firstName lastName`, cùng cách `account/mapper.ts`), thiếu thì mã nhân viên. */
export function mapActorName(v: unknown): string | null {
  if (!isObject(v)) return null;
  const name = `${str(v.firstName) ?? ""} ${str(v.lastName) ?? ""}`.trim();
  return name || str(v.employeeCode);
}

function mapPayment(raw: Raw): OrderPaymentRecord {
  return {
    id: strOr(raw.id, ""),
    paymentCode: strOr(raw.paymentCode, ""),
    method: strOr(raw.method, "OTHER"),
    status: strOr(raw.status, "PENDING"),
    amount: parseAmount(raw.amount as string | number | null),
    receivedAmount: raw.receivedAmount == null ? null : parseAmount(raw.receivedAmount as string | number),
    transactionRef: str(raw.transactionRef),
    confirmationReason: str(raw.confirmationReason),
    confirmedAt: str(raw.confirmedAt),
    paidAt: str(raw.paidAt),
    createdAt: str(raw.createdAt),
    failureReason: str(raw.failureReason),
    processedBy: mapActorName(raw.processedBy),
  };
}

/** Khoản thanh toán của đơn: của đơn và của phiên bàn (v7) gộp lại, bỏ trùng theo id. */
function mapPayments(raw: Raw): OrderPaymentRecord[] {
  const own = list(raw.payments);
  const session = isObject(raw.tableSession) ? list(raw.tableSession.payments) : [];
  const seen = new Set<string>();
  const out: OrderPaymentRecord[] = [];
  for (const p of [...own, ...session]) {
    const mapped = mapPayment(p);
    if (mapped.id && seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(mapped);
  }
  return out;
}

export function mapOrderSummary(raw: Raw): OrderSummary {
  return {
    id: strOr(raw.id, ""),
    orderCode: strOr(raw.orderCode, ""),
    callNumber: num(raw.callNumber),
    placedAt: str(raw.placedAt),
    paidAt: str(raw.paidAt),
    total: parseAmount(raw.totalAmount as string | number | null),
    status: strOr(raw.status, "UNKNOWN"),
    paymentStatus: strOr(raw.paymentStatus, "UNKNOWN"),
    payments: mapPayments(raw),
    cashierName: mapActorName(raw.createdByCashier) ?? mapActorName(raw.createdByWaiter),
    cancelledAt: str(raw.cancelledAt),
    cancellationReason: str(raw.cancellationReason),
  };
}

export function mapOrderPage(raw: unknown, fallback: { page: number; limit: number }): OrderPage {
  const body = isObject(raw) ? raw : {};
  const items = list(body.items).map(mapOrderSummary);
  return {
    items,
    total: num(body.total) ?? items.length,
    page: num(body.page) ?? fallback.page,
    limit: num(body.limit) ?? fallback.limit,
  };
}

/** `selectedOptions` là ảnh chụp lúc bán (BR-15): `{id, name, groupCode, groupName, priceDelta}`. */
function mapOptions(v: unknown): OrderDetailOption[] {
  return list(v).map((o) => ({
    groupName: str(o.groupName),
    name: strOr(o.name, "—"),
    priceDelta: parseAmount(o.priceDelta as string | number | null),
  }));
}

function mapLine(raw: Raw): OrderDetailLine {
  return {
    id: strOr(raw.id, ""),
    name: strOr(raw.itemName, "—"),
    unitPrice: parseAmount(raw.unitPrice as string | number | null),
    quantity: num(raw.quantity) ?? 0,
    options: mapOptions(raw.selectedOptions),
    total: parseAmount(raw.totalPrice as string | number | null),
    status: strOr(raw.status, "UNKNOWN"),
    note: str(raw.specialInstructions),
    cancellationReason: str(raw.cancellationReason),
  };
}

export function mapOrderDetail(raw: unknown): OrderDetail {
  const body = isObject(raw) ? raw : {};
  return {
    ...mapOrderSummary(body),
    subtotal: parseAmount(body.subtotal as string | number | null),
    discount: parseAmount(body.discountAmount as string | number | null),
    tax: parseAmount(body.taxAmount as string | number | null),
    serviceCharge: parseAmount(body.serviceCharge as string | number | null),
    note: str(body.note),
    cancelledBy: mapActorName(body.cancelledBy),
    lines: list(body.items).map(mapLine),
  };
}
