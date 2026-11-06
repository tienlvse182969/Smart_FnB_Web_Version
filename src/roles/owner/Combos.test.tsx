/** OW-14, OW-04: trình soạn combo (thành phần, mặc định, so sánh giá, cảnh báo món tắt, chặn rời khi chưa lưu) và danh sách + gán chi nhánh. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { combosApi, menuApi } from "../../api";
import { resetCombosMock } from "../../api/modules/combos/mock";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { useAppStore } from "../../store";
import type { Combo, MenuCategory, MenuItem } from "../../types";
import ComboEditor from "./ComboEditor";
import CombosPage from "./CombosPage";

mockControl.latency = [0, 0];
mockControl.failure = null;
vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const item = (id: string, name: string, price: number, over: Partial<MenuItem> = {}): MenuItem => ({
  id,
  categoryId: "cat",
  categoryName: "Danh mục",
  sku: id.toUpperCase(),
  name,
  description: null,
  price,
  imageUrl: null,
  preparationMinutes: null,
  allowBatching: true,
  isActive: true,
  branches: [{ branchId: "b1", isEnabled: true, isAvailable: true }],
  enabledBranchCount: 1,
  ...over,
});
const items = [item("a", "Bánh mì thịt", 25000), item("b", "Cà phê sữa", 30000), item("c", "Trà đào", 28000, { isActive: false, branches: [] })];
const categories: MenuCategory[] = [{ id: "cat", name: "Combo", description: null, displayOrder: 0, isActive: true, itemCount: 3 }];

beforeEach(() => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetCombosMock();
  act(() =>
    useAppStore.setState({
      chainId: "c1",
      branches: [
        { id: "b1", name: "Quận 1", address: "1 A" },
        { id: "b2", name: "Quận 3", address: "3 B" },
      ] as never,
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, branches: [] }));
});

const pick = async (combo: HTMLElement, optionText: string) => {
  fireEvent.mouseDown(combo);
  const matches = await screen.findAllByText(optionText, { selector: ".ant-select-item-option-content" });
  fireEvent.click(matches[matches.length - 1]);
};

describe("trình soạn combo", () => {
  it("tạo combo hai món cố định: so sánh giá mua lẻ và gửi đúng thân", async () => {
    const create = vi.spyOn(combosApi, "createCombo");
    const onSaved = vi.fn().mockResolvedValue(undefined);
    render(
      <AntApp>
        <ComboEditor target="new" categories={categories} items={items} onClose={() => undefined} onSaved={onSaved} />
      </AntApp>,
    );
    expect((screen.getByTestId("combo-save") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("combo-problems").textContent).toMatch(/Nhập tên combo/);

    fireEvent.change(screen.getByTestId("combo-name"), { target: { value: "Combo Sáng" } });
    fireEvent.change(screen.getByTestId("combo-price"), { target: { value: "39000" } });
    await pick(screen.getByLabelText("Món 1 của thành phần 1"), "Bánh mì thịt · 25.000 ₫");
    await pick(screen.getByLabelText("Món 1 của thành phần 2"), "Cà phê sữa · 30.000 ₫");

    await waitFor(() => expect(screen.getByTestId("combo-compare").textContent).toMatch(/Rẻ hơn mua lẻ/));
    expect(screen.getByTestId("combo-compare").textContent).toMatch(/55\.000/);
    await waitFor(() => expect((screen.getByTestId("combo-save") as HTMLButtonElement).disabled).toBe(false));
    await act(async () => fireEvent.click(screen.getByTestId("combo-save")));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const sent = create.mock.calls[0][1];
    expect(sent).toMatchObject({ name: "Combo Sáng", categoryId: "cat", price: 39000 });
    expect(sent).not.toHaveProperty("imageUrl"); // BE chưa có API tải ảnh combo: web không đặt ảnh
    expect(screen.queryByText(/Ảnh combo/)).toBeNull();
    expect(sent.components.map((c) => [c.type, c.name, c.choices[0].menuItemId])).toEqual([
      ["FIXED", "Bánh mì thịt", "a"],
      ["FIXED", "Cà phê sữa", "b"],
    ]);
  });

  it("nhóm biến thể: món mặc định luôn đúng một; gỡ món mặc định thì món đầu còn lại thành mặc định; tối thiểu 2 món", async () => {
    const combo: Combo = {
      id: "k1",
      categoryId: "cat",
      name: "Combo Sáng",
      description: null,
      imageUrl: null,
      price: 39000,
      isActive: true,
      displayOrder: 0,
      branchIds: [],
      components: [
        { type: "FIXED", name: "Bánh mì thịt", quantity: 1, fixedSizeCode: null, choices: [{ menuItemId: "a", surcharge: 0, isDefault: true }] },
        {
          type: "CHOICE",
          name: "Đồ uống",
          quantity: 1,
          fixedSizeCode: null,
          choices: [
            { menuItemId: "b", surcharge: 0, isDefault: true },
            { menuItemId: "c", surcharge: 5000, isDefault: false },
          ],
        },
      ],
    };
    render(
      <AntApp>
        <ComboEditor target={combo} categories={categories} items={items} onClose={() => undefined} onSaved={vi.fn()} />
      </AntApp>,
    );
    // Trà đào đang tắt cấp chuỗi → cảnh báo cạnh thành phần.
    expect(screen.getByTestId("combo-component-off-1").textContent).toMatch(/Trà đào/);
    // Nhóm đang có đúng 2 món: không gỡ được.
    expect((screen.getByRole("button", { name: "Gỡ món 1 của thành phần 2" }) as HTMLButtonElement).disabled).toBe(true);
    // Đổi mặc định sang Trà đào.
    fireEvent.click(screen.getByRole("radio", { name: "Món mặc định 2 của thành phần 2" }));
    expect((screen.getByRole("radio", { name: "Món mặc định 2 của thành phần 2" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: "Món mặc định 1 của thành phần 2" }) as HTMLInputElement).checked).toBe(false);
    // Mua lẻ lấy món mặc định mới: 25.000 + (28.000 + 5.000) = 58.000.
    await waitFor(() => expect(screen.getByTestId("combo-compare").textContent).toMatch(/58\.000/));
  });

  it("combo tối đa 6 thành phần: đủ 6 thì khoá nút thêm", () => {
    render(
      <AntApp>
        <ComboEditor target="new" categories={categories} items={items} onClose={() => undefined} onSaved={vi.fn()} />
      </AntApp>,
    );
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: /Thêm món cố định/ }));
    expect((screen.getByRole("button", { name: /Thêm món cố định/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Thêm nhóm biến thể/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("combo-editor").textContent).toContain("6/6");
  }, 40000);

  it("nhóm biến thể tối đa 10 món: đủ 10 thì khoá nút thêm", () => {
    render(
      <AntApp>
        <ComboEditor target="new" categories={categories} items={items} onClose={() => undefined} onSaved={vi.fn()} />
      </AntApp>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Thêm nhóm biến thể/ }));
    const group = screen.getByTestId("combo-component-2");
    for (let i = 0; i < 8; i++) fireEvent.click(within(group).getByRole("button", { name: /Thêm món vào nhóm/ }));
    expect((within(group).getByRole("button", { name: /Thêm món vào nhóm.*10\/10/ }) as HTMLButtonElement).disabled).toBe(true);
  }, 40000);

  it("đóng khi còn thay đổi chưa lưu: hỏi xác nhận, ở lại thì không đóng", async () => {
    const onClose = vi.fn();
    render(
      <AntApp>
        <ComboEditor target="new" categories={categories} items={items} onClose={onClose} onSaved={vi.fn()} />
      </AntApp>,
    );
    fireEvent.change(screen.getByTestId("combo-name"), { target: { value: "Dở dang" } });
    fireEvent.click(document.querySelector(".ant-drawer-close") as HTMLElement);
    await waitFor(() => expect(document.body.textContent).toMatch(/Còn thay đổi chưa lưu/));
    fireEvent.click(screen.getByRole("button", { name: "Ở lại" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("danh sách combo và gán chi nhánh", () => {
  const seed = async () => {
    const created = await combosApi.createCombo("c1", {
      name: "Combo Sáng",
      categoryId: "cat",
      price: 39000,
      components: [
        { type: "FIXED", name: "Bánh mì thịt", quantity: 1, fixedSizeCode: null, choices: [{ menuItemId: "a", surcharge: 0, isDefault: true }] },
        { type: "FIXED", name: "Trà đào", quantity: 1, fixedSizeCode: null, choices: [{ menuItemId: "c", surcharge: 0, isDefault: true }] },
      ],
    });
    await combosApi.setComboBranches("c1", created.id, ["b1"]);
    vi.spyOn(menuApi, "listItems").mockResolvedValue(items);
    vi.spyOn(menuApi, "listCategories").mockResolvedValue(categories);
    return created;
  };

  it("hiện tên, giá, số thành phần, số chi nhánh bán; lọc theo trạng thái", async () => {
    const created = await seed();
    render(<AntApp><CombosPage /></AntApp>);
    await waitFor(() => expect(screen.getByText("Combo Sáng")).toBeTruthy());
    expect(screen.getByTestId("combo-branches").textContent).toBe("1/2 chi nhánh");
    expect(document.body.textContent).toMatch(/39\.000/);
    expect(screen.getByTestId("combo-thumb-default")).toBeTruthy(); // chưa có ảnh: hiện ảnh mặc định
    await combosApi.updateCombo("c1", created.id, { isActive: false });
  });

  it("tắt combo gọi PATCH isActive; xoá phải xác nhận", async () => {
    await seed();
    const update = vi.spyOn(combosApi, "updateCombo");
    const del = vi.spyOn(combosApi, "deleteCombo");
    render(<AntApp><CombosPage /></AntApp>);
    await waitFor(() => expect(screen.getByText("Combo Sáng")).toBeTruthy());
    await act(async () => fireEvent.click(screen.getByRole("switch", { name: "Kinh doanh combo Combo Sáng" })));
    await waitFor(() => expect(update).toHaveBeenCalledWith("c1", expect.any(String), { isActive: false }));
    fireEvent.click(screen.getByRole("button", { name: /Xoá/ }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Ngừng bán combo "Combo Sáng"\?/));
    expect(del).not.toHaveBeenCalled();
  });

  it("gán chi nhánh: cảnh báo chi nhánh thiếu món thành phần (BR-78) và gửi tập chi nhánh", async () => {
    await seed();
    const assign = vi.spyOn(combosApi, "setComboBranches");
    render(<AntApp><CombosPage /></AntApp>);
    await waitFor(() => expect(screen.getByText("Combo Sáng")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Gán chi nhánh/ }));
    const drawer = await screen.findByTestId("combo-branches-drawer");
    // Chi nhánh 1 đã bán: món "Trà đào" chưa gán cho b1 → có cảnh báo.
    await waitFor(() => expect(within(drawer).getByTestId("combo-gap-b1").textContent).toMatch(/Trà đào/));
    fireEvent.click(within(drawer).getByRole("checkbox", { name: /Quận 3/ }));
    expect(within(drawer).getByTestId("combo-gap-b2").textContent).toMatch(/Bánh mì thịt/);
    await act(async () => fireEvent.click(within(drawer).getByTestId("combo-branches-save")));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("c1", expect.any(String), ["b1", "b2"]));
  });
});
