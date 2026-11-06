/**
 * Giá menu theo chi nhánh (OW-16, đặc tả mục 29, BR-84, BR-85) theo DTO của BE `branch-prices.ts`.
 * Tiền là số nguyên đồng (BR-19); BE trả chuỗi thập phân nên mapper dùng `parseAmount`.
 */

export type PriceProductType = "ITEM" | "COMBO";

/** Một ô của ma trận: một món/combo tại một chi nhánh mà nó đã được gán. Cặp chưa gán không có ô. */
export type PriceCell = {
  type: PriceProductType;
  productId: string;
  branchId: string;
  name: string;
  /** Giá chuỗi (đồng). */
  chainPrice: number;
  /** Giá riêng của chi nhánh, hoặc null = dùng giá chuỗi. */
  priceOverride: number | null;
  /** Giá hiệu lực = giá riêng nếu có, không thì giá chuỗi (BR-84). */
  effectivePrice: number;
};

export type PriceBranch = { id: string; name: string };

export type PriceMatrix = {
  branches: PriceBranch[];
  cells: PriceCell[];
};

/** Một thay đổi giá. `priceOverride: null` = về giá chuỗi. */
export type PriceUpdate = {
  type: PriceProductType;
  productId: string;
  branchId: string;
  priceOverride: number | null;
};

/** Kết quả lưu một ô; `warnings` có `PRICE_OUTSIDE_CHAIN_RANGE` khi giá lệch quá xa giá chuỗi (vẫn lưu). */
export type PriceSaved = PriceUpdate & { effectivePrice: number; warnings: string[] };

/** Một dòng bảng giá của chi nhánh cho Store Manager xem (chỉ đọc). */
export type BranchPriceRow = {
  type: PriceProductType;
  productId: string;
  name: string;
  chainPrice: number;
  priceOverride: number | null;
  effectivePrice: number;
};
