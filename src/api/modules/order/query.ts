/**
 * Tham số của `GET /manager/orders` (BM-04). BE: `from` bao gồm, `to` loại trừ, cả hai theo `placedAt`, ISO 8601 CÓ múi giờ
 * (`manager.dto.ts` `IsDateString({ strict: true })`); `limit` 1–100; `callNumber` số nguyên ≥ 1. Danh sách luôn kèm
 * `type=COUNTER_PICKUP` (quyết định 61): đơn DINE_IN là dữ liệu v7.
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { OrderQuery } from "../../../types";
import { VN_TIMEZONE } from "../../../lib/reportFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export const ORDER_TYPE = "COUNTER_PICKUP";
export const ORDER_PAGE_SIZES = [20, 50, 100] as const;
export const ORDER_MAX_LIMIT = 100;

/** `2026-10-08` → `2026-10-08T00:00:00.000+07:00` (đầu ngày giờ Việt Nam). */
export function vnDayStartIso(day: string): string {
  return dayjs.tz(`${day} 00:00:00.000`, "YYYY-MM-DD HH:mm:ss.SSS", VN_TIMEZONE).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
}

/** `2026-10-08` → `2026-10-08T23:59:59.999+07:00` (cuối ngày giờ Việt Nam). */
export function vnDayEndIso(day: string): string {
  return dayjs.tz(`${day} 23:59:59.999`, "YYYY-MM-DD HH:mm:ss.SSS", VN_TIMEZONE).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
}

/** Chuỗi truy vấn: tham số rỗng không gửi; luôn có `type`, `page`, `limit`. */
export function buildOrderQueryString(query: OrderQuery): string {
  const search = new URLSearchParams();
  search.set("type", ORDER_TYPE);
  if (query.from) search.set("from", query.from);
  if (query.to) search.set("to", query.to);
  if (query.callNumber !== undefined) search.set("callNumber", String(query.callNumber));
  const code = query.orderCode?.trim();
  if (code) search.set("orderCode", code);
  if (query.status) search.set("status", query.status);
  if (query.paymentStatus) search.set("paymentStatus", query.paymentStatus);
  if (query.paymentMethod) search.set("paymentMethod", query.paymentMethod);
  search.set("page", String(Math.max(1, Math.trunc(query.page) || 1)));
  search.set("limit", String(Math.min(ORDER_MAX_LIMIT, Math.max(1, Math.trunc(query.limit) || ORDER_PAGE_SIZES[0]))));
  return `?${search.toString()}`;
}
