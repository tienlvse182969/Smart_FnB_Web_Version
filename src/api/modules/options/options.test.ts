import { beforeEach, describe, expect, it } from "vitest";
import type { OptionGroup, OptionGroupInput, OptionInput } from "../../../types";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { branchMock } from "../branch/mock";
import { menuMock } from "../menu/mock";
import { optionsMock } from "./mock";
import { defaultSelection, toggleOption, unitPrice, validateGroupInput, validateSelection } from "./rules";

mockControl.latency = [0, 0];
mockControl.failure = null;

const opt = (code: string, over: Partial<OptionInput> = {}): OptionInput => ({ name: code, code, priceDelta: 0, isActive: true, isDefault: false, ...over });
const sizeInput: OptionGroupInput = {
  name: "Size", code: "SIZE", isRequired: true, minSelections: 1, maxSelections: 1, isActive: true,
  options: [opt("M", { isDefault: true }), opt("L", { priceDelta: 6000 })],
};
const toppingInput: OptionGroupInput = {
  name: "Topping", code: "TOPPING", isRequired: false, minSelections: 0, maxSelections: 3, isActive: true,
  options: [opt("PEARL", { priceDelta: 5000 }), opt("COCONUT", { priceDelta: 5000 }), opt("PUDDING", { priceDelta: 7000 }), opt("FLAN", { priceDelta: 8000 })],
};
const asGroup = (input: OptionGroupInput, id: string): OptionGroup => ({
  id, ...input, displayOrder: 1,
  options: input.options.map((o, i) => ({ ...o, id: `${id}-${o.code}`, displayOrder: i + 1 })),
});

describe("quy tắc nhóm (form và mock dùng chung)", () => {
  it("hợp lệ: Size bắt buộc chọn 1 (không cần mặc định), Topping 0–3", () => {
    expect(validateGroupInput({ ...sizeInput, options: sizeInput.options.map((o) => ({ ...o, isDefault: false })) })).toEqual([]);
    expect(validateGroupInput(toppingInput)).toEqual([]);
  });

  it("min ≤ max, max ≥ 1, bắt buộc thì min ≥ 1", () => {
    expect(validateGroupInput({ ...toppingInput, minSelections: 4 })).toContain("Số chọn tối thiểu không được lớn hơn số chọn tối đa");
    expect(validateGroupInput({ ...toppingInput, minSelections: 0, maxSelections: 0 })).toContain("Số chọn tối đa phải từ 1 trở lên");
    expect(validateGroupInput({ ...sizeInput, minSelections: 0 })).toContain("Nhóm bắt buộc phải có số chọn tối thiểu từ 1 trở lên");
    expect(validateGroupInput({ ...toppingInput, minSelections: -1 })).toContain("Số chọn tối thiểu không được âm");
  });

  it("mặc định: không quá max, phải đang bật", () => {
    const twoDefaults = { ...sizeInput, options: sizeInput.options.map((o) => ({ ...o, isDefault: true })) };
    expect(validateGroupInput(twoDefaults)).toContain("Số tuỳ chọn mặc định không được vượt quá số chọn tối đa");
    const offDefault = { ...sizeInput, options: [opt("M", { isDefault: true, isActive: false }), opt("L")] };
    expect(validateGroupInput(offDefault).join()).toMatch(/mặc định .* phải đang bật/);
  });

  it("giá cộng thêm số nguyên ≥ 0; mã trùng trong nhóm; nhóm không rỗng; đủ tuỳ chọn bật cho min", () => {
    expect(validateGroupInput({ ...sizeInput, options: [opt("M", { priceDelta: -1 }), opt("L")] }).join()).toMatch(/số nguyên đồng/);
    expect(validateGroupInput({ ...sizeInput, options: [opt("M", { priceDelta: 5.5 }), opt("L")] }).join()).toMatch(/số nguyên đồng/);
    expect(validateGroupInput({ ...sizeInput, options: [opt("M"), opt("M")] }).join()).toMatch(/trùng/);
    expect(validateGroupInput({ ...sizeInput, options: [] })).toContain("Nhóm cần ít nhất một tuỳ chọn");
    expect(validateGroupInput({ ...sizeInput, options: [opt("M", { isActive: false }), opt("L", { isActive: false })] }).join()).toMatch(/đang bật ít hơn/);
    expect(validateGroupInput({ ...sizeInput, code: "viết thường" }).join()).toMatch(/Mã nhóm/);
  });
});

describe("chọn tuỳ chọn và tính giá (BR-14, đặc tả 12.3)", () => {
  const size = asGroup(sizeInput, "g-size");
  const topping = asGroup(toppingInput, "g-top");

  it("nhóm bắt buộc chưa chọn đủ thì vi phạm; chọn đúng 1 thì đạt; chọn 2 thì vượt tối đa", () => {
    expect(validateSelection(size, [])).toEqual(["Size: chọn ít nhất 1"]);
    expect(validateSelection(size, ["g-size-L"])).toEqual([]);
    expect(validateSelection(size, ["g-size-M", "g-size-L"])).toEqual(["Size: chọn tối đa 1"]);
  });

  it("topping 0–3: để trống được, tối đa 3, không chọn tuỳ chọn đã tắt", () => {
    expect(validateSelection(topping, [])).toEqual([]);
    expect(validateSelection(topping, ["g-top-PEARL", "g-top-COCONUT", "g-top-PUDDING"])).toEqual([]);
    expect(validateSelection(topping, ["g-top-PEARL", "g-top-COCONUT", "g-top-PUDDING", "g-top-FLAN"])).toEqual(["Topping: chọn tối đa 3"]);
    const off = { ...topping, options: topping.options.map((o) => (o.code === "PEARL" ? { ...o, isActive: false } : o)) };
    expect(validateSelection(off, ["g-top-PEARL"]).join()).toMatch(/ngừng kinh doanh/);
  });

  it("toggleOption: nhóm 1 thay thế và không bỏ về trống; nhóm nhiều chặn khi đủ tối đa; bỏ qua tuỳ chọn tắt", () => {
    expect(toggleOption(size, ["g-size-M"], "g-size-L")).toEqual(["g-size-L"]);
    expect(toggleOption(size, ["g-size-M"], "g-size-M")).toEqual(["g-size-M"]);
    let sel: string[] = [];
    for (const c of ["PEARL", "COCONUT", "PUDDING", "FLAN"]) sel = toggleOption(topping, sel, `g-top-${c}`);
    expect(sel).toEqual(["g-top-PEARL", "g-top-COCONUT", "g-top-PUDDING"]);
    expect(toggleOption(topping, sel, "g-top-COCONUT")).toEqual(["g-top-PEARL", "g-top-PUDDING"]);
    const off = { ...topping, options: topping.options.map((o) => ({ ...o, isActive: false })) };
    expect(toggleOption(off, [], "g-top-PEARL")).toEqual([]);
  });

  it("mặc định chọn sẵn chỉ gồm tuỳ chọn đang bật", () => {
    expect(defaultSelection(size)).toEqual(["g-size-M"]);
    expect(defaultSelection(topping)).toEqual([]);
  });

  it("giá một ly = giá món + Σ giá cộng thêm (ví dụ đặc tả: 30.000 + L 6.000 + trân châu 5.000 + pudding 7.000 = 48.000)", () => {
    const groups = [size, topping];
    expect(unitPrice(30000, groups, [])).toBe(30000);
    expect(
      unitPrice(30000, groups, [
        { groupId: "g-size", optionIds: ["g-size-L"] },
        { groupId: "g-top", optionIds: ["g-top-PEARL", "g-top-PUDDING"] },
      ]),
    ).toBe(48000);
    expect(unitPrice(30000, groups, [{ groupId: "g-size", optionIds: ["g-size-L", "g-size-L"] }])).toBe(36000);
    expect(unitPrice(30000, groups, [{ groupId: "khong-co", optionIds: ["x"] }])).toBe(30000);
  });
});

describe("mock options — cùng quy tắc khi gọi vòng qua form", () => {
  let chainId = "";
  beforeEach(async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    chainId = (await branchMock.listChains())[0].id;
  });

  it("tạo nhóm: lỗi quy tắc → 400, trùng mã → 409, hợp lệ → có id và thứ tự", async () => {
    await expect(optionsMock.createGroup(chainId, { ...sizeInput, code: "X1", minSelections: 3, maxSelections: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(optionsMock.createGroup(chainId, { ...sizeInput, code: "X2", isRequired: true, minSelections: 0 })).rejects.toMatchObject({ status: 400 });
    const size = await optionsMock.createGroup(chainId, { ...sizeInput, code: "SIZE2" });
    const topping = await optionsMock.createGroup(chainId, { ...toppingInput, code: "TOP2" });
    expect(size.options.map((o) => o.displayOrder)).toEqual([1, 2]);
    expect(topping.displayOrder).toBeGreaterThan(size.displayOrder);
    await expect(optionsMock.createGroup(chainId, { ...sizeInput, code: "SIZE2" })).rejects.toMatchObject({ status: 409 });
  });

  it("sửa nhóm giữ id tuỳ chọn cũ, thêm/xoá tuỳ chọn, đổi thứ tự theo mảng", async () => {
    const g = await optionsMock.createGroup(chainId, { ...toppingInput, code: "TOP3" });
    const [a, b] = g.options;
    const updated = await optionsMock.updateGroup(chainId, g.id, {
      ...toppingInput,
      code: "TOP3",
      options: [{ ...b }, { ...a, priceDelta: 6000 }, opt("NEW")],
    });
    expect(updated.options.map((o) => o.code)).toEqual(["COCONUT", "PEARL", "NEW"]);
    expect(updated.options[1]).toMatchObject({ id: a.id, priceDelta: 6000, displayOrder: 2 });
    await expect(optionsMock.updateGroup(chainId, g.id, { ...toppingInput, code: "SIZE" })).rejects.toMatchObject({ status: 409 });
  });

  it("tắt tuỳ chọn cấp chuỗi; tắt tuỳ chọn mặc định thì bỏ cờ mặc định", async () => {
    const g = await optionsMock.createGroup(chainId, { ...sizeInput, code: "SIZE4" });
    const m = g.options.find((o) => o.isDefault)!;
    const after = await optionsMock.setOptionActive(chainId, g.id, m.id, false);
    expect(after.options.find((o) => o.id === m.id)).toMatchObject({ isActive: false, isDefault: false });
  });

  it("gắn nhóm cho món theo ID thật, cờ không gom món; xoá nhóm gỡ khỏi món", async () => {
    const cat = (await menuMock.listCategories(chainId))[0];
    const item = await menuMock.createItem(chainId, { categoryId: cat.id, sku: "OPT-1", name: "Món có tuỳ chọn", price: 30000, branchIds: [] });
    const size = await optionsMock.createGroup(chainId, { ...sizeInput, code: "SIZE5" });
    const top = await optionsMock.createGroup(chainId, { ...toppingInput, code: "TOP5" });
    await optionsMock.setItemConfig(chainId, { menuItemId: item.id, groupIds: [top.id, size.id], noBatch: true });
    expect((await optionsMock.listItemConfigs(chainId)).find((c) => c.menuItemId === item.id)).toEqual({ menuItemId: item.id, groupIds: [top.id, size.id], noBatch: true });
    await expect(optionsMock.setItemConfig(chainId, { menuItemId: item.id, groupIds: [size.id, size.id], noBatch: false })).rejects.toMatchObject({ status: 400 });

    await optionsMock.deleteGroup(chainId, size.id);
    expect((await optionsMock.listItemConfigs(chainId)).find((c) => c.menuItemId === item.id)!.groupIds).toEqual([top.id]);
    await menuMock.deleteItem(chainId, item.id);
    expect((await optionsMock.listItemConfigs(chainId)).some((c) => c.menuItemId === item.id)).toBe(false);
  });
});
