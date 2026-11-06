/** OW-14 (mục 26, BR-77, BR-78): quy tắc combo, giá mua lẻ, cảnh báo chi nhánh, ánh xạ DTO, real với fetch giả, mock cùng luật. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComboComponent } from "../../../types";
import { mockControl } from "../../mock/control";
import { mapCombo } from "./mapper";
import { combosMock, resetCombosMock } from "./mock";
import { combosReal } from "./real";
import { branchGapReasons, comboProblems, commonSizeCodes, componentProblems, disabledChoiceItems, retailTotal } from "./rules";

mockControl.latency = [0, 0];
mockControl.failure = null;

const fixed = (menuItemId: string, over: Partial<ComboComponent> = {}): ComboComponent => ({
  type: "FIXED",
  name: "Bánh mì",
  quantity: 1,
  fixedSizeCode: null,
  choices: [{ menuItemId, surcharge: 0, isDefault: true }],
  ...over,
});
const variant = (ids: string[], over: Partial<ComboComponent> = {}): ComboComponent => ({
  type: "CHOICE",
  name: "Đồ uống",
  quantity: 1,
  fixedSizeCode: null,
  choices: ids.map((menuItemId, i) => ({ menuItemId, surcharge: i === 2 ? 5000 : 0, isDefault: i === 0 })),
  ...over,
});
const valid = () => ({ name: "Combo Sáng", categoryId: "cat", price: 39000, components: [fixed("a"), variant(["b", "c", "d"])] });

describe("quy tắc combo (BR-77)", () => {
  it("hợp lệ: 2 thành phần, nhóm 3 món, 1 mặc định", () => {
    expect(comboProblems(valid())).toEqual([]);
  });

  it("2–6 thành phần", () => {
    expect(comboProblems({ ...valid(), components: [fixed("a")] }).join()).toMatch(/từ 2 đến 6 thành phần/);
    expect(comboProblems({ ...valid(), components: Array.from({ length: 7 }, (_, i) => fixed(`i${i}`)) }).join()).toMatch(/từ 2 đến 6 thành phần/);
    expect(comboProblems({ ...valid(), components: Array.from({ length: 6 }, (_, i) => fixed(`i${i}`)) })).toEqual([]);
  });

  it("số lượng 1–5; món cố định đúng 1 món; nhóm biến thể 2–10 món", () => {
    expect(componentProblems(fixed("a", { quantity: 0 }), "T").join()).toMatch(/số lượng từ 1 đến 5/);
    expect(componentProblems(fixed("a", { quantity: 6 }), "T").join()).toMatch(/số lượng từ 1 đến 5/);
    expect(componentProblems(variant(["b"]), "T").join()).toMatch(/từ 2 đến 10 món/);
    expect(componentProblems(variant(Array.from({ length: 11 }, (_, i) => `m${i}`)), "T").join()).toMatch(/từ 2 đến 10 món/);
    expect(componentProblems(variant(Array.from({ length: 10 }, (_, i) => `m${i}`)), "T")).toEqual([]);
    expect(componentProblems(fixed("a", { choices: [] }), "T").join()).toMatch(/đúng 1 món/);
  });

  it("đúng 1 món mặc định, không trùng món trong nhóm, phụ thu số nguyên ≥ 0, chọn đủ món", () => {
    const none = variant(["b", "c"]);
    none.choices[0].isDefault = false;
    expect(componentProblems(none, "T").join()).toMatch(/đúng 1 món mặc định/);
    const two = variant(["b", "c"]);
    two.choices[1].isDefault = true;
    expect(componentProblems(two, "T").join()).toMatch(/đúng 1 món mặc định/);
    expect(componentProblems(variant(["b", "b"]), "T").join()).toMatch(/chỉ xuất hiện một lần/);
    const neg = variant(["b", "c"]);
    neg.choices[1].surcharge = -1;
    expect(componentProblems(neg, "T").join()).toMatch(/phụ thu/);
    neg.choices[1].surcharge = 1500.5;
    expect(componentProblems(neg, "T").join()).toMatch(/phụ thu/);
    expect(componentProblems(variant(["b", ""]), "T").join()).toMatch(/chọn món cho mọi dòng/);
  });

  it("tên, danh mục, giá số nguyên ≥ 0; nhóm biến thể phải có tên nhóm", () => {
    expect(comboProblems({ ...valid(), name: " " }).join()).toMatch(/tên combo/);
    expect(comboProblems({ ...valid(), categoryId: "" }).join()).toMatch(/danh mục/);
    expect(comboProblems({ ...valid(), price: -1 }).join()).toMatch(/Giá combo/);
    expect(comboProblems({ ...valid(), price: 1000.5 }).join()).toMatch(/Giá combo/);
    expect(comboProblems({ ...valid(), price: 0 })).toEqual([]);
    expect(comboProblems({ ...valid(), components: [fixed("a"), variant(["b", "c"], { name: " " })] }).join()).toMatch(/tên nhóm/);
  });
});

describe("giá mua lẻ (mục 26.2) và cảnh báo", () => {
  const prices: Record<string, number> = { a: 25000, b: 30000, c: 28000 };
  it("Σ số lượng × (giá món mặc định + phụ thu của món mặc định)", () => {
    expect(retailTotal([fixed("a"), variant(["b", "c"])], (id) => prices[id])).toBe(55000);
    const matchaDefault = variant(["c", "b"]);
    matchaDefault.choices[0].surcharge = 5000;
    expect(retailTotal([fixed("a", { quantity: 2 }), matchaDefault], (id) => prices[id])).toBe(2 * 25000 + 28000 + 5000);
    expect(retailTotal([fixed("a"), fixed("")], (id) => prices[id])).toBe(25000);
  });

  it("món thành phần đang tắt cấp chuỗi", () => {
    const items = [
      { id: "b", name: "Cà phê", isActive: false },
      { id: "c", name: "Trà đào", isActive: true },
    ];
    expect(disabledChoiceItems(variant(["b", "c"]), items)).toEqual(["Cà phê"]);
    expect(disabledChoiceItems(fixed("c"), items)).toEqual([]);
  });

  it("BR-78: chi nhánh thiếu món cố định hoặc nhóm không có món nào được gán", () => {
    const on = (branchId: string, isEnabled = true) => [{ branchId, isEnabled, isAvailable: true }];
    const items = [
      { id: "a", name: "Bánh mì", branches: on("b1") },
      { id: "b", name: "Cà phê", branches: on("b1") },
      { id: "c", name: "Trà đào", branches: on("b2") },
    ];
    const comps = [fixed("a"), variant(["b", "c"])];
    expect(branchGapReasons(comps, items, "b1")).toEqual([]);
    expect(branchGapReasons(comps, items, "b2")).toEqual(['chưa gán món "Bánh mì"']);
    expect(branchGapReasons(comps, items, "b3")).toEqual(['chưa gán món "Bánh mì"', 'nhóm "Đồ uống" chưa có món nào được gán']);
    const off = [{ id: "a", name: "Bánh mì", branches: on("b1", false) }, ...items.slice(1)];
    expect(branchGapReasons([fixed("a")], off, "b1")).toEqual(['chưa gán món "Bánh mì"']);
  });

  it("size cố định: giao các tập size của mọi món; món chưa biết size bỏ qua", () => {
    const s = (...codes: string[]) => codes.map((code) => ({ code, name: code }));
    const map = new Map([
      ["a", s("S", "M", "L")],
      ["b", s("M", "L")],
    ]);
    expect(commonSizeCodes(map, ["a", "b"]).map((x) => x.code)).toEqual(["M", "L"]);
    expect(commonSizeCodes(map, ["a", "z"]).map((x) => x.code)).toEqual(["S", "M", "L"]);
    expect(commonSizeCodes(map, ["z"])).toEqual([]);
    expect(commonSizeCodes(new Map([["a", s("S")], ["b", s("L")]]), ["a", "b"])).toEqual([]);
  });
});

describe("ánh xạ", () => {
  it("giá chuỗi thập phân → số; thành phần sắp theo displayOrder; chi nhánh đang bật", () => {
    const out = mapCombo({
      id: "k1",
      categoryId: "cat",
      name: "Combo Sáng",
      price: "39000.00",
      isActive: true,
      displayOrder: 0,
      components: [
        { type: "CHOICE", name: "Đồ uống", quantity: 1, fixedSizeCode: "M", displayOrder: 1, choices: [{ menuItemId: "b", surcharge: "5000.00", isDefault: true }, { menuItemId: "c", surcharge: "0.00", isDefault: false }] },
        { type: "FIXED", name: "Bánh mì", quantity: 2, displayOrder: 0, choices: [{ menuItemId: "a", surcharge: "0", isDefault: true }] },
      ],
      branches: [{ branchId: "b1", isEnabled: true }, { branchId: "b2", isEnabled: false }],
    });
    expect(out.price).toBe(39000);
    expect(out.components.map((c) => c.type)).toEqual(["FIXED", "CHOICE"]);
    expect(out.components[1]).toMatchObject({ fixedSizeCode: "M", choices: [{ surcharge: 5000 }, { surcharge: 0 }] });
    expect(out.branchIds).toEqual(["b1"]);
  });
});

describe("real — fetch giả, không gọi BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const raw = { id: "k1", categoryId: "cat", name: "Combo Sáng", price: "39000", isActive: true, displayOrder: 0, components: [], branches: [] };
  const stub = (response: Response = json(raw)) => {
    const fn = vi.fn().mockImplementation(async () => response.clone());
    vi.stubGlobal("fetch", fn);
    return fn;
  };
  const calls = (fn: ReturnType<typeof vi.fn>) =>
    (fn.mock.calls as [string, RequestInit][]).map(([url, init]) => ({
      path: new URL(url).pathname.replace(/^\/api\/v1/, ""),
      method: init.method ?? "GET",
      body: typeof init.body === "string" ? JSON.parse(init.body) : init.body,
    }));

  it("tạo: POST với displayOrder theo vị trí, tên đã cắt khoảng trắng, mô tả trống → null", async () => {
    const fn = stub();
    await combosReal.createCombo("c1", { ...valid(), name: " Combo Sáng ", description: "  " });
    const [call] = calls(fn);
    expect(call).toMatchObject({ path: "/restaurant-chains/c1/combos", method: "POST" });
    const body = call.body as Record<string, unknown>;
    expect(body).toMatchObject({ name: "Combo Sáng", categoryId: "cat", price: 39000, description: null });
    expect((body.components as { displayOrder: number; type: string }[]).map((c) => [c.type, c.displayOrder])).toEqual([["FIXED", 0], ["CHOICE", 1]]);
    expect(Object.keys(body)).not.toContain("isActive");
  });

  it("sửa: PATCH chỉ gửi trường có mặt; bật/tắt chỉ gửi isActive; xoá và gán chi nhánh đúng route", async () => {
    const fn = stub();
    await combosReal.updateCombo("c1", "k1", { isActive: false });
    await combosReal.deleteCombo("c1", "k1");
    await combosReal.setComboBranches("c1", "k1", ["b1", "b2"]);
    expect(calls(fn)).toEqual([
      { path: "/restaurant-chains/c1/combos/k1", method: "PATCH", body: { isActive: false } },
      { path: "/restaurant-chains/c1/combos/k1", method: "DELETE", body: undefined },
      { path: "/restaurant-chains/c1/combos/k1/branches", method: "PUT", body: { branchIds: ["b1", "b2"] } },
    ]);
  });

  it("sai quy tắc: 400 và KHÔNG có request; lỗi 400/409 của BE được ném lại", async () => {
    const fn = stub(json({ statusCode: 400, message: "A combo requires 2–6 components" }, 400));
    await expect(combosReal.createCombo("c1", { ...valid(), components: [fixed("a")] })).rejects.toMatchObject({ status: 400 });
    await expect(combosReal.updateCombo("c1", "k1", { components: [fixed("a")] })).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
    await expect(combosReal.createCombo("c1", valid())).rejects.toMatchObject({ status: 400 });
  });
});

describe("mock — cùng luật với BE", () => {
  beforeEach(() => resetCombosMock());

  it("tạo, sửa một phần, bật/tắt, gán chi nhánh, xoá", async () => {
    const created = await combosMock.createCombo("c1", valid());
    expect(created.isActive).toBe(true);
    const renamed = await combosMock.updateCombo("c1", created.id, { name: " Combo Trưa " });
    expect(renamed.name).toBe("Combo Trưa");
    expect(renamed.components).toHaveLength(2);
    expect((await combosMock.updateCombo("c1", created.id, { isActive: false })).isActive).toBe(false);
    await combosMock.setComboBranches("c1", created.id, ["b1"]);
    expect((await combosMock.listCombos("c1"))[0].branchIds).toEqual(["b1"]);
    await expect(combosMock.setComboBranches("c1", created.id, ["b1", "b1"])).rejects.toMatchObject({ status: 400 });
    await combosMock.deleteCombo("c1", created.id);
    expect(await combosMock.listCombos("c1")).toEqual([]);
    await expect(combosMock.deleteCombo("c1", created.id)).rejects.toMatchObject({ status: 404 });
  });

  it("sai quy tắc → 400; chuỗi khác không lẫn", async () => {
    await expect(combosMock.createCombo("c1", { ...valid(), components: [fixed("a")] })).rejects.toMatchObject({ status: 400 });
    await combosMock.createCombo("c1", valid());
    expect(await combosMock.listCombos("c2")).toEqual([]);
  });
});
