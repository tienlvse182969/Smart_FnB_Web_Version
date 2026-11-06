/**
 * Module branchPrices — giá menu theo chi nhánh (OW-16, mục 29, BR-84, BR-85).
 * Real: BE `branch-prices.ts` — `GET/PUT /restaurant-chains/:chainId/branch-prices` (OWNER; ma trận món + combo, lưu tối đa 500 ô trong MỘT
 * giao dịch, `priceOverride: null` = về giá chuỗi, cảnh báo `PRICE_OUTSIDE_CHAIN_RANGE` nhưng vẫn lưu). Store Manager xem giá chi nhánh mình
 * qua `GET /branches/:id/menu` (món) và `GET /branch-combos` (combo).
 */
import type { BranchPriceRow, PriceMatrix, PriceSaved, PriceUpdate } from "../../../types";
import { defineApi } from "../../define";
import { branchPricesMock } from "./mock";
import { branchPricesReal } from "./real";

export interface BranchPricesApi {
  /** Ma trận giá của chuỗi: chi nhánh + các ô (chỉ cặp sản phẩm–chi nhánh đã gán). Owner. */
  getMatrix(chainId: string): Promise<PriceMatrix>;
  /**
   * Lưu 1–500 ô trong một giao dịch (all-or-nothing). 400 giá sai/chi nhánh ngoài chuỗi, 404 sản phẩm chưa gán cho chi nhánh.
   * Nơi gọi tự chia lô khi > 500 và tự cô lập ô lỗi.
   */
  savePrices(chainId: string, updates: PriceUpdate[]): Promise<PriceSaved[]>;
  /** Bảng giá của MỘT chi nhánh (Store Manager, chỉ đọc). */
  getBranchPrices(branchId: string): Promise<BranchPriceRow[]>;
}

export const branchPricesApi = defineApi<BranchPricesApi>("branch_prices", { real: branchPricesReal, mock: branchPricesMock });
