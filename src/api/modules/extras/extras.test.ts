/** OW-15 (mục 27, BR-80): quy tắc nhập, ánh xạ DTO của BE, real với fetch giả (đúng route/thân), mock cùng luật. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockControl } from "../../mock/control";
import { mapExtra, mapItemExtras } from "./mapper";
import { extrasMock, resetExtrasMock } from "./mock";
import { extrasReal } from "./real";
import { validateExtra, validateItemExtras } from "./rules";

mockControl.latency = [0, 0];
mockControl.failure = null;

describe("quy tắc nhập topping (cùng ngưỡng BE)", () => {
  it("tên 1–100 ký tự, giá số nguyên đồng ≥ 0", () => {
    expect(validateExtra({ name: "Trân châu", price: 5000 })).toBeNull();
    expect(validateExtra({ name: "  ", price: 0 })).toMatch(/không được để trống/);
    expect(validateExtra({ name: "a".repeat(101), price: 0 })).toMatch(/100/);
    expect(validateExtra({ name: "A", price: -1 })).toMatch(/số nguyên đồng/);
    expect(validateExtra({ name: "A", price: 1500.5 })).toMatch(/số nguyên đồng/);
  });

  it("món: số phần mỗi ly 1–5, topping không trùng, tổng phần 0–100", () => {
    const ok = { maxExtras: 5, extras: [{ extraId: "a", price: 5000, maxQuantity: 5 }] };
    expect(validateItemExtras(ok)).toBeNull();
    expect(validateItemExtras({ ...ok, extras: [{ extraId: "a", price: 5000, maxQuantity: 0 }] })).toMatch(/từ 1 đến 5/);
    expect(validateItemExtras({ ...ok, extras: [{ extraId: "a", price: 5000, maxQuantity: 6 }] })).toMatch(/từ 1 đến 5/);
    expect(validateItemExtras({ ...ok, extras: [{ extraId: "a", price: -5, maxQuantity: 1 }] })).toMatch(/số nguyên đồng/);
    expect(validateItemExtras({ ...ok, extras: [ok.extras[0], ok.extras[0]] })).toMatch(/một lần/);
    expect(validateItemExtras({ ...ok, maxExtras: 101 })).toMatch(/0 đến 100/);
    expect(validateItemExtras({ ...ok, maxExtras: 2.5 })).toMatch(/0 đến 100/);
  });
});

describe("ánh xạ", () => {
  it("giá chuỗi thập phân của BE → số nguyên; topping của món sắp theo displayOrder", () => {
    expect(mapExtra({ id: "e1", name: "Trân châu", price: "5000.00", isActive: true })).toEqual({ id: "e1", name: "Trân châu", price: 5000, isActive: true });
    const out = mapItemExtras({
      id: "m1",
      maxExtras: 5,
      extras: [
        { extraId: "b", price: "7000.00", maxQuantity: 2, displayOrder: 1, extra: { id: "b", name: "Pudding", price: "6000.00", isActive: false } },
        { extraId: "a", price: "5000.00", maxQuantity: 3, displayOrder: 0, extra: { id: "a", name: "Trân châu", price: "5000.00", isActive: true } },
      ],
    });
    expect(out.menuItemId).toBe("m1");
    expect(out.extras.map((x) => [x.extraId, x.price, x.maxQuantity, x.libraryActive])).toEqual([
      ["a", 5000, 3, true],
      ["b", 7000, 2, false],
    ]);
  });
});

describe("real — fetch giả, không gọi BE", () => {
  afterEach(() => vi.unstubAllGlobals());
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const stub = (response: Response) => {
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

  it("tạo: POST đúng route, chỉ name + price (tên đã cắt khoảng trắng)", async () => {
    const fn = stub(json({ id: "e1", name: "Trân châu", price: "5000.00", isActive: true }, 201));
    const out = await extrasReal.createExtra("c1", { name: " Trân châu ", price: 5000 });
    expect(calls(fn)[0]).toEqual({ path: "/restaurant-chains/c1/menu/extras", method: "POST", body: { name: "Trân châu", price: 5000 } });
    expect(out.price).toBe(5000);
  });

  it("sửa: PUT đủ name, price, isActive; tắt: DELETE", async () => {
    const fn = stub(json({ id: "e1", name: "Trân châu", price: "6000.00", isActive: true }));
    await extrasReal.updateExtra("c1", "e1", { name: "Trân châu", price: 6000, isActive: true });
    expect(calls(fn)[0]).toEqual({ path: "/restaurant-chains/c1/menu/extras/e1", method: "PUT", body: { name: "Trân châu", price: 6000, isActive: true } });
    await extrasReal.disableExtra("c1", "e1");
    expect(calls(fn)[1]).toMatchObject({ path: "/restaurant-chains/c1/menu/extras/e1", method: "DELETE" });
  });

  it("gắn vào món: PUT với displayOrder theo vị trí, price luôn gửi tường minh", async () => {
    const fn = stub(json([]));
    await extrasReal.setItemExtras("c1", "m1", {
      maxExtras: 5,
      extras: [
        { extraId: "b", price: 7000, maxQuantity: 2 },
        { extraId: "a", price: 5000, maxQuantity: 3 },
      ],
    });
    expect(calls(fn)[0]).toEqual({
      path: "/restaurant-chains/c1/menu/items/m1/extras",
      method: "PUT",
      body: {
        maxExtras: 5,
        extras: [
          { extraId: "b", price: 7000, maxQuantity: 2, displayOrder: 0 },
          { extraId: "a", price: 5000, maxQuantity: 3, displayOrder: 1 },
        ],
      },
    });
  });

  it("sai quy tắc: 400 và KHÔNG có request nào; lỗi 409 của BE được ném lại", async () => {
    const fn = stub(json({ statusCode: 409, message: "An extra with this name already exists" }, 409));
    await expect(extrasReal.createExtra("c1", { name: "", price: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(extrasReal.setItemExtras("c1", "m1", { maxExtras: 5, extras: [{ extraId: "a", price: 1, maxQuantity: 9 }] })).rejects.toMatchObject({ status: 400 });
    expect(fn).not.toHaveBeenCalled();
    await expect(extrasReal.createExtra("c1", { name: "Trùng", price: 1 })).rejects.toMatchObject({ status: 409 });
  });
});

describe("mock — cùng luật với BE", () => {
  beforeEach(() => resetExtrasMock());

  it("tạo, trùng tên → 409, sửa, tắt giữ liên kết với món", async () => {
    const a = await extrasMock.createExtra("c1", { name: "Trân châu", price: 5000 });
    await expect(extrasMock.createExtra("c1", { name: " trân CHÂU ", price: 1 })).rejects.toMatchObject({ status: 409 });
    await extrasMock.setItemExtras("c1", "m1", { maxExtras: 5, extras: [{ extraId: a.id, price: 7000, maxQuantity: 2 }] });
    await extrasMock.updateExtra("c1", a.id, { name: "Trân châu đen", price: 6000, isActive: true });
    expect((await extrasMock.getItemExtras("c1", "m1")).extras[0]).toMatchObject({ price: 7000, name: "Trân châu", libraryActive: true });
    await extrasMock.disableExtra("c1", a.id);
    const after = await extrasMock.getItemExtras("c1", "m1");
    expect(after.extras).toHaveLength(1);
    expect(after.extras[0].libraryActive).toBe(false);
    await expect(extrasMock.disableExtra("c1", "khong-co")).rejects.toMatchObject({ status: 404 });
  });

  it("món chưa gắn: mặc định tổng 5 phần; topping ngoài chuỗi → 400; chuỗi khác không lẫn", async () => {
    expect(await extrasMock.getItemExtras("c1", "m9")).toEqual({ menuItemId: "m9", maxExtras: 5, extras: [] });
    await expect(extrasMock.setItemExtras("c1", "m9", { maxExtras: 5, extras: [{ extraId: "x", price: 1, maxQuantity: 1 }] })).rejects.toMatchObject({ status: 400 });
    await extrasMock.createExtra("c1", { name: "A", price: 1 });
    expect(await extrasMock.listExtras("c2")).toEqual([]);
  });
});
