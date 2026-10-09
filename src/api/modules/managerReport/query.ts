/**
 * Tham số của `GET /manager/reports` (BM-03). BE (`manager.dto.ts` `ManagerReportQueryDto`): `from`/`to` là NGÀY `YYYY-MM-DD` theo giờ chi nhánh,
 * cả hai bao gồm, tối đa 366 ngày, mặc định 30 ngày gần nhất; `granularity` day | week | month; `limit` 1–50 (mặc định 10).
 * Web luôn gửi đủ bốn tham số (ngày giờ Việt Nam, QĐ 68/77).
 */
import type { ManagerReportQuery } from "../../../types";

export const MANAGER_REPORT_MAX_DAYS = 366;
export const MANAGER_REPORT_LIMIT = 10;

export function buildManagerReportQueryString(query: ManagerReportQuery): string {
  const search = new URLSearchParams();
  search.set("from", query.from);
  search.set("to", query.to);
  search.set("granularity", query.granularity);
  search.set("limit", String(Math.min(50, Math.max(1, Math.trunc(query.limit) || MANAGER_REPORT_LIMIT))));
  return `?${search.toString()}`;
}
