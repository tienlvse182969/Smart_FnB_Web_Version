import { beforeEach, describe, expect, it } from "vitest";
import { mockControl } from "../../mock/control";
import { setScenario } from "../../mock/scenario";
import { branchMock } from "../branch/mock";
import { mapAssignedBranches, mapBranchMenu, mapCategory, mapItem, type RawBranchMenu, type RawItem } from "./mapper";
import { menuMock } from "./mock";
import { assertWholeVnd, suggestSku } from "./validate";

mockControl.latency = [0, 0];
mockControl.failure = null;

const rawItem: RawItem = {
  id: "i1",
  categoryId: "c1",
  sku: "DEMO-SOUP",
  name: "Canh chua cá",
  description: null,
  price: "75000.00",
  imageUrl: null,
  preparationMinutes: null,
  isActive: true,
  isAvailable: true,
  category: { id: "c1", name: "Món chính" },
  branches: [
    { branchId: "b1", isEnabled: true, isAvailable: true, remainingPortions: 8, branch: { id: "b1", code: "B1", name: "CN 1", status: "ACTIVE" } },
    { branchId: "b2", isEnabled: false, isAvailable: false, remainingPortions: null, branch: { id: "b2", code: "B2", name: "CN 2", status: "ACTIVE" } },
  ],
  enabledBranchCount: 1,
};

describe("mapper menu", () => {
  it("bỏ remainingPortions và mọi trường lạ (kho v7)", () => {
    const item = mapItem(rawItem);
    expect(JSON.stringify(item)).not.toMatch(/remaining|portion/i);
    expect(item.branches).toEqual([
      { branchId: "b1", isEnabled: true, isAvailable: true },
      { branchId: "b2", isEnabled: false, isAvailable: false },
    ]);
    expect(Object.keys(item).sort()).toEqual(
      ["branches", "categoryId", "categoryName", "description", "enabledBranchCount", "id", "imageUrl", "isActive", "name", "preparationMinutes", "price", "sku"].sort(),
    );
    expect(JSON.stringify(mapItem({ ...rawItem, internalCost: 5 } as RawItem))).not.toContain("internalCost");
  });

  it("tiền qua parseAmount: chuỗi thập phân → số", () => {
    expect(mapItem(rawItem).price).toBe(75000);
    expect(mapItem({ ...rawItem, price: "75000" }).price).toBe(75000);
    expect(mapItem({ ...rawItem, price: 42000 }).price).toBe(42000);
    expect(mapItem({ ...rawItem, price: "" }).price).toBe(0);
  });

  it("branches[] và enabledBranchCount; thiếu branches (create/update) → rỗng", () => {
    expect(mapItem(rawItem).enabledBranchCount).toBe(1);
    const created = mapItem({ ...rawItem, branches: undefined, enabledBranchCount: undefined });
    expect(created.branches).toEqual([]);
    expect(created.enabledBranchCount).toBe(0);
  });

  it("danh mục: _count.items → itemCount", () => {
    expect(mapCategory({ id: "c", name: "A", displayOrder: 2, isActive: true, _count: { items: 3 } })).toEqual({
      id: "c",
      name: "A",
      description: null,
      displayOrder: 2,
      isActive: true,
      itemCount: 3,
    });
  });

  it("menu chi nhánh: làm phẳng theo danh mục, không remainingPortions", () => {
    const raw: RawBranchMenu = {
      categories: [{ id: "c1", name: "Món chính", items: [{ id: "i1", sku: "S", name: "Canh", price: "75000.00", isAvailable: true, remainingPortions: 3 }] }],
    };
    const flat = mapBranchMenu(raw);
    expect(flat).toEqual([{ menuItemId: "i1", sku: "S", name: "Canh", categoryName: "Món chính", price: 75000, imageUrl: null, isAvailable: true }]);
    expect(JSON.stringify(flat)).not.toMatch(/remaining/i);
  });

  it("kết quả gán chi nhánh (PUT …/branches)", () => {
    expect(mapAssignedBranches({ branches: [{ id: "b1", isEnabled: true, isAvailable: false, remainingPortions: 2 }] })).toEqual([
      { branchId: "b1", isEnabled: true, isAvailable: false },
    ]);
  });
});

describe("quy tắc nhập liệu", () => {
  it("giá phải là số nguyên đồng ≥ 0 (BR-19)", () => {
    expect(() => assertWholeVnd(30000)).not.toThrow();
    expect(() => assertWholeVnd(0)).not.toThrow();
    for (const bad of [30000.5, -1, NaN, "3000", null]) expect(() => assertWholeVnd(bad)).toThrow(/số nguyên/);
  });

  it("gợi ý SKU: chữ hoa không dấu nối bằng -", () => {
    expect(suggestSku("Trà sữa trân châu")).toBe("TRA-SUA-TRAN-CHAU");
    expect(suggestSku("  Cà phê Đen  ")).toBe("CA-PHE-DEN");
    expect(suggestSku("x".repeat(80))).toHaveLength(50);
  });
});

describe("mock menu — cùng quy tắc BE", () => {
  let chainId = "";
  let branchIds: string[] = [];
  beforeEach(async () => {
    setScenario({ profile: "A", tier: null, expired: false });
    const chains = await branchMock.listChains();
    chainId = chains[0].id;
    branchIds = (await branchMock.listBranches(chainId)).map((b) => b.id);
  });

  it("danh mục: 409 trùng tên, 409 xoá khi còn món, sửa tên/ẩn/đổi thứ tự, xoá danh mục rỗng", async () => {
    const created = await menuMock.createCategory(chainId, { name: "Danh mục thử", displayOrder: 50 });
    await expect(menuMock.createCategory(chainId, { name: "  danh mục THỬ " })).rejects.toMatchObject({ status: 409 });
    await expect(menuMock.updateCategory(chainId, created.id, { name: (await menuMock.listCategories(chainId))[0].name })).rejects.toMatchObject({ status: 409 });

    const renamed = await menuMock.updateCategory(chainId, created.id, { name: "Danh mục đổi tên", description: "mô tả", isActive: false, displayOrder: 3 });
    expect(renamed).toMatchObject({ name: "Danh mục đổi tên", isActive: false, displayOrder: 3 });

    const withItems = (await menuMock.listCategories(chainId)).find((c) => c.itemCount > 0)!;
    await expect(menuMock.deleteCategory(chainId, withItems.id)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("item(s)") });

    await menuMock.deleteCategory(chainId, created.id);
    expect((await menuMock.listCategories(chainId)).some((c) => c.id === created.id)).toBe(false);
  });

  it("món: thêm với branchIds tường minh; 409 trùng SKU; giá lẻ bị từ chối; SKU không đổi được", async () => {
    const cat = (await menuMock.listCategories(chainId))[0];
    const input = { categoryId: cat.id, sku: "TEST-SKU-1", name: "Món thử", price: 33000, branchIds: branchIds.slice(0, 1) };
    const item = await menuMock.createItem(chainId, input);
    expect(item.enabledBranchCount).toBe(1);
    expect(item.branches).toEqual([{ branchId: branchIds[0], isEnabled: true, isAvailable: true }]);
    await expect(menuMock.createItem(chainId, { ...input, name: "Trùng" })).rejects.toMatchObject({ status: 409 });
    await expect(menuMock.createItem(chainId, { ...input, sku: "TEST-SKU-2", price: 33000.5 })).rejects.toMatchObject({ status: 400 });
    await expect(menuMock.createItem(chainId, { ...input, sku: "thường", name: "x" })).rejects.toMatchObject({ status: 400 });

    const updated = await menuMock.updateItem(chainId, item.id, { name: "Món thử đã sửa", price: 35000, preparationMinutes: 4 });
    expect(updated).toMatchObject({ name: "Món thử đã sửa", price: 35000, preparationMinutes: 4, sku: "TEST-SKU-1" });
    await expect(menuMock.updateItem(chainId, item.id, { price: -5 })).rejects.toMatchObject({ status: 400 });
  });

  it("bật/tắt cấp chuỗi, gán chi nhánh (chi nhánh bỏ ra bị tắt), lọc, xoá", async () => {
    const cat = (await menuMock.listCategories(chainId))[0];
    const item = await menuMock.createItem(chainId, { categoryId: cat.id, sku: "TEST-SKU-3", name: "Món lọc thử", price: 20000, branchIds });
    expect((await menuMock.setItemActive(chainId, item.id, false)).isActive).toBe(false);
    expect((await menuMock.listItems(chainId, { isActive: false })).some((i) => i.id === item.id)).toBe(true);
    expect((await menuMock.listItems(chainId, { isActive: true })).some((i) => i.id === item.id)).toBe(false);
    expect((await menuMock.listItems(chainId, { search: "lọc thử" })).map((i) => i.id)).toContain(item.id);
    expect((await menuMock.listItems(chainId, { categoryId: cat.id })).every((i) => i.categoryId === cat.id)).toBe(true);

    const rows = await menuMock.setItemBranches(chainId, item.id, branchIds.slice(0, 1));
    expect(rows.filter((r) => r.isEnabled).map((r) => r.branchId)).toEqual([branchIds[0]]);
    const listed = (await menuMock.listItems(chainId, { search: "lọc thử" }))[0];
    expect(listed.enabledBranchCount).toBe(1);

    await menuMock.deleteItem(chainId, item.id);
    expect((await menuMock.listItems(chainId, { search: "lọc thử" })).length).toBe(0);
  });

  it("menu chi nhánh theo BR-12: ẩn món Owner đã tắt hoặc chưa gán; Manager chỉ bật/tắt 'còn bán'", async () => {
    const cat = (await menuMock.listCategories(chainId))[0];
    const [b1, b2] = branchIds;
    const item = await menuMock.createItem(chainId, { categoryId: cat.id, sku: "TEST-SKU-4", name: "Món chi nhánh", price: 10000, branchIds: [b1] });
    expect((await menuMock.listBranchMenu(b1)).some((m) => m.menuItemId === item.id)).toBe(true);
    expect((await menuMock.listBranchMenu(b2)).some((m) => m.menuItemId === item.id)).toBe(false);

    await menuMock.setBranchItemAvailable(b1, item.id, false);
    expect((await menuMock.listBranchMenu(b1)).find((m) => m.menuItemId === item.id)!.isAvailable).toBe(false);

    await menuMock.setItemActive(chainId, item.id, false);
    expect((await menuMock.listBranchMenu(b1)).some((m) => m.menuItemId === item.id)).toBe(false);
    expect(JSON.stringify(await menuMock.listBranchMenu(b1))).not.toMatch(/remaining/i);
  });
});
