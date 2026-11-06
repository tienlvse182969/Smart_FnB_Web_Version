/** Quy tắc giá chi nhánh (mục 29, BR-84): cùng ngưỡng với BE (`branch-prices.ts`) — một nguồn cho form, real và mock. */
import type { PriceUpdate } from "../../../types";

export const MAX_BRANCH_PRICE = 99_999_999_999;
/** BE nhận tối đa 500 ô mỗi lần lưu (một giao dịch). */
export const MAX_CELLS_PER_REQUEST = 500;
/** Mục 29.3: cảnh báo khi thấp hơn giá chuỗi quá 50% hoặc cao hơn quá 100% (tức > 2 lần). Vẫn cho lưu. */
export const LOW_RATIO = 0.5;
export const HIGH_RATIO = 2;

export const cellKey = (type: string, productId: string, branchId: string): string => `${type}:${productId}:${branchId}`;

/** Lỗi của một giá riêng (null = về giá chuỗi, hợp lệ), hoặc null nếu hợp lệ. */
export function validateBranchPrice(price: number | null): string | null {
  if (price === null) return null;
  if (!Number.isInteger(price) || price < 0 || price > MAX_BRANCH_PRICE) return "Giá phải là số nguyên đồng, từ 0 trở lên";
  return null;
}

/** Mức lệch so với giá chuỗi: "low" khi < 50%, "high" khi > 200%, ngược lại null. Giá chuỗi 0 thì không cảnh báo. */
export function priceWarning(price: number | null, chainPrice: number): "low" | "high" | null {
  if (price === null || chainPrice <= 0) return null;
  if (price < chainPrice * LOW_RATIO) return "low";
  if (price > chainPrice * HIGH_RATIO) return "high";
  return null;
}

export const WARNING_TEXT = {
  low: "Thấp hơn giá chuỗi quá 50% — kiểm tra lại, vẫn lưu được",
  high: "Cao hơn giá chuỗi quá 100% — kiểm tra lại, vẫn lưu được",
} as const;

/** Chia danh sách thay đổi thành các lô ≤ 500 ô. */
export function chunkUpdates(updates: PriceUpdate[], size = MAX_CELLS_PER_REQUEST): PriceUpdate[][] {
  const out: PriceUpdate[][] = [];
  for (let i = 0; i < updates.length; i += size) out.push(updates.slice(i, i + size));
  return out;
}
