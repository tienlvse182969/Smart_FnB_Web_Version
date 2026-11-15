/**
 * Tiền là SỐ NGUYÊN ĐỒNG (BR-19, BR-84), không âm, không số lẻ. MỘT nơi đọc, định dạng và kiểm tra tiền nhập tay;
 * `MoneyInput` và mọi ô nhập tiền dùng các hàm này. Client chỉ báo lỗi sớm, BE kiểm lại.
 */

/** Tối đa BE nhận cho một số tiền (DTO `@Max(99999999999)`). */
export const MAX_MONEY = 99_999_999_999;

/** 25000 → "25.000" (dấu chấm ngăn nghìn kiểu Việt Nam). Bỏ mọi ký tự không phải chữ số. */
export function formatMoneyInput(value: string | number | undefined | null): string {
  return String(value ?? "")
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Chỉ giữ chữ số — dùng cho ô nhập tự xử lý ký tự (gõ tới đâu lọc tới đó). */
export function sanitizeMoneyDigits(text: string): string {
  return text.replace(/\D/g, "");
}

/**
 * Đọc số tiền từ một đoạn chữ (gõ hoặc dán). Chỉ nhận số nguyên đồng:
 * - "25000", "25.000", "1.250.000", "25 000", "25.000 ₫" → số nguyên;
 * - có phần thập phân ("25,5", "1.5", "25.50", "1.234,56"), dấu âm, chữ lạ, hoặc rỗng → `null`.
 * Dấu chấm chỉ được coi là ngăn nghìn khi đúng nhóm 3 chữ số ("1.250.000"); "1.5" và "25.50" bị từ chối thay vì bị
 * hiểu nhầm thành 15 hoặc 2550.
 */
export function parseMoneyText(text: string | null | undefined): number | null {
  const cleaned = (text ?? "").replace(/[\s ₫]/g, "");
  if (cleaned === "") return null;
  if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(cleaned)) return null;
  const value = Number(cleaned.replace(/\./g, ""));
  return Number.isSafeInteger(value) ? value : null;
}

/** Hợp lệ làm số tiền: số nguyên, không âm, không quá `max`. */
export function isWholeVnd(value: unknown, max: number = MAX_MONEY): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max;
}
