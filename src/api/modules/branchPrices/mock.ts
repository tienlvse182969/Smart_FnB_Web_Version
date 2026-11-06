/**
 * Mock của module branchPrices: ma trận dựng từ món (mock menu) và combo (mock combos) của chuỗi, giá riêng giữ trong bộ nhớ.
 * Cùng luật với BE: chỉ cặp đã gán có ô (404 nếu ghi ô chưa gán), lưu all-or-nothing, cảnh báo `PRICE_OUTSIDE_CHAIN_RANGE`.
 */
import type { BranchPriceRow, PriceCell, PriceSaved } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { branchMock } from "../branch/mock";
import { combosMock } from "../combos/mock";
import { menuMock } from "../menu/mock";
import { cellKey, priceWarning, validateBranchPrice } from "./rules";
import type { BranchPricesApi } from "./index";

const overrides = new Map<string, number>();

export function resetBranchPricesMock(): void {
  overrides.clear();
}

async function build(chainId: string) {
  const [branches, items, combos] = await Promise.all([branchMock.listBranches(chainId), menuMock.listItems(chainId), combosMock.listCombos(chainId)]);
  const cells: PriceCell[] = [];
  const add = (type: "ITEM" | "COMBO", productId: string, name: string, chainPrice: number, branchId: string) => {
    const override = overrides.get(cellKey(type, productId, branchId)) ?? null;
    cells.push({ type, productId, branchId, name, chainPrice, priceOverride: override, effectivePrice: override ?? chainPrice });
  };
  for (const item of items) for (const b of item.branches) if (b.isEnabled) add("ITEM", item.id, item.name, item.price, b.branchId);
  for (const combo of combos) for (const branchId of combo.branchIds) add("COMBO", combo.id, combo.name, combo.price, branchId);
  return { branches: branches.map((b) => ({ id: b.id, name: b.name })), cells };
}

export const branchPricesMock: BranchPricesApi = {
  async getMatrix(chainId) {
    await mockDelay();
    return build(chainId);
  },

  async savePrices(chainId, updates) {
    await mockDelay();
    assertMockWritable();
    if (updates.length < 1 || updates.length > 500) throw new ApiError(400, "Supply 1–500 price cells");
    const keys = updates.map((u) => cellKey(u.type, u.productId, u.branchId));
    if (new Set(keys).size !== keys.length) throw new ApiError(400, "Duplicate price cell");
    const matrix = await build(chainId);
    const results: PriceSaved[] = [];
    const next = new Map(overrides);
    for (const u of updates) {
      const problem = validateBranchPrice(u.priceOverride);
      if (problem) throw new ApiError(400, "Invalid price override", [problem]);
      if (!matrix.branches.some((b) => b.id === u.branchId)) throw new ApiError(400, "Branch outside chain");
      const cell = matrix.cells.find((c) => c.type === u.type && c.productId === u.productId && c.branchId === u.branchId);
      if (!cell) throw new ApiError(404, u.type === "ITEM" ? "Item is not assigned to branch" : "Combo is not assigned to branch");
      const key = cellKey(u.type, u.productId, u.branchId);
      if (u.priceOverride === null) next.delete(key);
      else next.set(key, u.priceOverride);
      results.push({ ...u, effectivePrice: u.priceOverride ?? cell.chainPrice, warnings: priceWarning(u.priceOverride, cell.chainPrice) ? ["PRICE_OUTSIDE_CHAIN_RANGE"] : [] });
    }
    overrides.clear();
    for (const [k, v] of next) overrides.set(k, v);
    return results;
  },

  async getBranchPrices(branchId) {
    await mockDelay();
    // Mock không biết chuỗi của chi nhánh: lấy mọi chuỗi đã có dữ liệu giá (chỉ dùng trong thử nghiệm).
    const chains = await branchMock.listChains();
    const rows: BranchPriceRow[] = [];
    for (const chain of chains) {
      const matrix = await build(chain.id);
      for (const c of matrix.cells) if (c.branchId === branchId) rows.push({ type: c.type, productId: c.productId, name: c.name, chainPrice: c.chainPrice, priceOverride: c.priceOverride, effectivePrice: c.effectivePrice });
    }
    return rows;
  },
};
