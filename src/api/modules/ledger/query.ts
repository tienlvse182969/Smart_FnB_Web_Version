import type { LedgerQuery } from "../../../types";
import { vnDayEndIso, vnDayStartIso } from "../order/query";

export const LEDGER_PAGE_SIZES = [20, 50, 100] as const;

/** `from`/`to` là ngày giờ Việt Nam (BR-50): đầu ngày `from` đến cuối ngày `to`. Tham số trống không gửi. */
export function buildLedgerQueryString(query: LedgerQuery): string {
  const search = new URLSearchParams();
  search.set("from", vnDayStartIso(query.from));
  search.set("to", vnDayEndIso(query.to));
  if (query.direction) search.set("direction", query.direction);
  if (query.paymentMethod) search.set("paymentMethod", query.paymentMethod);
  if (query.cashierId) search.set("cashierId", query.cashierId);
  search.set("page", String(Math.max(1, Math.trunc(query.page ?? 1))));
  search.set("pageSize", String(Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 50)))));
  return `?${search.toString()}`;
}
