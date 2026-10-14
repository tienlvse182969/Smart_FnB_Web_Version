/**
 * Chuyển phản hồi `GET /manager/orders` và `GET /manager/orders/:id` (BE `manager-operations.service.ts`) sang kiểu của web.
 * Mọi trường đọc phòng thủ: thiếu hoặc sai kiểu thì rơi về mặc định, không ném lỗi (BE là nguồn ngoài).
 * Tiền BE là chuỗi thập phân ("65000", "280000.00") → số.
 */
import type { OrderDetail, OrderDetailLine, OrderDetailOption, OrderPage, OrderPaymentRecord, OrderRefundRecord, OrderSummary } from "../../../types";
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
    tenderedAmount: raw.tenderedAmount == null ? null : parseAmount(raw.tenderedAmount as string | number),
    changeAmount: raw.changeAmount == null ? null : parseAmount(raw.changeAmount as string | number),
    expiresAt: str(raw.expiresAt),
    stationName: isObject(raw.station) ? str(raw.station.name) : null,
  };
}

/**
 * Người trong khoản hoàn (BE `fb7cae9`, #73): `{ id, email, profile: { firstName, lastName, employeeCode | ownerCode } }`.
 * Hiện họ tên; thiếu tên thì mã nhân viên/chủ chuỗi, rồi email; không có gì → null (màn hiện vai trò).
 */
export function mapRefundActor(v: unknown): string | null {
  if (!isObject(v)) return null;
  const profile = isObject(v.profile) ? v.profile : null;
  const name = profile ? `${str(profile.firstName) ?? ""} ${str(profile.lastName) ?? ""}`.trim() : "";
  return name || (profile ? (str(profile.employeeCode) ?? str(profile.ownerCode)) : null) || str(v.email);
}

/** Khoản thanh toán của đơn, bỏ trùng theo id. */
function mapPayments(raw: Raw): OrderPaymentRecord[] {
  const seen = new Set<string>();
  const out: OrderPaymentRecord[] = [];
  for (const p of list(raw.payments)) {
    const mapped = mapPayment(p);
    if (mapped.id && seen.has(mapped.id)) continue;
    seen.add(mapped.id);
    out.push(mapped);
  }
  return out;
}

function mapRefund(raw: Raw): OrderRefundRecord {
  return {
    id: strOr(raw.id, ""),
    paymentId: str(raw.paymentId),
    amount: parseAmount(raw.amount as string | number | null),
    status: strOr(raw.status, "PENDING"),
    method: strOr(raw.method, "BANK_TRANSFER"),
    source: strOr(raw.source, "MANAGER_CANCELLATION"),
    reason: strOr(raw.reason, ""),
    requestedByRole: str(raw.requestedByRole),
    requestedAt: str(raw.requestedAt),
    completedByRole: str(raw.completedByRole),
    completedAt: str(raw.completedAt),
    note: str(raw.note),
    lines: list(raw.items).map((i) => ({
      orderItemId: strOr(i.orderItemId, ""),
      quantity: num(i.quantity) ?? 0,
      refundAmount: parseAmount(i.refundAmount as string | number | null),
      isWastage: i.isWastage === true,
    })),
    requestedByName: mapRefundActor(raw.requestedBy),
    completedByName: mapRefundActor(raw.completedBy),
  };
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
    cashierName: mapActorName(raw.createdByCashier),
    cancelledAt: str(raw.cancelledAt),
    cancellationReason: str(raw.cancellationReason),
    refunds: list(raw.refunds).map(mapRefund),
    attentionAt: str(raw.attentionAt),
    attentionReason: str(raw.attentionReason),
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
