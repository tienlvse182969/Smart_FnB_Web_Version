/** Quy tắc nhập liệu của BE cho món/danh mục — dùng chung cho bản real, mock và form (một nguồn). */
import { ApiError } from "../../http/errors";

export const SKU_PATTERN = /^[A-Z0-9_-]{1,50}$/;
export const MAX_PRICE = 99_999_999_999;

/** BR-19: tiền là số nguyên đồng ≥ 0. */
export function assertWholeVnd(price: unknown): asserts price is number {
  if (typeof price !== "number" || !Number.isInteger(price) || price < 0 || price > MAX_PRICE) {
    throw new ApiError(400, "Giá phải là số nguyên đồng, từ 0 trở lên");
  }
}

export function assertPrepMinutes(value: number | undefined): void {
  if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 1440)) {
    throw new ApiError(400, "Thời gian pha là số nguyên phút từ 0 đến 1440");
  }
}

export function assertSku(sku: string): void {
  if (!SKU_PATTERN.test(sku)) {
    throw new ApiError(400, "SKU chỉ gồm chữ hoa, số, gạch dưới hoặc gạch ngang, tối đa 50 ký tự");
  }
}

/** Gợi ý SKU từ tên món: chữ hoa không dấu, nối bằng `-`, tối đa 50 ký tự. */
export function suggestSku(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
