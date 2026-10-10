import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { ApiError } from "../../api/http/errors";
import { orderApi } from "../../api";
import { useAppStore } from "../../store";
import OrderSearch from "./OrderSearch";

mockControl.latency = [0, 0];
mockControl.failure = null;

// jsdom không có matchMedia/ResizeObserver mà bảng, ô chọn và bộ chọn ngày của antd cần.
vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

function Probe() {
  const location = useLocation();
  return <div data-testid="probe">{location.pathname + location.search}</div>;
}

const mount = (url = "/manager/orders") =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={[url]}>
        <Probe />
        <Routes>
          <Route path="/manager/orders" element={<OrderSearch />} />
          <Route path="/manager/orders/:orderId" element={<div data-testid="detail">chi tiết</div>} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );
const probe = () => screen.getByTestId("probe").textContent;
const rows = () => document.querySelectorAll(".ant-table-tbody > tr.ant-table-row");
const totalText = () => screen.getByTestId("order-total").textContent ?? "";

beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  const chainId = (await branchMock.listChains())[0].id;
  const branches = await branchMock.listBranches();
  act(() => useAppStore.setState({ chainId, currentBranchId: branches[0].id, branches: [] }));
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null }));
});

describe("màn Tra cứu đơn (BM-04)", () => {
  it("mặc định: tải 7 ngày, 20 dòng, có nhãn trạng thái tiếng Việt, URL sạch", async () => {
    mount();
    await waitFor(() => expect(rows().length).toBe(20));
    expect(probe()).toBe("/manager/orders");
    expect(totalText()).toMatch(/đơn$/);
    const text = document.querySelector(".ant-table-tbody")!.textContent ?? "";
    expect(text).toMatch(/Chờ thanh toán|Đã thanh toán|Hoàn tất|Đang pha|Sẵn sàng|Đã huỷ/);
    expect(text).not.toMatch(/CONFIRMED|SUBMITTED|DELIVERED|UNPAID/);
  });

  it("URL hỏng bị bỏ qua, màn không treo", async () => {
    mount("/manager/orders?from=abc&status=FOO&page=-2&limit=7&callNumber=xx");
    await waitFor(() => expect(rows().length).toBe(20));
  });

  it("lọc theo URL: số gọi khớp đúng một đơn", async () => {
    mount("/manager/orders?callNumber=900");
    await waitFor(() => expect(rows().length).toBe(1));
    expect((screen.getByTestId("order-call") as HTMLInputElement).value).toBe("900");
    expect(totalText()).toBe("1 đơn");
  });

  it("ô Số gọi chỉ nhận số; Tìm đưa bộ lọc lên URL và về trang 1", async () => {
    mount("/manager/orders?page=2");
    await waitFor(() => expect(rows().length).toBeGreaterThan(0));
    expect(probe()).toBe("/manager/orders?page=2");
    const call = screen.getByTestId("order-call") as HTMLInputElement;
    fireEvent.change(call, { target: { value: "9a0b0" } });
    expect(call.value).toBe("900");
    fireEvent.click(screen.getByTestId("order-search"));
    await waitFor(() => expect(probe()).toBe("/manager/orders?callNumber=900"));
    await waitFor(() => expect(rows().length).toBe(1));
  });

  it("gõ chưa bấm Tìm thì URL chưa đổi; mã đơn được cắt khoảng trắng", async () => {
    mount();
    await waitFor(() => expect(rows().length).toBe(20));
    fireEvent.change(screen.getByTestId("order-code"), { target: { value: "  CTR-X  " } });
    expect(probe()).toBe("/manager/orders");
    fireEvent.click(screen.getByTestId("order-search"));
    await waitFor(() => expect(probe()).toBe("/manager/orders?orderCode=CTR-X"));
  });

  it("phân trang: chuyển sang trang 2 ghi page=2 lên URL; Xoá bộ lọc về mặc định", async () => {
    mount();
    await waitFor(() => expect(rows().length).toBe(20));
    fireEvent.click(document.querySelector(".ant-pagination-item-2")!);
    await waitFor(() => expect(probe()).toBe("/manager/orders?page=2"));
    fireEvent.change(screen.getByTestId("order-call"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("order-search"));
    await waitFor(() => expect(probe()).toBe("/manager/orders?callNumber=1"));
    fireEvent.click(screen.getByTestId("order-clear"));
    await waitFor(() => expect(probe()).toBe("/manager/orders"));
    await waitFor(() => expect((screen.getByTestId("order-call") as HTMLInputElement).value).toBe(""));
  });

  it("không có đơn khớp: hiện câu trạng thái rỗng (khoảng ngày / bộ lọc)", async () => {
    mount("/manager/orders?from=2000-01-01&to=2000-01-02");
    await waitFor(() => expect(document.body.textContent).toContain("Không có đơn trong khoảng thời gian này"));
    mount("/manager/orders?from=2000-01-01&to=2000-01-02&callNumber=5");
    await waitFor(() => expect(document.body.textContent).toContain("Không có đơn nào khớp bộ lọc"));
  });

  it("bấm dòng chuyển sang /manager/orders/:id", async () => {
    mount("/manager/orders?callNumber=900");
    await waitFor(() => expect(rows().length).toBe(1));
    fireEvent.click(rows()[0]);
    await waitFor(() => expect(screen.getByTestId("detail")).toBeTruthy());
    expect(probe()).toMatch(/^\/manager\/orders\/.+scn-options$/);
  });

  it("lỗi đọc: khối lỗi trong trang bằng tiếng Việt + Thử lại tải lại được", async () => {
    const spy = vi.spyOn(orderApi, "listOrders").mockRejectedValueOnce(new ApiError(500, "Internal server error"));
    mount();
    await waitFor(() => expect(screen.getByTestId("order-error")).toBeTruthy());
    expect(screen.getByTestId("order-error").textContent).not.toMatch(/Internal server error/i);
    fireEvent.click(screen.getByTestId("order-retry"));
    await waitFor(() => expect(rows().length).toBe(20));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("lỗi 400 do tham số: câu tiếng Việt theo ô, màn không treo", async () => {
    vi.spyOn(orderApi, "listOrders").mockRejectedValueOnce(new ApiError(400, "Bad Request", ["limit must not be greater than 100"]));
    mount();
    await waitFor(() => expect(screen.getByTestId("order-error")).toBeTruthy());
    expect(screen.getByTestId("order-error").textContent).toMatch(/Số dòng mỗi trang/);
    expect(screen.getByTestId("order-filters")).toBeTruthy();
  });
});
