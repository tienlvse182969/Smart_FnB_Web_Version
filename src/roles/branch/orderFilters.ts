/**
 * Bộ lọc màn Tra cứu đơn (BM-04) ↔ chuỗi truy vấn trên URL (quyết định 68, 69). Hàm thuần, không đụng React.
 * Mặc định: 7 ngày gần nhất theo giờ Việt Nam (hôm nay cộng 6 ngày trước), 20 dòng mỗi trang, trang 1.
 * Tham số lạ hoặc không hợp lệ bị bỏ qua (về mặc định cho riêng tham số đó); URL chỉ giữ tham số khác mặc định.
 */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { OrderQuery } from "../../types";
import { ORDER_PAYMENT_FILTER, ORDER_STATUS_FILTER, PAYMENT_METHOD_FILTER } from "../../api/modules/order/codes";
import { ORDER_PAGE_SIZES, vnDayEndIso, vnDayStartIso } from "../../api/modules/order/query";
import { todayInVn } from "../../lib/reportFormat";

dayjs.extend(customParseFormat);

export const DEFAULT_RANGE_DAYS = 7;
export const MAX_CALL_NUMBER = 2147483647;
export const MAX_ORDER_CODE_LENGTH = 50;

export interface OrderFilters {
  /** Ngày dương lịch giờ Việt Nam, `YYYY-MM-DD`. */
  from: string;
  to: string;
  /** Chỉ chữ số; rỗng = không lọc. */
  callNumber: string;
  orderCode: string;
  status: string;
  /** PAID | UNPAID. */
  payment: string;
  /** CASH | BANK_TRANSFER. */
  method: string;
  page: number;
  limit: number;
}

export function defaultFilters(today: string = todayInVn()): OrderFilters {
  return {
    from: dayjs(today).subtract(DEFAULT_RANGE_DAYS - 1, "day").format("YYYY-MM-DD"),
    to: today,
    callNumber: "",
    orderCode: "",
    status: "",
    payment: "",
    method: "",
    page: 1,
    limit: ORDER_PAGE_SIZES[0],
  };
}

const isDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && dayjs(v, "YYYY-MM-DD", true).isValid();
const oneOf = (v: string | null, options: { value: string }[]): string => (v && options.some((o) => o.value === v) ? v : "");

/** Số gọi hợp lệ: chuỗi chữ số, giá trị 1 … 2147483647 (BE `@Min(1) @Max(2147483647)`); khác → rỗng. */
export function cleanCallNumber(value: string): string {
  const v = value.trim();
  if (!/^\d{1,10}$/.test(v)) return "";
  const n = Number(v);
  return n >= 1 && n <= MAX_CALL_NUMBER ? String(n) : "";
}

export function cleanOrderCode(value: string): string {
  return value.trim().slice(0, MAX_ORDER_CODE_LENGTH);
}

export function parseFilters(search: string | URLSearchParams, today: string = todayInVn()): OrderFilters {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const base = defaultFilters(today);
  const from = params.get("from");
  const to = params.get("to");
  // Hai ngày phải cùng hợp lệ và từ ≤ đến; không thì cả khoảng về mặc định.
  const range = isDay(from) && isDay(to) && from <= to ? { from, to } : { from: base.from, to: base.to };
  const pageRaw = params.get("page");
  const page = pageRaw && /^\d{1,9}$/.test(pageRaw) && Number(pageRaw) >= 1 ? Number(pageRaw) : 1;
  const limitRaw = Number(params.get("limit"));
  const limit = (ORDER_PAGE_SIZES as readonly number[]).includes(limitRaw) ? limitRaw : base.limit;
  return {
    ...range,
    callNumber: cleanCallNumber(params.get("callNumber") ?? ""),
    orderCode: cleanOrderCode(params.get("orderCode") ?? ""),
    status: oneOf(params.get("status"), ORDER_STATUS_FILTER),
    payment: oneOf(params.get("payment"), ORDER_PAYMENT_FILTER),
    method: oneOf(params.get("method"), PAYMENT_METHOD_FILTER),
    page,
    limit,
  };
}

/** Chuỗi truy vấn cho URL: chỉ tham số khác mặc định. */
export function filtersToSearch(filters: OrderFilters, today: string = todayInVn()): URLSearchParams {
  const base = defaultFilters(today);
  const out = new URLSearchParams();
  if (filters.from !== base.from || filters.to !== base.to) {
    out.set("from", filters.from);
    out.set("to", filters.to);
  }
  if (filters.callNumber) out.set("callNumber", filters.callNumber);
  if (filters.orderCode) out.set("orderCode", filters.orderCode);
  if (filters.status) out.set("status", filters.status);
  if (filters.payment) out.set("payment", filters.payment);
  if (filters.method) out.set("method", filters.method);
  if (filters.limit !== base.limit) out.set("limit", String(filters.limit));
  if (filters.page !== 1) out.set("page", String(filters.page));
  return out;
}

/** Có bộ lọc nào ngoài khoảng ngày mặc định (dùng cho nút Xoá bộ lọc và câu "không có đơn"). */
export function hasExtraFilters(filters: OrderFilters): boolean {
  return !!(filters.callNumber || filters.orderCode || filters.status || filters.payment || filters.method);
}

export function isDefaultFilters(filters: OrderFilters, today: string = todayInVn()): boolean {
  const base = defaultFilters(today);
  return filters.from === base.from && filters.to === base.to && !hasExtraFilters(filters) && filters.limit === base.limit && filters.page === 1;
}

/** Bộ lọc → tham số gửi BE: ngày VN đổi sang ISO có múi giờ (từ đầu ngày `from` đến cuối ngày `to`). */
export function toOrderQuery(filters: OrderFilters): OrderQuery {
  const query: OrderQuery = { from: vnDayStartIso(filters.from), to: vnDayEndIso(filters.to), page: filters.page, limit: filters.limit };
  if (filters.callNumber) query.callNumber = Number(filters.callNumber);
  if (filters.orderCode) query.orderCode = filters.orderCode;
  if (filters.status) query.status = filters.status;
  if (filters.payment) query.paymentStatus = filters.payment;
  if (filters.method) query.paymentMethod = filters.method;
  return query;
}
