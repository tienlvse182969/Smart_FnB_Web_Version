/**
 * Cảnh báo gói sắp hết hạn (QĐ 132, mở lại QĐ 56/58; đặc tả 9.2 mục 6.8 chỉ có email nhắc trước 7 ngày, Khánh duyệt thêm dải trong ứng dụng).
 * Hàm thuần: ngày tính theo GIỜ VIỆT NAM (không theo UTC), nên gói hết hạn 23:59 ngày D vẫn là "còn 0 ngày" suốt ngày D.
 */
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { VN_TIMEZONE } from "../lib/reportFormat";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Số ngày lịch (giờ VN) còn lại tới hạn, tính cả hôm nay là 0; âm = đã quá hạn; null nếu không có/không đọc được hạn. */
export function daysUntilExpiry(expiresAt: string | null | undefined, now: number = Date.now()): number | null {
  if (!expiresAt) return null;
  const expiry = dayjs(expiresAt);
  if (!expiry.isValid()) return null;
  const expiryDay = expiry.tz(VN_TIMEZONE).startOf("day");
  const today = dayjs(now).tz(VN_TIMEZONE).startOf("day");
  // `diff` theo "day" của hai mốc cùng múi giờ và cùng 00:00 cho số nguyên đúng kể cả qua đổi giờ (VN không có DST).
  return Math.round(expiryDay.diff(today, "day", true));
}

/** Ngưỡng cảnh báo: 7 ngày cuối trước hạn (cùng ngưỡng email nhắc của BE, đặc tả 6.8). */
export const EXPIRY_WARNING_DAYS = 7;

/** Có hiện dải "sắp hết hạn" không: gói còn hoạt động và còn 0–7 ngày. Hết hạn/tạm ngưng thì dải chỉ đọc (`ReadOnlyBanner`) thay thế. */
export function expiringSoonDays(args: { status: string | null; expiresAt: string | null; now?: number }): number | null {
  if (args.status !== null && args.status !== "active") return null;
  const days = daysUntilExpiry(args.expiresAt, args.now);
  if (days === null || days < 0 || days > EXPIRY_WARNING_DAYS) return null;
  return days;
}
