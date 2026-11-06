/** OW-16: bảng giá theo chi nhánh — ô mờ/đậm, sửa ô, áp hàng loạt, về giá chuỗi, cảnh báo 50%/200%, lưu theo lô và cô lập ô lỗi; Store Manager chỉ xem. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { branchPricesApi, combosApi, menuApi } from "../../api";
import { ApiError } from "../../api/http/errors";
import { setScenario } from "../../api/mock/scenario";
import { mockControl } from "../../api/mock/control";
import { useAppStore } from "../../store";
import type { PriceCell, PriceMatrix } from "../../types";
import BranchPriceList from "../branch/BranchPriceList";
import BranchPrices from "./BranchPrices";

mockControl.latency = [0, 0];
mockControl.failure = null;
vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const cell = (type: "ITEM" | "COMBO", productId: string, name: string, branchId: string, chainPrice: number, priceOverride: number | null = null): PriceCell => ({
  type,
  productId,
  branchId,
  name,
  chainPrice,
  priceOverride,
  effectivePrice: priceOverride ?? chainPrice,
});

let matrix: PriceMatrix;
beforeEach(() => {
  setScenario({ profile: "A", tier: null, expired: false });
  matrix = {
    branches: [
      { id: "b1", name: "Quận 1" },
      { id: "b2", name: "Quận 3" },
    ],
    cells: [
      cell("ITEM", "p1", "Trà sữa", "b1", 35000, 40000),
      cell("ITEM", "p1", "Trà sữa", "b2", 35000),
      cell("ITEM", "p2", "Cà phê", "b1", 20000),
      cell("COMBO", "k1", "Combo Sáng", "b1", 39000),
    ],
  };
  vi.spyOn(branchPricesApi, "getMatrix").mockImplementation(async () => structuredClone(matrix));
  vi.spyOn(menuApi, "listItems").mockResolvedValue([]);
  vi.spyOn(menuApi, "listCategories").mockResolvedValue([]);
  vi.spyOn(combosApi, "listCombos").mockResolvedValue([]);
  act(() =>
    useAppStore.setState({
      chainId: "c1",
      currentBranchId: "b1",
      branches: [
        { id: "b1", name: "Quận 1", address: "", status: "open" },
        { id: "b2", name: "Quận 3", address: "", status: "suspended" },
      ] as never,
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null, branches: [] }));
});

const mount = () => {
  const router = createMemoryRouter([{ path: "/", element: <AntApp><BranchPrices /></AntApp> }]);
  return render(<RouterProvider router={router} />);
};
const state = (key: string) => screen.getByTestId(`price-cell-${key}`).getAttribute("data-state");
const edit = async (productKey: string, name: string, value: string) => {
  fireEvent.click(screen.getByTestId(`price-cell-${productKey}`).querySelector("button")!);
  const input = await screen.findByLabelText(`Giá ${name} tại chi nhánh`);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.blur(input);
};

describe("bảng giá theo chi nhánh", () => {
  it("ô chưa đặt giá riêng hiện mờ giá chuỗi, ô có giá riêng đậm; chưa gán hiện —; chi nhánh tạm ngưng có nhãn", async () => {
    mount();
    await waitFor(() => expect(state("ITEM:p1:b1")).toBe("custom"));
    expect(state("ITEM:p1:b2")).toBe("chain");
    expect(screen.getByTestId("price-cell-ITEM:p1:b1").textContent).toContain("40.000");
    expect(screen.getByTestId("price-cell-ITEM:p1:b2").textContent).toContain("35.000");
    expect(screen.queryByTestId("price-cell-ITEM:p2:b2")).toBeNull();
    expect(document.body.textContent).toContain("Tạm ngưng");
    expect(document.body.textContent).toContain("Combo Sáng");
  });

  it("sửa nhanh một ô: đánh dấu chưa lưu; giá lệch quá xa có cảnh báo; lưu gửi đúng một ô", async () => {
    const save = vi.spyOn(branchPricesApi, "savePrices").mockResolvedValue([]);
    mount();
    await waitFor(() => expect(state("ITEM:p2:b1")).toBe("chain"));
    await edit("ITEM:p2:b1", "Cà phê", "5000");
    await waitFor(() => expect(state("ITEM:p2:b1")).toBe("edited"));
    expect(within(screen.getByTestId("price-cell-ITEM:p2:b1")).getByLabelText(/Thấp hơn giá chuỗi quá 50%/)).toBeTruthy();
    expect(screen.getByTestId("price-savebar").textContent).toContain("1 ô chưa lưu");
    await act(async () => fireEvent.click(screen.getByTestId("price-save")));
    expect(save).toHaveBeenCalledWith("c1", [{ type: "ITEM", productId: "p2", branchId: "b1", priceOverride: 5000 }]);
  });

  it("giá cao hơn quá 100% giá chuỗi cũng cảnh báo nhưng vẫn lưu được", async () => {
    mount();
    await waitFor(() => expect(state("ITEM:p2:b1")).toBe("chain"));
    await edit("ITEM:p2:b1", "Cà phê", "40001");
    await waitFor(() => expect(within(screen.getByTestId("price-cell-ITEM:p2:b1")).getByLabelText(/Cao hơn giá chuỗi quá 100%/)).toBeTruthy());
    expect((screen.getByTestId("price-save") as HTMLButtonElement).disabled).toBe(false);
  });

  it("về giá chuỗi: gửi priceOverride null; nhập lại đúng giá đã lưu thì không còn là thay đổi", async () => {
    const save = vi.spyOn(branchPricesApi, "savePrices").mockResolvedValue([]);
    mount();
    await waitFor(() => expect(state("ITEM:p1:b1")).toBe("custom"));
    fireEvent.click(screen.getByLabelText("Về giá chuỗi Trà sữa"));
    await waitFor(() => expect(state("ITEM:p1:b1")).toBe("edited"));
    await edit("ITEM:p1:b1", "Trà sữa", "40000");
    await waitFor(() => expect(state("ITEM:p1:b1")).toBe("custom"));
    expect(screen.queryByTestId("price-savebar")).toBeNull();
    fireEvent.click(screen.getByLabelText("Về giá chuỗi Trà sữa"));
    await act(async () => fireEvent.click(await screen.findByTestId("price-save")));
    expect(save).toHaveBeenCalledWith("c1", [{ type: "ITEM", productId: "p1", branchId: "b1", priceOverride: null }]);
  });

  it("chọn nhiều dòng + nhiều chi nhánh rồi áp một giá: chỉ các ô đã gán được áp", async () => {
    mount();
    await waitFor(() => expect(state("ITEM:p2:b1")).toBe("chain"));
    const rows = screen.getAllByRole("row");
    for (const name of ["Trà sữa", "Cà phê"]) {
      const row = rows.find((r) => r.textContent?.includes(name) && r.querySelector("input[type=checkbox]"))!;
      fireEvent.click(row.querySelector("input[type=checkbox]")!);
    }
    fireEvent.mouseDown(within(document.body).getAllByRole("combobox")[0]);
    for (const branch of ["Quận 1", "Quận 3"]) {
      const matches = await screen.findAllByText(branch, { selector: ".ant-select-item-option-content" });
      fireEvent.click(matches[matches.length - 1]);
    }
    fireEvent.change(screen.getByLabelText("Giá áp chung"), { target: { value: "30000" } });
    await act(async () => fireEvent.click(screen.getByTestId("bulk-apply")));
    await waitFor(() => expect(screen.getByTestId("price-savebar").textContent).toContain("3 ô chưa lưu"));
    expect(state("ITEM:p2:b1")).toBe("edited");
    expect(state("ITEM:p1:b2")).toBe("edited");
    expect(screen.queryByTestId("price-cell-ITEM:p2:b2")).toBeNull();
  });

  it("lưu: lô lỗi được thử từng ô; ô lỗi tô đỏ và giữ giá, ô thành công hết đánh dấu", async () => {
    const save = vi.spyOn(branchPricesApi, "savePrices").mockImplementation(async (_chain, updates) => {
      if (updates.length > 1 || updates[0].productId === "p2") throw new ApiError(404, "Item is not assigned to branch");
      return updates.map((u) => ({ ...u, effectivePrice: u.priceOverride ?? 0, warnings: [] }));
    });
    mount();
    await waitFor(() => expect(state("ITEM:p2:b1")).toBe("chain"));
    await edit("ITEM:p2:b1", "Cà phê", "21000");
    await edit("COMBO:k1:b1", "Combo Sáng", "38000");
    await waitFor(() => expect(screen.getByTestId("price-savebar").textContent).toContain("2 ô chưa lưu"));
    await act(async () => fireEvent.click(screen.getByTestId("price-save")));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3)); // 1 lô (lỗi) + 2 ô
    await waitFor(() => expect(state("ITEM:p2:b1")).toBe("error"));
    expect(screen.getByTestId("price-savebar").textContent).toContain("1 ô chưa lưu");
    expect(screen.getByTestId("price-cell-ITEM:p2:b1").textContent).toContain("21.000");
  });

  it("Bỏ thay đổi xoá mọi ô đã sửa", async () => {
    mount();
    await waitFor(() => expect(state("ITEM:p2:b1")).toBe("chain"));
    await edit("ITEM:p2:b1", "Cà phê", "21000");
    await waitFor(() => expect(screen.getByTestId("price-savebar")).toBeTruthy());
    fireEvent.click(screen.getByText("Bỏ thay đổi"));
    await waitFor(() => expect(screen.queryByTestId("price-savebar")).toBeNull());
    expect(state("ITEM:p2:b1")).toBe("chain");
  });
});

describe("Store Manager xem bảng giá chi nhánh mình", () => {
  it("chỉ đọc: hiện giá chuỗi, giá tại chi nhánh và nhãn Giá riêng; không có ô sửa", async () => {
    const rows = [
      { type: "ITEM" as const, productId: "p1", name: "Trà sữa", chainPrice: 35000, priceOverride: 40000, effectivePrice: 40000 },
      { type: "COMBO" as const, productId: "k1", name: "Combo Sáng", chainPrice: 39000, priceOverride: null, effectivePrice: 39000 },
    ];
    const get = vi.spyOn(branchPricesApi, "getBranchPrices").mockResolvedValue(rows);
    render(<AntApp><BranchPriceList /></AntApp>);
    await waitFor(() => expect(screen.getByTestId("branch-price-p1").textContent).toContain("40.000"));
    expect(get).toHaveBeenCalledWith("b1");
    expect(screen.getByTestId("branch-price-p1").textContent).toContain("Giá riêng");
    expect(screen.getByTestId("branch-price-k1").textContent).not.toContain("Giá riêng");
    expect(screen.queryByRole("textbox", { name: /Giá/ })).toBeNull();
    expect(screen.queryByTestId("price-save")).toBeNull();
  });
});
