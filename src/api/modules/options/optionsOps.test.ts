import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapWithLimit } from "../../../lib/concurrency";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { resetMockStates } from "../../mock/store";
import { branchMock } from "../branch/mock";
import { ITEM_CONFIG_CONCURRENCY, optionsReal } from "./real";
import { mapGroup, mapOption } from "./mapper";
import { optionsMock } from "./mock";
import { clearPersistedOptions } from "./persist";

mockControl.latency = [0, 0];
mockControl.failure = null;

type Call = { path: string; method: string; body: Record<string, unknown> | undefined };

const rawOption = { id: "o1", code: "L", name: "Size L", priceDelta: "5000.00", displayOrder: 2, isActive: true, createdAt: "x", groupId: "g1" };
const rawGroup = { id: "g1", chainId: "c1", code: "SIZE", name: "Size", isRequired: true, minSelections: 1, maxSelections: 1, displayOrder: 1, isActive: true, createdAt: "x", options: [rawOption], _count: { menuItems: 3 } };

describe("mapper nhóm tuỳ chọn (menu.service.ts:66-82)", () => {
  it('priceDelta "5000.00" → 5000; whitelist; isDefault là undefined', () => {
    expect(mapOption(rawOption)).toEqual({ id: "o1", name: "Size L", code: "L", priceDelta: 5000, displayOrder: 2, isActive: true });
    expect(mapOption(rawOption).isDefault).toBeUndefined();
    const g = mapGroup(rawGroup);
    expect(Object.keys(g).sort()).toEqual(["code", "displayOrder", "id", "isActive", "isRequired", "maxSelections", "menuItemCount", "minSelections", "name", "options"]);
    expect(g.options[0].priceDelta).toBe(5000);
  });
  it("_count.menuItems → menuItemCount (quyết định 18); response tạo/sửa không có _count → undefined", () => {
    expect(mapGroup(rawGroup).menuItemCount).toBe(3);
    expect(mapGroup({ ...rawGroup, _count: undefined }).menuItemCount).toBeUndefined();
  });
  it("nhóm không có options → mảng rỗng", () => {
    expect(mapGroup({ ...rawGroup, options: undefined }).options).toEqual([]);
  });
});

describe("real options — fetch giả, không gọi BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  const stub = (body: unknown) => {
    const fn = vi.fn().mockImplementation(async () => json(body));
    vi.stubGlobal("fetch", fn);
    return fn;
  };
  const calls = (fn: ReturnType<typeof vi.fn>): Call[] =>
    (fn.mock.calls as [string, RequestInit][]).map(([url, init]) => ({
      path: new URL(url).pathname.replace(/^\/api\/v1/, ""),
      method: init.method ?? "GET",
      body: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined,
    }));

  it("capabilities real đều false", () => {
    expect(optionsReal.capabilities).toEqual({ isDefault: false, allowBatching: false, branchStates: false });
    expect(optionsMock.capabilities).toEqual({ isDefault: true, allowBatching: true, branchStates: true });
  });

  it("listGroups: GET option-groups, giá Decimal chuỗi → số", async () => {
    const fn = stub([rawGroup]);
    const groups = await optionsReal.listGroups("c1");
    expect(calls(fn)).toEqual([{ path: "/restaurant-chains/c1/menu/option-groups", method: "GET", body: undefined }]);
    expect(groups[0].options[0].priceDelta).toBe(5000);
  });

  it("addGroup: POST option-groups đúng CreateMenuOptionGroupDto (menu.dto.ts:236-284), không gửi isActive/options", async () => {
    const fn = stub(rawGroup);
    await optionsReal.addGroup("c1", { name: " Size ", code: "SIZE", isRequired: true, minSelections: 1, maxSelections: 1 });
    expect(calls(fn)).toEqual([
      { path: "/restaurant-chains/c1/menu/option-groups", method: "POST", body: { code: "SIZE", name: "Size", isRequired: true, minSelections: 1, maxSelections: 1 } },
    ]);
  });

  it("patchGroup: PATCH chỉ trường được đặt; luật chọn đi đủ bộ ba", async () => {
    const fn = stub(rawGroup);
    await optionsReal.patchGroup("c1", "g1", { isActive: false });
    await optionsReal.patchGroup("c1", "g1", { isRequired: false, minSelections: 0, maxSelections: 3, displayOrder: 4 });
    expect(calls(fn)).toEqual([
      { path: "/restaurant-chains/c1/menu/option-groups/g1", method: "PATCH", body: { isActive: false } },
      { path: "/restaurant-chains/c1/menu/option-groups/g1", method: "PATCH", body: { isRequired: false, minSelections: 0, maxSelections: 3, displayOrder: 4 } },
    ]);
    await expect(optionsReal.patchGroup("c1", "g1", { isRequired: true })).rejects.toMatchObject({ status: 400 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("removeGroup: DELETE option-groups/:id", async () => {
    const fn = stub({ message: "ok" });
    await optionsReal.removeGroup("c1", "g1");
    expect(calls(fn)).toEqual([{ path: "/restaurant-chains/c1/menu/option-groups/g1", method: "DELETE", body: undefined }]);
  });

  it("addOption: POST …/options đúng CreateMenuOptionDto (menu.dto.ts:295-335); không có isActive/isDefault", async () => {
    const fn = stub(rawOption);
    const created = await optionsReal.addOption("c1", "g1", { name: "Size L", code: "L", priceDelta: 5000 });
    expect(calls(fn)).toEqual([{ path: "/restaurant-chains/c1/menu/option-groups/g1/options", method: "POST", body: { code: "L", name: "Size L", priceDelta: 5000 } }]);
    expect(created.priceDelta).toBe(5000);
  });

  it("patchOption: PATCH …/options/:id, KHÔNG gửi isDefault (BE forbidNonWhitelisted)", async () => {
    const fn = stub(rawOption);
    await optionsReal.patchOption("c1", "g1", "o1", { isActive: false, priceDelta: 7000, isDefault: true });
    expect(calls(fn)).toEqual([
      { path: "/restaurant-chains/c1/menu/option-groups/g1/options/o1", method: "PATCH", body: { priceDelta: 7000, isActive: false } },
    ]);
  });

  it("removeOption: DELETE …/options/:id", async () => {
    const fn = stub({ message: "ok" });
    await optionsReal.removeOption("c1", "g1", "o1");
    expect(calls(fn)).toEqual([{ path: "/restaurant-chains/c1/menu/option-groups/g1/options/o1", method: "DELETE", body: undefined }]);
  });

  it("setItemGroups: PUT items/:id/option-groups body { optionGroupIds } (menu.dto.ts:344)", async () => {
    const fn = stub([rawGroup, { ...rawGroup, id: "g2" }]);
    const saved = await optionsReal.setItemGroups("c1", "i1", ["g1", "g2"]);
    expect(calls(fn)).toEqual([{ path: "/restaurant-chains/c1/menu/items/i1/option-groups", method: "PUT", body: { optionGroupIds: ["g1", "g2"] } }]);
    expect(saved).toEqual(["g1", "g2"]);
  });

  it("kiểm trước khi gửi: mã sai, giá lẻ → 400 và không có request", async () => {
    const fn = stub(rawOption);
    await expect(optionsReal.addOption("c1", "g1", { name: "x", code: "thuong", priceDelta: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(optionsReal.addOption("c1", "g1", { name: "x", code: "OK", priceDelta: 10.5 })).rejects.toMatchObject({ status: 400 });
    await expect(optionsReal.addGroup("c1", { name: "x", code: "G", isRequired: false, minSelections: 1, maxSelections: 2 })).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("listItemConfigs: mỗi món một GET, không quá 4 request cùng lúc, bỏ món chưa gắn nhóm, không có noBatch", async () => {
    let inFlight = 0;
    let peak = 0;
    const fn = vi.fn().mockImplementation(async (url: string) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return json(url.includes("/items/i3/") ? [] : [{ ...rawGroup, id: `g-${url.split("/items/")[1].split("/")[0]}` }]);
    });
    vi.stubGlobal("fetch", fn);
    const ids = Array.from({ length: 11 }, (_, i) => `i${i + 1}`);
    const configs = await optionsReal.listItemConfigs("c1", ids);
    expect(fn).toHaveBeenCalledTimes(11);
    expect(peak).toBeLessThanOrEqual(ITEM_CONFIG_CONCURRENCY);
    expect(peak).toBe(ITEM_CONFIG_CONCURRENCY);
    expect(configs.map((c) => c.menuItemId)).toEqual(ids.filter((id) => id !== "i3"));
    expect(configs[0]).toEqual({ menuItemId: "i1", groupIds: ["g-i1"] });
    expect("noBatch" in configs[0]).toBe(false);
    await expect(optionsReal.listItemConfigs("c1")).rejects.toThrow();
  });

  it("listBranchStates và setItemNoBatch (chỉ mock): ném lỗi 'chưa hỗ trợ', không gọi BE", async () => {
    const fn = stub([]);
    await expect(optionsReal.listBranchStates("c1", "b1")).rejects.toThrow(/Chưa hỗ trợ/);
    await expect(optionsReal.setItemNoBatch("c1", "i1", true)).rejects.toThrow(/Chưa hỗ trợ/);
    expect(fn).not.toHaveBeenCalled();
  });

  it("giao diện không còn hàm cũ gửi/nhận cả nhóm", () => {
    for (const impl of [optionsReal, optionsMock]) {
      for (const name of ["createGroup", "updateGroup", "deleteGroup", "reorderGroups", "setOptionActive", "setItemConfig"]) {
        expect(name in impl, name).toBe(false);
      }
    }
  });

  it("real.ts và mapper.ts không import mock/store và không đụng localStorage", () => {
    for (const file of ["real.ts", "mapper.ts"]) {
      const source = readFileSync(resolve(process.cwd(), "src/api/modules/options", file), "utf8");
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/from\s+["'][^"']*\/mock\//);
      expect(code, file).not.toMatch(/\.\/(mock|persist)["']/);
      expect(code, file).not.toMatch(/localStorage|sessionStorage/);
    }
  });
});

describe("mapWithLimit", () => {
  it("giữ thứ tự kết quả, giới hạn đồng thời, dừng khi có lỗi", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapWithLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 3));
      inFlight--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
    await expect(mapWithLimit([1, 2, 3], 1, async (n) => { if (n === 2) throw new Error("x"); return n; })).rejects.toThrow("x");
    expect(await mapWithLimit([], 4, async () => 1)).toEqual([]);
  });
});

describe("mock options — thao tác từng dòng (cùng luật với real)", () => {
  let chainId = "";
  beforeEach(async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    clearPersistedOptions();
    resetMockStates();
    chainId = (await branchMock.listChains())[0].id;
  });

  it("addGroup rỗng → addOption; trùng mã nhóm 409; trùng mã tuỳ chọn 409; luật sai 400", async () => {
    const g = await optionsMock.addGroup(chainId, { name: "Độ cay", code: "SPICY", isRequired: false, minSelections: 0, maxSelections: 1 });
    expect(g.options).toEqual([]);
    await expect(optionsMock.addGroup(chainId, { name: "Khác", code: "SPICY", isRequired: false, minSelections: 0, maxSelections: 1 })).rejects.toMatchObject({ status: 409 });
    await expect(optionsMock.addGroup(chainId, { name: "Sai", code: "SAI", isRequired: false, minSelections: 2, maxSelections: 3 })).rejects.toMatchObject({ status: 400 });
    const o = await optionsMock.addOption(chainId, g.id, { name: "Cay", code: "HOT", priceDelta: 0 });
    expect(o).toMatchObject({ code: "HOT", isActive: true });
    await expect(optionsMock.addOption(chainId, g.id, { name: "Cay 2", code: "HOT", priceDelta: 0 })).rejects.toMatchObject({ status: 409 });
    expect((await optionsMock.listGroups(chainId)).find((x) => x.id === g.id)?.options).toHaveLength(1);
  });

  it("patchGroup / patchOption / removeOption / removeGroup", async () => {
    const g = await optionsMock.addGroup(chainId, { name: "Nhóm", code: "NHOM", isRequired: false, minSelections: 0, maxSelections: 2 });
    const a = await optionsMock.addOption(chainId, g.id, { name: "A", code: "A", priceDelta: 1000 });
    const b = await optionsMock.addOption(chainId, g.id, { name: "B", code: "B", priceDelta: 2000 });
    const patched = await optionsMock.patchGroup(chainId, g.id, { isRequired: true, minSelections: 1, maxSelections: 2, name: "Nhóm mới" });
    expect(patched).toMatchObject({ isRequired: true, minSelections: 1, name: "Nhóm mới" });
    await expect(optionsMock.patchGroup(chainId, g.id, { isRequired: true })).rejects.toMatchObject({ status: 400 });
    expect(await optionsMock.patchOption(chainId, g.id, a.id, { priceDelta: 1500, isActive: false })).toMatchObject({ priceDelta: 1500, isActive: false });
    await optionsMock.removeOption(chainId, g.id, b.id);
    await expect(optionsMock.removeOption(chainId, g.id, b.id)).rejects.toMatchObject({ status: 404 });
    await optionsMock.removeGroup(chainId, g.id);
    expect((await optionsMock.listGroups(chainId)).some((x) => x.id === g.id)).toBe(false);
  });

  it("tuỳ chọn mặc định không tắt được (400) cho tới khi bỏ mặc định tường minh", async () => {
    const g = await optionsMock.addGroup(chainId, { name: "Đường", code: "DUONG", isRequired: false, minSelections: 0, maxSelections: 1 });
    const o = await optionsMock.addOption(chainId, g.id, { name: "100%", code: "D100", priceDelta: 0 });
    await optionsMock.patchOption(chainId, g.id, o.id, { isDefault: true });
    await expect(optionsMock.patchOption(chainId, g.id, o.id, { isActive: false })).rejects.toMatchObject({ status: 400 });
    await optionsMock.patchOption(chainId, g.id, o.id, { isDefault: false });
    expect(await optionsMock.patchOption(chainId, g.id, o.id, { isActive: false })).toMatchObject({ isActive: false });
  });

  it("listGroups có menuItemCount = số món đang dùng nhóm (nguồn tương đương _count.menuItems), đổi theo setItemGroups, không lưu vào bản chụp", async () => {
    const [g1, g2] = await optionsMock.listGroups(chainId);
    const base = g1.menuItemCount ?? 0;
    await optionsMock.setItemGroups(chainId, "item-a", [g1.id]);
    await optionsMock.setItemGroups(chainId, "item-b", [g1.id, g2.id]);
    const after = await optionsMock.listGroups(chainId);
    expect(after.find((g) => g.id === g1.id)?.menuItemCount).toBe(base + 2);
    expect(after.find((g) => g.id === g2.id)?.menuItemCount).toBe((g2.menuItemCount ?? 0) + 1);
    expect(localStorage.getItem(`smartfnb:mock:options:v1:${chainId}`) ?? "").not.toContain("menuItemCount");
    await optionsMock.setItemGroups(chainId, "item-b", []);
    expect((await optionsMock.listGroups(chainId)).find((g) => g.id === g1.id)?.menuItemCount).toBe(base + 1);
  });

  it("setItemGroups lưu thứ tự, giữ cờ noBatch; listItemGroups đọc đúng thứ tự; listItemConfigs lọc theo món", async () => {
    const groups = await optionsMock.listGroups(chainId);
    const [g1, g2] = groups;
    await optionsMock.setItemGroups(chainId, "item-x", [g1.id]);
    await optionsMock.setItemNoBatch(chainId, "item-x", true);
    expect(await optionsMock.setItemGroups(chainId, "item-x", [g2.id, g1.id])).toEqual([g2.id, g1.id]);
    expect((await optionsMock.listItemGroups(chainId, "item-x")).map((g) => g.id)).toEqual([g2.id, g1.id]);
    expect(await optionsMock.listItemConfigs(chainId, ["item-x"])).toEqual([{ menuItemId: "item-x", groupIds: [g2.id, g1.id], noBatch: true }]);
    expect(await optionsMock.listItemConfigs(chainId, ["khong-co"])).toEqual([]);
    await expect(optionsMock.setItemGroups(chainId, "item-x", [g1.id, g1.id])).rejects.toMatchObject({ status: 400 });
    await expect(optionsMock.setItemGroups(chainId, "item-x", ["khong-co"])).rejects.toMatchObject({ status: 404 });
  });
});
