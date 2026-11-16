/** Quy tắc nhập topping, cùng ngưỡng với DTO của BE (`menu-extras.dto.ts`) — một nguồn cho form, real và mock. */
import type { ExtraInput, ItemExtrasInput } from "../../../types";

export const MAX_EXTRA_NAME = 100;
export const MAX_EXTRA_PRICE = 99_999_999_999;
export const MIN_PORTIONS = 1;
export const MAX_PORTIONS = 5;
/**
 * Đặc tả 27.2, BR-80: tổng số phần topping tối đa của món, mặc định 5, KHÔNG có trần trong đặc tả — web chỉ kiểm số nguyên ≥ 1.
 * (Khác với số phần mỗi lần gắn topping vào món: 1–5, `MIN_PORTIONS`/`MAX_PORTIONS`.) BE hiện còn chặn tổng ở 0–100 (`menu-extras.dto.ts`): giá trị vượt sẽ nhận 400 từ BE.
 */
export const DEFAULT_MAX_EXTRAS = 5;
export const MIN_ITEM_EXTRAS_TOTAL = 1;
export const MAX_EXTRAS_PER_ITEM = 100;

const wholeVnd = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_EXTRA_PRICE;

/** Lỗi đầu tiên của một topping thư viện, hoặc null. */
export function validateExtra(input: ExtraInput): string | null {
  const name = input.name.trim();
  if (!name) return "Tên topping không được để trống";
  if (name.length > MAX_EXTRA_NAME) return `Tên topping tối đa ${MAX_EXTRA_NAME} ký tự`;
  if (!wholeVnd(input.price)) return "Giá phải là số nguyên đồng, từ 0 trở lên";
  return null;
}

/** Lỗi đầu tiên của cấu hình topping một món, hoặc null. */
export function validateItemExtras(input: ItemExtrasInput): string | null {
  if (!Number.isInteger(input.maxExtras) || input.maxExtras < MIN_ITEM_EXTRAS_TOTAL) {
    return `Tổng số phần topping tối đa là số nguyên từ ${MIN_ITEM_EXTRAS_TOTAL} trở lên`;
  }
  if (input.extras.length > MAX_EXTRAS_PER_ITEM) return `Một món gắn tối đa ${MAX_EXTRAS_PER_ITEM} topping`;
  if (new Set(input.extras.map((x) => x.extraId)).size !== input.extras.length) return "Mỗi topping chỉ gắn một lần cho một món";
  for (const link of input.extras) {
    if (!wholeVnd(link.price)) return "Giá cộng thêm phải là số nguyên đồng, từ 0 trở lên";
    if (!Number.isInteger(link.maxQuantity) || link.maxQuantity < MIN_PORTIONS || link.maxQuantity > MAX_PORTIONS) {
      return `Số phần tối đa mỗi ly là số nguyên từ ${MIN_PORTIONS} đến ${MAX_PORTIONS}`;
    }
  }
  return null;
}
