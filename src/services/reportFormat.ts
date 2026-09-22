/**
 * Định dạng tiền và khoảng ngày cho báo cáo.
 *
 * Backend cắt ngày theo múi giờ của chuỗi, nên FE phải tính "hôm nay" theo cùng
 * múi giờ đó — lấy ngày từ máy người dùng sẽ lệch một ngày với ai đang ở múi
 * giờ khác.
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** `1250000` → `1.250.000 ₫`. Nhận cả chuỗi thập phân của backend. */
export function formatVnd(value: number | string | null | undefined): string {
  const amount = typeof value === "string" ? Number(value) : (value ?? 0);
  return vndFormatter.format(Number.isFinite(amount) ? amount : 0);
}

/** `7420000` → `7,4 tr` — dùng cho nhãn trục biểu đồ, nơi chỗ hẹp. */
export function formatVndCompact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0";
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} N`;
  return value.toLocaleString("vi-VN");
}

export function formatCount(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString("vi-VN");
}

/** Ngày hôm nay theo giờ Việt Nam, dạng `YYYY-MM-DD` mà backend nhận. */
export function todayInVn(): string {
  return dayjs().tz(VN_TIMEZONE).format("YYYY-MM-DD");
}

/** `2026-09-22` → `22/09`. Nhãn ngắn cho trục thời gian. */
export function formatDayLabel(isoDate: string): string {
  return dayjs(isoDate).format("DD/MM");
}

/** `2026-09-22` → `22/09/2026`. */
export function formatDate(isoDate: string): string {
  return dayjs(isoDate).format("DD/MM/YYYY");
}

export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = "today" | "7d" | "30d";

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
];

/**
 * Khoảng ngày của một lựa chọn nhanh, tính theo giờ Việt Nam.
 * `to` luôn là hôm nay và backend tính cả ngày này, nên "7 ngày" là hôm nay
 * cộng sáu ngày trước đó.
 */
export function presetRange(preset: RangePreset): DateRange {
  const to = dayjs().tz(VN_TIMEZONE);
  const days = preset === "today" ? 1 : preset === "7d" ? 7 : 30;
  return {
    from: to.subtract(days - 1, "day").format("YYYY-MM-DD"),
    to: to.format("YYYY-MM-DD"),
  };
}

/** Mô tả khoảng ngày cho người đọc: `22/09/2026` hoặc `16/09 – 22/09/2026`. */
export function describeRange(range: DateRange): string {
  if (range.from === range.to) return formatDate(range.to);
  return `${formatDayLabel(range.from)} – ${formatDate(range.to)}`;
}
