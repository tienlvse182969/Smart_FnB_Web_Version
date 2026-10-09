/**
 * Bộ lọc màn Báo cáo chi nhánh (BM-03) ↔ chuỗi truy vấn trên URL (quyết định 77). Hàm thuần.
 * Mặc định: 7 ngày gần nhất giờ Việt Nam, kỳ theo ngày. Chọn nhanh Hôm nay / 7 ngày / 30 ngày / tuỳ chọn. Tham số lạ hoặc hỏng
 * (ngày không tồn tại, từ > đến, quá 366 ngày, kỳ không biết) bị bỏ qua: cả khoảng về mặc định / kỳ về "ngày".
 */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { ManagerReportGranularity, ManagerReportQuery } from "../../types";
import { MANAGER_REPORT_LIMIT, MANAGER_REPORT_MAX_DAYS } from "../../api/modules/managerReport/query";
import { todayInVn, type RangePreset } from "../../lib/reportFormat";

dayjs.extend(customParseFormat);

export type ReportPreset = RangePreset | "custom";

export interface ReportFilters {
  /** Ngày giờ Việt Nam `YYYY-MM-DD`. */
  from: string;
  to: string;
  granularity: ManagerReportGranularity;
}

export const GRANULARITY_OPTIONS: { value: ManagerReportGranularity; label: string }[] = [
  { value: "day", label: "Theo ngày" },
  { value: "week", label: "Theo tuần" },
  { value: "month", label: "Theo tháng" },
];

export function defaultReportFilters(today: string = todayInVn()): ReportFilters {
  return { ...presetRangeAt("7d", today), granularity: "day" };
}

/** `presetRange` của reportFormat tính theo "bây giờ"; ở đây tính theo `today` truyền vào để test được. */
function presetRangeAt(preset: RangePreset, today: string): { from: string; to: string } {
  const days = preset === "today" ? 1 : preset === "7d" ? 7 : 30;
  return { from: dayjs(today).subtract(days - 1, "day").format("YYYY-MM-DD"), to: today };
}

const isDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && dayjs(v, "YYYY-MM-DD", true).isValid();

export function parseReportFilters(search: string | URLSearchParams, today: string = todayInVn()): ReportFilters {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const base = defaultReportFilters(today);
  const from = params.get("from");
  const to = params.get("to");
  let range = { from: base.from, to: base.to };
  if (isDay(from) && isDay(to) && from <= to && dayjs(to).diff(dayjs(from), "day") + 1 <= MANAGER_REPORT_MAX_DAYS) range = { from, to };
  const g = params.get("granularity");
  const granularity = GRANULARITY_OPTIONS.find((o) => o.value === g)?.value ?? "day";
  return { ...range, granularity };
}

/** Chuỗi truy vấn cho URL: chỉ tham số khác mặc định. */
export function reportFiltersToSearch(filters: ReportFilters, today: string = todayInVn()): URLSearchParams {
  const base = defaultReportFilters(today);
  const out = new URLSearchParams();
  if (filters.from !== base.from || filters.to !== base.to) {
    out.set("from", filters.from);
    out.set("to", filters.to);
  }
  if (filters.granularity !== "day") out.set("granularity", filters.granularity);
  return out;
}

/** Khoảng đang chọn khớp lựa chọn nhanh nào (tính theo hôm nay giờ Việt Nam); không khớp = tuỳ chọn. */
export function presetOf(filters: ReportFilters, today: string = todayInVn()): ReportPreset {
  for (const p of ["today", "7d", "30d"] as const) {
    const r = presetRangeAt(p, today);
    if (filters.from === r.from && filters.to === r.to) return p;
  }
  return "custom";
}

export function withPreset(filters: ReportFilters, preset: RangePreset, today: string = todayInVn()): ReportFilters {
  return { ...filters, ...presetRangeAt(preset, today) };
}

export function toReportQuery(filters: ReportFilters): ManagerReportQuery {
  return { from: filters.from, to: filters.to, granularity: filters.granularity, limit: MANAGER_REPORT_LIMIT };
}

/**
 * Thời gian pha trung bình: `null` → "Chưa có dữ liệu"; dưới 1 giây → "Dưới 1 giây"; còn lại phút:giây ("2:05", "0:45").
 * BE trả số giây (có phần lẻ); làm tròn tới giây.
 */
export function formatPrepTime(seconds: number | null): string {
  if (seconds === null) return "Chưa có dữ liệu";
  if (seconds < 1) return "Dưới 1 giây";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Nhãn mốc thời gian của biểu đồ doanh thu: ngày `DD/MM`, tuần `Tuần DD/MM` (thứ Hai), tháng `MM/YYYY`. */
export function bucketLabel(bucket: string, granularity: ManagerReportGranularity): string {
  const d = dayjs(bucket);
  if (granularity === "month") return d.format("MM/YYYY");
  return granularity === "week" ? `Tuần ${d.format("DD/MM")}` : d.format("DD/MM");
}
