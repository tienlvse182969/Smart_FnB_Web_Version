import type { LedgerQuery } from "../../../types";
import { vnDayEndIso, vnDayStartIso } from "../order/query";

/** `from`/`to` là ngày giờ Việt Nam (BR-50): đầu ngày `from` đến cuối ngày `to`. */
export function buildLedgerQueryString(query: LedgerQuery): string {
  const search = new URLSearchParams();
  search.set("from", vnDayStartIso(query.from));
  search.set("to", vnDayEndIso(query.to));
  return `?${search.toString()}`;
}
