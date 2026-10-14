import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { orderApi } from "../../api";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { useAppStore } from "../../store";
import AttentionOrders from "./AttentionOrders";
import AttentionWatcher from "./AttentionWatcher";
import { attentionStore } from "./attentionStore";

mockControl.latency = [0, 0];
mockControl.failure = null;

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

function Probe() {
  const l = useLocation();
  return <div data-testid="probe">{l.pathname}</div>;
}

let chainId = "";
let branchId = "";
beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  attentionStore.set(null);
  chainId = (await branchMock.listChains())[0].id;
  branchId = (await branchMock.listBranches())[0].id;
  act(() => useAppStore.setState({ chainId, currentBranchId: branchId, branches: [] }));
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null }));
});

const mount = () =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={["/manager/orders/needs-attention"]}>
        <Probe />
        <Routes>
          <Route path="/manager/orders/needs-attention" element={<AttentionOrders />} />
          <Route path="/manager/orders/:orderId" element={<div data-testid="detail">chi tiết</div>} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );

describe("trang Đơn cần xử lý (QĐ 99)", () => {
  it("liệt kê đơn REQUIRES_ATTENTION cũ nhất trước, có chênh lệch thiếu/dư, nút Xem → chi tiết", async () => {
    mount();
    await waitFor(() => expect(document.querySelectorAll(".ant-table-tbody tr.ant-table-row").length).toBeGreaterThanOrEqual(3));
    const rows = [...document.querySelectorAll(".ant-table-tbody tr.ant-table-row")] as HTMLElement[];
    // Cũ nhất trước: dòng đầu là đơn có placedAt nhỏ nhất trong dữ liệu mock.
    const all = (await orderApi.listOrders({ chainId, branchId }, { status: "REQUIRES_ATTENTION", page: 1, limit: 100 })).items;
    const oldest = [...all].sort((a, b) => (a.placedAt ?? "").localeCompare(b.placedAt ?? ""))[0];
    expect(rows[0].getAttribute("data-row-key")).toBe(oldest.id);
    expect(rows.length).toBe(all.length);
    const diffs = rows.map((r) => r.querySelector('[data-testid="attention-diff"]')?.textContent ?? "");
    expect(diffs.some((d) => /^Thiếu /.test(d))).toBe(true);
    expect(diffs.some((d) => /^Dư /.test(d))).toBe(true);
    // số đếm đồng bộ với tổng của danh sách
    await waitFor(() => expect(attentionStore.get()).toBeGreaterThanOrEqual(3));
    fireEvent.click(rows[0].querySelector('[data-testid="attention-open"]')!);
    await waitFor(() => expect(screen.getByTestId("detail")).toBeTruthy());
    expect(screen.getByTestId("probe").textContent).toMatch(/^\/manager\/orders\/.+/);
  });

  it("rỗng: 'Không có đơn nào cần xử lý.'", async () => {
    vi.spyOn(orderApi, "listOrders").mockResolvedValue({ items: [], total: 0, page: 1, limit: 100 });
    mount();
    await waitFor(() => expect(screen.getByTestId("attention-empty").textContent).toBe("Không có đơn nào cần xử lý."));
    expect(attentionStore.get()).toBe(0);
  });

  it("lỗi 500: khối lỗi tiếng Việt kèm Thử lại, không tiếng Anh thô", async () => {
    const { ApiError } = await import("../../api/http/errors");
    vi.spyOn(orderApi, "listOrders").mockRejectedValueOnce(new ApiError(500, "Internal server error"));
    mount();
    await waitFor(() => expect(screen.getByTestId("attention-error")).toBeTruthy());
    expect(screen.getByTestId("attention-error").textContent).not.toMatch(/Internal server error/);
    expect(screen.getByTestId("attention-error").textContent).toMatch(/Máy chủ đang gặp sự cố/);
    fireEvent.click(screen.getByTestId("attention-retry"));
    await waitFor(() => expect(document.querySelectorAll(".ant-table-tbody tr.ant-table-row").length).toBeGreaterThan(0));
  });
});

describe("AttentionWatcher: số đếm menu và tải định kỳ (QĐ 100–101)", () => {
  it("nạp số đếm bằng GET lọc REQUIRES_ATTENTION (limit 1, lấy total)", async () => {
    const spy = vi.spyOn(orderApi, "listOrders");
    render(
      <AntApp>
        <MemoryRouter>
          <AttentionWatcher />
        </MemoryRouter>
      </AntApp>,
    );
    await waitFor(() => expect(attentionStore.get()).toBeGreaterThanOrEqual(3));
    expect(spy.mock.calls[0][1]).toMatchObject({ status: "REQUIRES_ATTENTION", page: 1, limit: 1 });
  });

  it("60 giây tải lại khi tab hiển thị; tab ẩn thì không; hiện lại thì tải ngay; rời màn thì dọn timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.spyOn(orderApi, "listOrders");
    const view = render(
      <AntApp>
        <MemoryRouter>
          <AttentionWatcher />
        </MemoryRouter>
      </AntApp>,
    );
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    const base = spy.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(spy.mock.calls.length).toBe(base + 1);

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    expect(spy.mock.calls.length).toBe(base + 1);

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(spy.mock.calls.length).toBe(base + 2));

    view.unmount();
    const after = spy.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300_000);
    });
    expect(spy.mock.calls.length).toBe(after);
    vi.useRealTimers();
  });
});
