/**
 * Gán chi nhánh nhanh: ô "Tất cả chi nhánh" ở mọi danh sách gán, và "Gán toàn bộ menu" cho một chi nhánh (lúc tạo hoặc sau đó).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter } from "react-router-dom";
import { useState } from "react";
import BranchChecklist from "./BranchChecklist";
import { menuApi } from "../api";
import { request } from "../api/http/client";
import { useAppStore } from "../store";
import Branches from "../roles/owner/Branches";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("../api/http/client", async (original) => ({ ...(await original<typeof import("../api/http/client")>()), request: vi.fn() }));

const branches = [
  { id: "b1", name: "Quận 1", address: "1 A" },
  { id: "b2", name: "Quận 3", address: "3 B" },
  { id: "b3", name: "Thủ Đức", address: "9 C" },
];

function Harness({ initial, onChange }: { initial: string[]; onChange: (ids: string[]) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <BranchChecklist
      branches={branches}
      value={value}
      onChange={(ids) => {
        setValue(ids);
        onChange(ids);
      }}
    />
  );
}
// antd đặt data-testid lên chính ô input của Checkbox; chữ nằm ở thẻ label bao ngoài.
const box = (testId: string) => screen.getByTestId(testId) as HTMLInputElement;
const labelText = (testId: string) => box(testId).closest("label")?.textContent ?? "";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(request).mockReset();
});

describe("BranchChecklist — Tất cả chi nhánh", () => {
  it("chọn và bỏ chọn cả chuỗi một lần, đếm số đã chọn", () => {
    const changes: string[][] = [];
    render(<Harness initial={["b2"]} onChange={(ids) => changes.push(ids)} />);
    expect(labelText("branch-checklist-all")).toMatch(/1\/3/);
    fireEvent.click(box("branch-checklist-all"));
    expect([...changes[0]].sort()).toEqual(["b1", "b2", "b3"]);
    expect(labelText("branch-checklist-all")).toMatch(/3\/3/);
    fireEvent.click(box("branch-checklist-all"));
    expect(changes[1]).toEqual([]);
    fireEvent.click(box("branch-checklist-b3"));
    expect(changes[2]).toEqual(["b3"]);
  });

  it("chuỗi chỉ có một chi nhánh thì không cần ô tất cả", () => {
    render(<BranchChecklist branches={branches.slice(0, 1)} value={[]} onChange={() => undefined} />);
    expect(screen.queryByTestId("branch-checklist-all")).toBeNull();
  });
});

describe("Gán toàn bộ menu cho một chi nhánh", () => {
  beforeEach(() => {
    act(() =>
      useAppStore.setState({
        chainId: "c1",
        scopeStatus: "ready",
        branches: branches.map((b) => ({ ...b, status: "open", phone: "" })) as never,
        apiBranches: branches.map((b) => ({ id: b.id, code: b.id.toUpperCase() })) as never,
        loadMenu: async () => undefined,
      }),
    );
  });
  afterEach(() => act(() => useAppStore.setState({ chainId: null, branches: [], apiBranches: [] })));

  it("nút trên thẻ chi nhánh: xác nhận rồi gọi API và báo số món/combo thêm", async () => {
    const assign = vi.spyOn(menuApi, "assignWholeMenu").mockResolvedValue({ branchId: "b3", items: 24, combos: 3, addedItems: 24, addedCombos: 3 });
    render(<AntApp><MemoryRouter><Branches /></MemoryRouter></AntApp>);
    fireEvent.click(screen.getByTestId("branch-assign-menu-b3"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toMatch(/Gán toàn bộ menu cho Thủ Đức\?/);
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Gán toàn bộ" })));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("c1", "b3"));
    await waitFor(() => expect(document.body.textContent).toMatch(/Đã gán thêm 24 món và 3 combo cho Thủ Đức/));
  });

  it("form tạo chi nhánh mặc định bán toàn bộ menu và gửi cờ cho store", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    act(() => useAppStore.setState({ createBranch: create }));
    render(<AntApp><MemoryRouter><Branches /></MemoryRouter></AntApp>);
    fireEvent.click(screen.getByRole("button", { name: /Thêm chi nhánh/ }));
    const toggle = await screen.findByTestId("branch-assign-whole-menu");
    expect((toggle as HTMLInputElement).checked).toBe(true);
  });

  it("API real: đúng route; tạo chi nhánh chỉ gửi cờ khi được chọn", async () => {
    vi.mocked(request).mockResolvedValue({ branchId: "b3", items: 1, combos: 0, addedItems: 1, addedCombos: 0 });
    const { menuReal } = await import("../api/modules/menu/real");
    await menuReal.assignWholeMenu("c1", "b3");
    expect(vi.mocked(request).mock.calls[0]).toEqual(["/restaurant-chains/c1/menu/branches/b3/assign-all", { method: "POST" }]);
  });
});

describe("Mock — gán toàn bộ menu", () => {
  it("bật mọi món (kể cả món đã tắt ở chi nhánh) và mọi combo, đếm số mới thêm", async () => {
    const { setScenario } = await import("../api/mock/scenario");
    const { resetMockStates } = await import("../api/mock/store");
    const { branchMock } = await import("../api/modules/branch/mock");
    const { menuMock, assignWholeMenuMock } = await import("../api/modules/menu/mock");
    setScenario({ profile: "A", tier: null, expired: false });
    resetMockStates();
    const chainId = (await branchMock.listChains())[0].id;
    const [first] = await branchMock.listBranches(chainId);
    const items = await menuMock.listItems(chainId);
    expect(items.length).toBeGreaterThan(0);
    await menuMock.setItemBranches(chainId, items[0].id, []);
    const result = assignWholeMenuMock(chainId, first.id);
    expect(result.items).toBe(items.length);
    expect(result.addedItems).toBeGreaterThanOrEqual(1);
    const after = await menuMock.listItems(chainId);
    expect(after.every((i) => i.branches.some((b) => b.branchId === first.id && b.isEnabled))).toBe(true);
    expect(assignWholeMenuMock(chainId, first.id).addedItems).toBe(0);
  });
});
