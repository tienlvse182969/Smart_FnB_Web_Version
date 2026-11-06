/** Bản REAL của module branchPrices — BE `branch-prices.ts`, `menu.service.ts` (menu chi nhánh), `combos.service.ts` (`branch-combos`). */
import { parseAmount } from "../../../lib/reportFormat";
import { request } from "../../http/client";
import { ApiError } from "../../http/errors";
import type { BranchPriceRow, PriceCell, PriceMatrix, PriceSaved, PriceUpdate } from "../../../types";
import { MAX_CELLS_PER_REQUEST, validateBranchPrice } from "./rules";
import type { BranchPricesApi } from "./index";

interface RawCell {
  type: "ITEM" | "COMBO";
  productId: string;
  branchId: string;
  name: string;
  chainPrice: string | number;
  priceOverride: string | number | null;
  effectivePrice: string | number;
}

const mapCell = (raw: RawCell): PriceCell => ({
  type: raw.type,
  productId: raw.productId,
  branchId: raw.branchId,
  name: raw.name,
  chainPrice: parseAmount(raw.chainPrice),
  priceOverride: raw.priceOverride === null ? null : parseAmount(raw.priceOverride),
  effectivePrice: parseAmount(raw.effectivePrice),
});

export const branchPricesReal: BranchPricesApi = {
  async getMatrix(chainId) {
    const raw = await request<{ branches: { id: string; name: string }[]; cells: RawCell[] }>(`/restaurant-chains/${chainId}/branch-prices`);
    const matrix: PriceMatrix = { branches: raw.branches.map((b) => ({ id: b.id, name: b.name })), cells: raw.cells.map(mapCell) };
    return matrix;
  },

  async savePrices(chainId, updates) {
    if (updates.length < 1 || updates.length > MAX_CELLS_PER_REQUEST) throw new ApiError(400, `Mỗi lần lưu từ 1 đến ${MAX_CELLS_PER_REQUEST} ô giá`);
    for (const u of updates) {
      const problem = validateBranchPrice(u.priceOverride);
      if (problem) throw new ApiError(400, problem, [problem]);
    }
    // Thân đúng DTO: `{ updates: [{ type, productId, branchId, priceOverride }] }` (BE bật `forbidNonWhitelisted`).
    const body = { updates: updates.map((u) => ({ type: u.type, productId: u.productId, branchId: u.branchId, priceOverride: u.priceOverride })) };
    const raw = await request<{ cells: (PriceUpdate & { effectivePrice: string | number; warnings: string[] })[] }>(`/restaurant-chains/${chainId}/branch-prices`, { method: "PUT", body });
    return raw.cells.map((c) => ({ ...c, effectivePrice: parseAmount(c.effectivePrice), warnings: c.warnings ?? [] }) as PriceSaved);
  },

  async getBranchPrices(branchId) {
    const [menu, combos] = await Promise.all([
      request<{ categories: { items: { id: string; name: string; chainPrice: string | number; priceOverride: string | number | null; price: string | number }[] }[] }>(`/branches/${branchId}/menu`),
      request<{ priceOverride: string | number | null; combo: { id: string; name: string; chainPrice: string | number; price: string | number } }[]>("/branch-combos"),
    ]);
    const rows: BranchPriceRow[] = [
      ...menu.categories.flatMap((c) =>
        c.items.map((i) => ({
          type: "ITEM" as const,
          productId: i.id,
          name: i.name,
          chainPrice: parseAmount(i.chainPrice),
          priceOverride: i.priceOverride === null ? null : parseAmount(i.priceOverride),
          effectivePrice: parseAmount(i.price),
        })),
      ),
      ...combos.map((r) => ({
        type: "COMBO" as const,
        productId: r.combo.id,
        name: r.combo.name,
        chainPrice: parseAmount(r.combo.chainPrice),
        priceOverride: r.priceOverride === null ? null : parseAmount(r.priceOverride),
        effectivePrice: parseAmount(r.combo.price),
      })),
    ];
    return rows;
  },
};
