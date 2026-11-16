/**
 * Ghép màn hình bằng mã 6 số (BR-45, đặc tả 11.10). Mã do chính màn hình sinh (`POST /device-pairing/codes`, công khai), hết hạn
 * sau 5 phút, dùng một lần; Manager/thu ngân nhập mã vào web/POS để ghép.
 */
import { ApiError } from "../../http/errors";
import type { DisplayKind } from "../../../types";

export const PAIRING_CODE_LENGTH = 6;
export const PAIRING_TTL_MS = 5 * 60_000;

/** BE trả CÙNG MỘT lỗi cho mã sai, hết hạn, đã dùng và sai loại (stations.service.ts:116-124, 153-161): web không phân biệt được. */
export const BE_PAIRING_INVALID = "Pairing code is invalid, used, or expired";
/** Đua nhau dùng cùng một mã (stations.service.ts:144, 185). */
export const BE_PAIRING_CONSUMED = "Pairing code was already consumed";

/** Chỉ giữ chữ số, tối đa 6 (dán cả chuỗi như "123 456" hay "mã: 123456" cũng được). */
export function extractPairingCode(text: string): string {
  return text.replace(/\D/g, "").slice(0, PAIRING_CODE_LENGTH);
}

export const isPairingCode = (code: string): boolean => /^\d{6}$/.test(code);

/** Thông báo cho người dùng khi ghép thất bại; `null` nếu không phải lỗi ghép (để lớp gọi dùng thông báo chung của BE). */
export function describePairingError(err: unknown, kind: DisplayKind): string | null {
  if (!(err instanceof ApiError)) return null;
  // BE `fb7cae9` (#69): mã lỗi riêng ở `code`. Sai loại gộp vào INVALID (BE không tách).
  if (err.status === 400 && err.code === "PAIRING_CODE_EXPIRED") return "Mã ghép đã hết hạn (5 phút). Hãy bật lại màn hình để lấy mã mới.";
  if (err.status === 400 && err.code === "PAIRING_CODE_USED") return "Mã ghép đã được dùng. Hãy bật lại màn hình để lấy mã mới.";
  if (err.status === 400 && err.code === "PAIRING_CODE_INVALID") {
    const other = kind === "CUSTOMER_DISPLAY" ? "màn hình gọi số" : "màn hình khách";
    return `Mã ghép không đúng, hoặc là mã của ${other} (đang ghép ${kind === "CUSTOMER_DISPLAY" ? "màn hình khách" : "màn hình gọi số"}). Kiểm tra lại mã trên màn hình.`;
  }
  if (err.status === 400 && err.message === BE_PAIRING_INVALID) {
    const other = kind === "CUSTOMER_DISPLAY" ? "màn hình gọi số" : "màn hình khách";
    return `Mã ghép không dùng được: mã sai, đã hết hạn (5 phút), đã được dùng, hoặc là mã của ${other} (đang ghép ${kind === "CUSTOMER_DISPLAY" ? "màn hình khách" : "màn hình gọi số"}). Hãy bật lại màn hình để lấy mã mới.`;
  }
  if (err.status === 400 && err.message === BE_PAIRING_CONSUMED) return "Mã vừa được dùng ở nơi khác. Hãy bật lại màn hình để lấy mã mới.";
  if (err.status === 404 && /station/i.test(err.message)) return "Quầy không còn ở trạng thái đang dùng trong chi nhánh này.";
  return null;
}

/** BR-45: một quầy nhập sai quá 5 lần liên tiếp thì bị khoá ghép 5 phút. */
export const PAIRING_LOCK_MS = 5 * 60_000;
export const PAIRING_LOCKED_CODE = "PAIRING_LOCKED";

/**
 * Lỗi khoá ghép của BE (`429 { code: "PAIRING_LOCKED", lockedUntil }`, stations.service.ts:361-367, :405-412): trả thời điểm hết khoá (ms).
 * BE luôn gửi `lockedUntil`; nếu thiếu hoặc sai thì lấy 5 phút kể từ bây giờ (đúng BR-45). `null` nếu không phải lỗi khoá ghép.
 */
export function pairingLockedUntil(err: unknown, now: number = Date.now()): number | null {
  if (!(err instanceof ApiError) || err.status !== 429) return null;
  const body = err.body as { code?: unknown; lockedUntil?: unknown } | null;
  if (err.code !== PAIRING_LOCKED_CODE && body?.code !== PAIRING_LOCKED_CODE) return null;
  const until = typeof body?.lockedUntil === "string" ? Date.parse(body.lockedUntil) : NaN;
  return Number.isFinite(until) && until > now ? until : now + PAIRING_LOCK_MS;
}

/** `272_000` → `4:32`. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
