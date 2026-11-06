/** OW-16 (mục 29, BR-84): quy tắc giá, cảnh báo 50%/200%, chia lô, real với fetch giả (đúng route/thân), mock cùng luật. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { resetMockStates } from "../../mock/store";
import { branchMock } from "../branch/mock";
import { combosMock, resetCombosMock } from "../combos/mock";
import { menuMock } from "../menu/mock";
import { branchPricesMock, resetBranchPricesMock } from "./mock";
import { branchPricesReal } from "./real";
import { MAX_CELLS_PER_REQUEST, cellKey, chunkUpdates, priceWarning, validateBranchPrice } from "./rules";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("quy tắc giá chi nhánh", () => {
  it("giá riêng là số nguyên đồng ≥ 0; null = về giá chuỗi", () => {
    expect(validateBranchPrice(null)).toBeNull();
    expect(validateBranchPrice(0)).toBeNull();
    expect(validateBranchPrice(25000)).toBeNull();
    expect(validateBranchPrice(-1)).toMatch(/số nguyên đồng/);
    expect(validateBranchPrice(1500.5)).toMatch(/số nguyên đồng/);
    expect(validateBranchPrice(100_000_000_000)).toMatch(/số nguyên đồng/);
  });

  it("cảnh báo khi < 50% hoặc > 200% giá chuỗi; đúng biên thì không", () => {
    expect(priceWarning(24999, 50000)).toBe("low");
    expect(priceWarning(25000, 50000)).toBeNull();
    expect(priceWarning(100000, 50000)).toBeNull();
    expect(priceWarning(100001, 50000)).toBe("high");
    expect(priceWarning(null, 50000)).toBeNull();
    expect(priceWarning(10, 0)).toBeNull();
  });

  it("chia lô tối đa 500 ô", () => {
    const updates = Array.from({ length: 1001 }, (_, i) => ({ type: "ITEM" as const, productId: `p${i}`, branchId: "b", priceOverride: i }));
    expect(chunkUpdates(updates).map((c) => c.length)).toEqual([500, 500, 1]);
    expect(MAX_CELLS_PER_REQUEST).toBe(500);
  });
});

describe("real — fetch giả, không gọi BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const stub = (...responses: Response[]) => {
    const fn = vi.fn();
    responses.forEach((r) => fn.mockImplementationOnce(async () => r));
    vi.stubGlobal("fetch", fn);
    return fn;
  };
  const calls = (fn: ReturnType<typeof vi.fn>) =>
    (fn.mock.calls as [string, RequestInit][]).map(([url, init]) => ({
      path: new URL(url).pathname.replace(/^\/api\/v1/, ""),
      method: init.method ?? "GET",
      body: typeof init.body === "string" ? JSON.parse(init.body) : init.body,
    }));

  it("ma trận: giá chuỗi thập phân → số nguyên; priceOverride null giữ null", async () => {
    const fn = stub(
      json({
        branches: [{ id: "b1", name: "Quận 1" }],
        cells: [
          { type: "ITEM", productId: "p1", branchId: "b1", name: "Trà sữa", chainPrice: "35000.00", priceOverride: "40000.00", effectivePrice: "40000.00" },
          { type: "COMBO", productId: "k1", branchId: "b1", name: "Combo Sáng", chainPrice: "39000.00", priceOverride: null, effectivePrice: "39000.00" },
        ],
      }),
    );
    const matrix = await branchPricesReal.getMatrix("c1");
    expect(calls(fn)[0]).toMatchObject({ path: "/restaurant-chains/c1/branch-prices", method: "GET" });
    expect(matrix.cells.map((c) => [c.chainPrice, c.priceOverride, c.effectivePrice])).toEqual([
      [35000, 40000, 40000],
      [39000, null, 39000],
    ]);
  });

  it("lưu: PUT { updates } đúng 4 trường mỗi ô; cảnh báo của BE được giữ", async () => {
    const fn = stub(json({ cells: [{ type: "ITEM", productId: "p1", branchId: "b1", priceOverride: 10000, effectivePrice: "10000.00", warnings: ["PRICE_OUTSIDE_CHAIN_RANGE"] }] }));
    const out = await branchPricesReal.savePrices("c1", [{ type: "ITEM", productId: "p1", branchId: "b1", priceOverride: 10000 }]);
    expect(calls(fn)[0]).toEqual({
      path: "/restaurant-chains/c1/branch-prices",
      method: "PUT",
      body: { updates: [{ type: "ITEM", productId: "p1", branchId: "b1", priceOverride: 10000 }] },
    });
    expect(out[0]).toMatchObject({ effectivePrice: 10000, warnings: ["PRICE_OUTSIDE_CHAIN_RANGE"] });
  });

  it("sai giá hoặc 0/501 ô: 400 và KHÔNG có request; 404 của BE được ném lại", async () => {
    const fn = stub(json({ statusCode: 404, message: "Item is not assigned to branch" }, 404));
    await expect(branchPricesReal.savePrices("c1", [{ type: "ITEM", productId: "p", branchId: "b", priceOverride: -5 }])).rejects.toMatchObject({ status: 400 });
    await expect(branchPricesReal.savePrices("c1", [])).rejects.toMatchObject({ status: 400 });
    const big = Array.from({ length: 501 }, (_, i) => ({ type: "ITEM" as const, productId: `p${i}`, branchId: "b", priceOverride: 1 }));
    await expect(branchPricesReal.savePrices("c1", big)).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
    await expect(branchPricesReal.savePrices("c1", [{ type: "ITEM", productId: "p", branchId: "b", priceOverride: 1 }])).rejects.toMatchObject({ status: 404 });
  });

  it("Store Manager: gộp món (GET /branches/:id/menu) và combo (GET /branch-combos) của chi nhánh mình", async () => {
    const fn = stub(
      json({ categories: [{ items: [{ id: "p1", name: "Trà sữa", chainPrice: "35000.00", priceOverride: "40000.00", price: "40000.00" }] }] }),
      json([{ priceOverride: null, combo: { id: "k1", name: "Combo Sáng", chainPrice: "39000.00", price: "39000.00" } }]),
    );
    const rows = await branchPricesReal.getBranchPrices("b1");
    expect(calls(fn).map((c) => c.path).sort()).toEqual(["/branch-combos", "/branches/b1/menu"]);
    expect(rows).toEqual([
      { type: "ITEM", productId: "p1", name: "Trà sữa", chainPrice: 35000, priceOverride: 40000, effectivePrice: 40000 },
      { type: "COMBO", productId: "k1", name: "Combo Sáng", chainPrice: 39000, priceOverride: null, effectivePrice: 39000 },
    ]);
  });
});

describe("mock — cùng luật với BE", () => {
  let chainId = "";
  let branchId = "";
  let productId = "";
  beforeEach(async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    resetMockStates();
    resetBranchPricesMock();
    resetCombosMock();
    chainId = (await branchMock.listChains())[0].id;
    const items = await menuMock.listItems(chainId);
    const withBranch = items.find((i) => i.branches.some((b) => b.isEnabled))!;
    productId = withBranch.id;
    branchId = withBranch.branches.find((b) => b.isEnabled)!.branchId;
  });

  it("đặt giá riêng, lệch xa giá chuỗi vẫn lưu kèm cảnh báo, null về giá chuỗi", async () => {
    const before = (await branchPricesMock.getMatrix(chainId)).cells.find((c) => c.productId === productId && c.branchId === branchId)!;
    expect(before.priceOverride).toBeNull();
    const [saved] = await branchPricesMock.savePrices(chainId, [{ type: "ITEM", productId, branchId, priceOverride: Math.floor(before.chainPrice / 4) }]);
    expect(saved.warnings).toEqual(["PRICE_OUTSIDE_CHAIN_RANGE"]);
    const after = (await branchPricesMock.getMatrix(chainId)).cells.find((c) => c.productId === productId && c.branchId === branchId)!;
    expect(after.effectivePrice).toBe(Math.floor(before.chainPrice / 4));
    expect(after.chainPrice).toBe(before.chainPrice);
    await branchPricesMock.savePrices(chainId, [{ type: "ITEM", productId, branchId, priceOverride: null }]);
    expect((await branchPricesMock.getMatrix(chainId)).cells.find((c) => c.productId === productId && c.branchId === branchId)!.priceOverride).toBeNull();
  });

  it("lưu all-or-nothing: một ô chưa gán (404) thì không ô nào được ghi; trùng ô → 400", async () => {
    const batch = [
      { type: "ITEM" as const, productId, branchId, priceOverride: 12345 },
      { type: "ITEM" as const, productId: "khong-co", branchId, priceOverride: 1 },
    ];
    await expect(branchPricesMock.savePrices(chainId, batch)).rejects.toMatchObject({ status: 404 });
    expect((await branchPricesMock.getMatrix(chainId)).cells.find((c) => c.productId === productId && c.branchId === branchId)!.priceOverride).toBeNull();
    await expect(branchPricesMock.savePrices(chainId, [batch[0], batch[0]])).rejects.toMatchObject({ status: 400 });
    expect(cellKey("ITEM", "a", "b")).toBe("ITEM:a:b");
  });

  it("combo có ô theo chi nhánh đã gán", async () => {
    const combo = await combosMock.createCombo(chainId, {
      name: "Combo",
      categoryId: "c",
      price: 50000,
      components: [
        { type: "FIXED", name: "A", quantity: 1, fixedSizeCode: null, choices: [{ menuItemId: productId, surcharge: 0, isDefault: true }] },
        { type: "FIXED", name: "B", quantity: 1, fixedSizeCode: null, choices: [{ menuItemId: productId, surcharge: 0, isDefault: true }] },
      ],
    });
    await combosMock.setComboBranches(chainId, combo.id, [branchId]);
    await branchPricesMock.savePrices(chainId, [{ type: "COMBO", productId: combo.id, branchId, priceOverride: 45000 }]);
    const cell = (await branchPricesMock.getMatrix(chainId)).cells.find((c) => c.type === "COMBO")!;
    expect([cell.chainPrice, cell.effectivePrice]).toEqual([50000, 45000]);
  });
});
