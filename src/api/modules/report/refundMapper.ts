/**
 * Chuyển phản hồi `GET /api/v1/refunds` (BE `8a315ad`, #99, `paid-order-refund.service.ts` `listRefunds`) sang kiểu web.
 * Mỗi dòng là một `Refund` của Prisma kèm `order { orderCode, callNumber, branch }`. Tiền là chuỗi thập phân. Đọc phòng thủ.
 */
import { parseAmount } from "../../../lib/reportFormat";
import type { ChainRefundPage, ChainRefundRow } from "../../../types";

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

export function mapChainRefund(raw: Raw): ChainRefundRow {
  const order = isObject(raw.order) ? raw.order : {};
  const branch = isObject(order.branch) ? order.branch : {};
  return {
    id: str(raw.id) ?? "",
    orderId: str(raw.orderId) ?? str(order.id) ?? "",
    orderCode: str(order.orderCode) ?? "",
    callNumber: typeof order.callNumber === "number" ? order.callNumber : null,
    branchId: str(branch.id) ?? "",
    branchName: str(branch.name) ?? "",
    amount: parseAmount(raw.amount as string | number | null),
    reason: str(raw.reason) ?? "",
    requestedByRole: str(raw.requestedByRole),
    requestedAt: str(raw.requestedAt),
    method: str(raw.method) ?? "BANK_TRANSFER",
    source: str(raw.source) ?? "MANAGER_CANCELLATION",
  };
}

export function mapChainRefundPage(raw: unknown): ChainRefundPage {
  const body = isObject(raw) ? raw : {};
  const items = Array.isArray(body.items) ? body.items.filter(isObject).map(mapChainRefund) : [];
  return {
    items,
    total: typeof body.total === "number" ? body.total : items.length,
    page: typeof body.page === "number" ? body.page : 1,
    limit: typeof body.limit === "number" ? body.limit : items.length,
  };
}
