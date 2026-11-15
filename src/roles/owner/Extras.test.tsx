/** OW-15: thư viện topping (tắt có xác nhận, trùng tên, lỗi tải) và trình sửa topping theo món (giá mặc định, tổng phần, nhãn Đang tắt). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { extrasApi } from "../../api";
import { resetExtrasMock } from "../../api/modules/extras/mock";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { useAppStore } from "../../store";
import type { ItemExtraLink, MenuExtra } from "../../types";
import ExtrasLibrary from "./ExtrasLibrary";
import ItemExtrasEditor, { itemExtrasProblem, type ItemExtrasValue } from "./ItemExtrasEditor";
import { useState } from "react";

mockControl.latency = [0, 0];
mockControl.failure = null;
vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

beforeEach(() => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetExtrasMock();
  act(() => useAppStore.setState({ chainId: "c1" }));
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null }));
});

const mountLibrary = () => render(<AntApp><ExtrasLibrary /></AntApp>);

describe("thư viện topping", () => {
  it("trống: có câu hướng dẫn thêm topping", async () => {
    mountLibrary();
    await waitFor(() => expect(document.body.textContent).toMatch(/Chưa có topping nào/));
  });

  it("lỗi tải: hiện thông báo và nút Thử lại", async () => {
    vi.spyOn(extrasApi, "listExtras").mockRejectedValueOnce(new Error("Không có mạng"));
    mountLibrary();
    await waitFor(() => expect(document.body.textContent).toMatch(/Không tải được thư viện topping/));
    expect(screen.getByText("Thử lại")).toBeTruthy();
  });

  it("thêm topping qua hộp thoại: giá hiện dạng 5.000; trùng tên bị chặn ngay ở form", async () => {
    await extrasApi.createExtra("c1", { name: "Pudding", price: 6000 });
    mountLibrary();
    await waitFor(() => expect(screen.getByText("Pudding")).toBeTruthy());
    fireEvent.click(screen.getByTestId("extra-add"));
    const name = await screen.findByTestId("extra-name");
    fireEvent.change(name, { target: { value: "pudding" } });
    expect(document.body.textContent).toMatch(/Đã có topping trùng tên/);
    expect((within(screen.getByRole("dialog")).getByRole("button", { name: "Thêm topping" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(name, { target: { value: "Trân châu" } });
    fireEvent.change(screen.getByTestId("extra-price"), { target: { value: "5000" } });
    await act(async () => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Thêm topping" })));
    await waitFor(() => expect(screen.getByText("Trân châu")).toBeTruthy());
    expect((await extrasApi.listExtras("c1")).find((x) => x.name === "Trân châu")?.price).toBe(5000);
  });

  it("tắt topping phải xác nhận; huỷ xác nhận thì không gọi API", async () => {
    await extrasApi.createExtra("c1", { name: "Trân châu", price: 5000 });
    const disable = vi.spyOn(extrasApi, "disableExtra");
    mountLibrary();
    await waitFor(() => expect(screen.getByText("Trân châu")).toBeTruthy());
    fireEvent.click(screen.getByRole("switch", { name: "Kinh doanh topping Trân châu" }));
    await waitFor(() => expect(document.body.textContent).toMatch(/Tắt topping "Trân châu"\?/));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Huỷ" }));
    await act(async () => undefined);
    expect(disable).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("switch", { name: "Kinh doanh topping Trân châu" }));
    await waitFor(() => expect(within(screen.getAllByRole("dialog").at(-1)!).getByRole("button", { name: "Tắt topping" })).toBeTruthy());
    await act(async () => fireEvent.click(within(screen.getAllByRole("dialog").at(-1)!).getByRole("button", { name: "Tắt topping" })));
    await waitFor(() => expect(disable).toHaveBeenCalledTimes(1));
  });
});

const lib: MenuExtra[] = [
  { id: "a", name: "Trân châu", price: 5000, isActive: true },
  { id: "b", name: "Pudding", price: 6000, isActive: false },
];

function Harness({ initial, spy, serverError }: { initial: ItemExtrasValue; spy?: (v: ItemExtrasValue) => void; serverError?: string | null }) {
  const [value, setValue] = useState(initial);
  return (
    <AntApp>
      <ItemExtrasEditor
        library={lib}
        value={value}
        onChange={(v) => {
          setValue(v);
          spy?.(v);
        }}
        serverError={serverError}
      />
    </AntApp>
  );
}

const link = (over: Partial<ItemExtraLink> = {}): ItemExtraLink => ({ extraId: "a", name: "Trân châu", libraryActive: true, price: 7000, maxQuantity: 2, ...over });

describe("topping theo món", () => {
  it("quy tắc: tổng phần 0–100, số phần mỗi ly 1–5, giá số nguyên ≥ 0", () => {
    expect(itemExtrasProblem({ maxExtras: 5, links: [link()] })).toBeNull();
    expect(itemExtrasProblem({ maxExtras: null, links: [] })).toMatch(/từ 1 trở lên/);
    expect(itemExtrasProblem({ maxExtras: 0, links: [] })).toMatch(/từ 1 trở lên/);
    expect(itemExtrasProblem({ maxExtras: 2.5, links: [] })).toMatch(/từ 1 trở lên/);
    // Tổng số phần không có trần trong đặc tả (BR-80): 100 và 250 đều hợp lệ ở web.
    expect(itemExtrasProblem({ maxExtras: 100, links: [link()] })).toBeNull();
    expect(itemExtrasProblem({ maxExtras: 250, links: [link()] })).toBeNull();
    // Số phần mỗi lần gắn: 0 và 6 bị chặn, 1 và 5 hợp lệ.
    expect(itemExtrasProblem({ maxExtras: 5, links: [link({ maxQuantity: 0 })] })).toMatch(/từ 1 đến 5/);
    expect(itemExtrasProblem({ maxExtras: 5, links: [link({ maxQuantity: 1 })] })).toBeNull();
    expect(itemExtrasProblem({ maxExtras: 5, links: [link({ maxQuantity: 5 })] })).toBeNull();
    expect(itemExtrasProblem({ maxExtras: 5, links: [link({ maxQuantity: 6 })] })).toMatch(/từ 1 đến 5/);
    expect(itemExtrasProblem({ maxExtras: 5, links: [link({ price: -1 })] })).toMatch(/số nguyên đồng/);
  });

  it("thêm từ thư viện: giá mặc định lấy giá thư viện, 1 phần/ly; topping đang tắt có nhãn Đang tắt", async () => {
    const spy = vi.fn();
    render(<Harness initial={{ maxExtras: 5, links: [] }} spy={spy} />);
    expect(document.body.textContent).toMatch(/chưa gắn topping nào/);
    fireEvent.mouseDown(within(screen.getByTestId("item-extra-add")).getByRole("combobox"));
    fireEvent.click(await screen.findByText("Pudding (đang tắt)"));
    const last = spy.mock.calls.at(-1)![0] as ItemExtrasValue;
    expect(last.links).toEqual([{ extraId: "b", name: "Pudding", libraryActive: false, price: 6000, maxQuantity: 1 }]);
    expect(screen.getByTestId("item-extra-b").textContent).toMatch(/Đang tắt/);
  });

  it("gỡ topping và đổi thứ tự", async () => {
    const spy = vi.fn();
    render(<Harness initial={{ maxExtras: 5, links: [link(), link({ extraId: "b", name: "Pudding" })] }} spy={spy} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Xuống" })[0]);
    expect((spy.mock.calls.at(-1)![0] as ItemExtrasValue).links.map((l) => l.extraId)).toEqual(["b", "a"]);
    fireEvent.click(screen.getByRole("button", { name: "Gỡ topping Trân châu" }));
    expect((spy.mock.calls.at(-1)![0] as ItemExtrasValue).links.map((l) => l.extraId)).toEqual(["b"]);
  });

  it("lỗi 400 của BE (tổng vượt ngưỡng BE) hiện ngay dưới ô tổng, dữ liệu đang nhập giữ nguyên", () => {
    render(<Harness initial={{ maxExtras: 150, links: [link()] }} serverError="Tổng số phần topping tối đa không được lớn hơn 100." />);
    expect(screen.getByTestId("item-extras-server-error").textContent).toMatch(/không được lớn hơn 100/);
    expect((screen.getByTestId("item-extras-max") as HTMLInputElement).value).toBe("150");
    expect(screen.getByTestId("item-extra-a")).toBeTruthy();
  });

  it("tổng phần dưới 1: hiện lỗi; từ 1 trở lên (kể cả trên 100) không lỗi vì đặc tả không đặt trần", () => {
    const { unmount } = render(<Harness initial={{ maxExtras: 0, links: [] }} />);
    expect(screen.getByTestId("item-extras-problem").textContent).toMatch(/từ 1 trở lên/);
    unmount();
    render(<Harness initial={{ maxExtras: 101, links: [] }} />);
    expect(screen.queryByTestId("item-extras-problem")).toBeNull();
  });
});
