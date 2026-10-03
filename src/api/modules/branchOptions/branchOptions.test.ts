import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { resetMockStates } from "../../mock/store";
import { branchMock } from "../branch/mock";
import { optionsMock } from "../options/mock";
import { groupBranchOptions, mapBranchOption, mapWriteResult, type RawBranchOption } from "./mapper";
import { branchOptionsMock, MOCK_AFFECTED_TOPPING_ORDERS } from "./mock";
import { BRANCH_OPTIONS_STORAGE_PREFIX, clearPersistedBranchOptions } from "./persist";
import { branchOptionsReal } from "./real";

mockControl.latency = [0, 0];
mockControl.failure = null;

const raw = (over: Partial<RawBranchOption> & { id: string }): RawBranchOption => ({
  name: "Tuỳ chọn",
  priceDelta: "0",
  isActive: true,
  group: { id: "g1", name: "Mức đường", isActive: true },
  isAvailable: true,
  effectiveAvailable: true,
  ...over,
});

describe("mapper tuỳ chọn chi nhánh", () => {
  it("whitelist: chỉ giữ trường cần, tiền qua parseAmount", () => {
    const row = mapBranchOption({ ...raw({ id: "o1", priceDelta: "10000.00" }), extra: "x", remainingPortions: 3 } as RawBranchOption);
    expect(row).toEqual({ optionId: "o1", name: "Tuỳ chọn", priceDelta: 10000, groupId: "g1", groupName: "Mức đường", ownerDisabled: false, isAvailable: true, effectiveAvailable: true });
  });

  it("Manager tự tắt (isAvailable=false, isActive=true) KHÔNG bị coi là Owner tắt", () => {
    const row = mapBranchOption(raw({ id: "o1", isAvailable: false, effectiveAvailable: false }));
    expect(row.ownerDisabled).toBe(false);
    expect(row.effectiveAvailable).toBe(false);
  });

  it("Owner tắt tuỳ chọn hoặc cả nhóm → ownerDisabled", () => {
    expect(mapBranchOption(raw({ id: "o1", isActive: false, effectiveAvailable: false })).ownerDisabled).toBe(true);
    expect(mapBranchOption(raw({ id: "o2", group: { id: "g1", name: "Mức đường", isActive: false }, effectiveAvailable: false })).ownerDisabled).toBe(true);
  });

  it("gom theo group.id, nhóm rồi tuỳ chọn sắp theo tên", () => {
    const rows = [
      raw({ id: "a", name: "Size M", group: { id: "g2", name: "Kích cỡ", isActive: true } }),
      raw({ id: "b", name: "70% đường" }),
      raw({ id: "c", name: "100% đường" }),
      raw({ id: "d", name: "Size L", group: { id: "g2", name: "Kích cỡ", isActive: true } }),
    ].map(mapBranchOption);
    const groups = groupBranchOptions(rows);
    expect(groups.map((g) => g.groupName)).toEqual(["Kích cỡ", "Mức đường"]);
    expect(groups[0].options.map((o) => o.name)).toEqual(["Size L", "Size M"]);
    expect(groups[1].options.map((o) => o.name)).toEqual(["100% đường", "70% đường"]);
  });

  it("kết quả ghi: đếm đơn bị ảnh hưởng, không chép affectedOrderIds", () => {
    const r = mapWriteResult({ optionId: "o1", isAvailable: false, effectiveAvailable: false, affectedOrderIds: ["x", "y"] });
    expect(r).toEqual({ optionId: "o1", isAvailable: false, effectiveAvailable: false, affectedOrderCount: 2 });
    expect(mapWriteResult({ optionId: "o1", isAvailable: true, effectiveAvailable: true }).affectedOrderCount).toBe(0);
  });
});

describe("real tuỳ chọn chi nhánh", () => {
  afterEach(() => vi.unstubAllGlobals());
  const respond = (body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
  const call = (fn: ReturnType<typeof vi.fn>) => {
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    return { path: new URL(url).pathname, method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : undefined };
  };

  it("GET /manager/menu-options, không gửi branchId", async () => {
    const fetchMock = respond([raw({ id: "o1" })]);
    vi.stubGlobal("fetch", fetchMock);
    const rows = await branchOptionsReal.listBranchStates("b1");
    expect(rows).toHaveLength(1);
    expect(call(fetchMock).method).toBe("GET");
    expect(call(fetchMock).path).toMatch(/\/manager\/menu-options$/);
    expect(String(fetchMock.mock.calls[0][0])).not.toMatch(/b1/);
  });

  it("PATCH /manager/menu-options/{id}/availability chỉ gửi { isAvailable }, trả số đơn bị ảnh hưởng", async () => {
    const fetchMock = respond({ optionId: "o1", isAvailable: false, effectiveAvailable: false, affectedOrderIds: ["x", "y", "z"] });
    vi.stubGlobal("fetch", fetchMock);
    const r = await branchOptionsReal.setBranchOptionAvailable("b1", "o1", false);
    expect(call(fetchMock)).toMatchObject({ method: "PATCH", body: { isAvailable: false } });
    expect(call(fetchMock).path).toMatch(/\/manager\/menu-options\/o1\/availability$/);
    expect(Object.keys(call(fetchMock).body)).toEqual(["isAvailable"]);
    expect(r.affectedOrderCount).toBe(3);
  });
});

describe("mock tuỳ chọn chi nhánh — lưu qua F5", () => {
  let chainId = "";
  let branchId = "";
  const key = () => `${BRANCH_OPTIONS_STORAGE_PREFIX}${chainId}:${branchId}`;
  beforeEach(async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    chainId = (await branchMock.listChains())[0].id;
    branchId = (await branchMock.listBranches(chainId))[0].id;
    clearPersistedBranchOptions();
    resetMockStates();
  });
  afterEach(() => setScenario({ expired: false }));

  it("cùng shape với real, có nhóm và tuỳ chọn", async () => {
    const rows = await branchOptionsMock.listBranchStates(branchId);
    expect(rows.length).toBeGreaterThan(5);
    expect(Object.keys(rows[0]).sort()).toEqual(["effectiveAvailable", "groupId", "groupName", "isAvailable", "name", "optionId", "ownerDisabled", "priceDelta"]);
  });

  it("tắt rồi 'tải lại trang' → vẫn tắt; bật lại thì bật", async () => {
    const target = (await branchOptionsMock.listBranchStates(branchId)).find((r) => r.isAvailable && !r.ownerDisabled)!;
    const off = await branchOptionsMock.setBranchOptionAvailable(branchId, target.optionId, false);
    expect(off).toMatchObject({ isAvailable: false, effectiveAvailable: false, affectedOrderCount: 0 });
    expect(localStorage.getItem(key())).toContain(target.optionId);
    resetMockStates();
    const after = (await branchOptionsMock.listBranchStates(branchId)).find((r) => r.optionId === target.optionId)!;
    expect(after).toMatchObject({ isAvailable: false, ownerDisabled: false, effectiveAvailable: false });
    await branchOptionsMock.setBranchOptionAvailable(branchId, target.optionId, true);
    resetMockStates();
    expect((await branchOptionsMock.listBranchStates(branchId)).find((r) => r.optionId === target.optionId)!.isAvailable).toBe(true);
  });

  it("xoá dữ liệu mock → trạng thái đã lưu biến mất sau khi tải lại", async () => {
    const target = (await branchOptionsMock.listBranchStates(branchId)).find((r) => r.isAvailable && !r.ownerDisabled)!;
    await branchOptionsMock.setBranchOptionAvailable(branchId, target.optionId, false);
    clearPersistedBranchOptions();
    expect(localStorage.getItem(key())).toBeNull();
    resetMockStates();
    expect((await branchOptionsMock.listBranchStates(branchId)).find((r) => r.optionId === target.optionId)!.isAvailable).toBe(true);
  });

  it("dữ liệu đã lưu hỏng → dùng dữ liệu sinh sẵn, không lỗi", async () => {
    for (const bad of ["{không phải json", "null", "[]", '[{"optionId":1}]']) {
      localStorage.setItem(key(), bad);
      resetMockStates();
      expect((await branchOptionsMock.listBranchStates(branchId)).length).toBeGreaterThan(5);
    }
  });

  it("Owner tắt tuỳ chọn → chi nhánh không bật lại được (403), tắt thêm vẫn được", async () => {
    const groups = await optionsMock.listGroups(chainId);
    const opt = groups.flatMap((g) => g.options.map((o) => ({ g, o }))).find(({ o }) => !o.isDefault)!;
    await optionsMock.setOptionActive(chainId, opt.g.id, opt.o.id, false);
    const row = (await branchOptionsMock.listBranchStates(branchId)).find((r) => r.optionId === opt.o.id)!;
    expect(row).toMatchObject({ ownerDisabled: true, effectiveAvailable: false });
    await expect(branchOptionsMock.setBranchOptionAvailable(branchId, opt.o.id, true)).rejects.toMatchObject({ status: 403 });
    await expect(branchOptionsMock.setBranchOptionAvailable(branchId, opt.o.id, false)).resolves.toMatchObject({ isAvailable: false });
  });

  it("dữ liệu mẫu có tuỳ chọn Owner đã tắt (Pudding) và tắt Topping trả số đơn bị ảnh hưởng > 0", async () => {
    const rows = await branchOptionsMock.listBranchStates(branchId);
    expect(rows.filter((r) => r.ownerDisabled).map((r) => r.name)).toContain("Pudding");
    const pearl = rows.find((r) => r.name === "Trân châu đen")!;
    expect((await branchOptionsMock.setBranchOptionAvailable(branchId, pearl.optionId, false)).affectedOrderCount).toBe(MOCK_AFFECTED_TOPPING_ORDERS);
    const size = rows.find((r) => r.groupName === "Size" && !r.ownerDisabled)!;
    expect((await branchOptionsMock.setBranchOptionAvailable(branchId, size.optionId, false)).affectedOrderCount).toBe(0);
    expect((await branchOptionsMock.setBranchOptionAvailable(branchId, pearl.optionId, true)).affectedOrderCount).toBe(0);
  });

  it("hết hạn gói: ghi bị chặn như BE", async () => {
    setScenario({ expired: true });
    const target = (await branchOptionsMock.listBranchStates(branchId))[0];
    await expect(branchOptionsMock.setBranchOptionAvailable(branchId, target.optionId, false)).rejects.toMatchObject({ status: 403, code: "SUBSCRIPTION_READ_ONLY" });
  });
});
