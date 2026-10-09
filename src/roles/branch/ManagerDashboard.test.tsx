import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { ApiError } from "../../api/http/errors";
import { managerReportApi } from "../../api";
import { useAppStore } from "../../store";
import type { ManagerReport } from "../../types";
import ManagerDashboard from "./ManagerDashboard";

mockControl.latency = [0, 0];
mockControl.failure = null;
vi.setConfig({ testTimeout: 20000 });

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

function Probe() {
  const location = useLocation();
  return <div data-testid="probe">{location.pathname + location.search}</div>;
}

const mount = (url = "/manager/dashboard") =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={[url]}>
        <Probe />
        <Routes>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/orders/:orderId" element={<div data-testid="detail">chi tiết</div>} />
          <Route path="/manager/orders" element={<div data-testid="list">danh sách</div>} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );
const txt = (id: string) => screen.getByTestId(id).textContent ?? "";

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

const report = (over: Partial<ManagerReport> = {}): ManagerReport => ({
  branchName: "Chi nhánh thử",
  timezone: "Asia/Ho_Chi_Minh",
  range: { from: "2026-10-09", to: "2026-10-15", granularity: "day" },
  summary: { revenue: 1090000, orderCount: 11, averageOrderValue: 99090.91 },
  revenue: [{ bucket: "2026-10-14", revenue: 1090000, orderCount: 11 }],
  payments: [{ method: "CASH", settledAmount: 1090000, receivedAmount: 1155000, paymentCount: 11 }],
  topItems: [{ menuItemId: "m1", name: "Cơm gà nướng", quantity: 9, lineRevenue: 585000 }],
  topToppings: [{ optionId: "o1", name: "Trân châu đen", quantity: 3, additionalRevenue: 15000 }],
  ordersByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, orderCount: hour === 12 ? 11 : 0 })),
  preparation: { averageSeconds: 0.02, completedUnits: 2 },
  cancellations: { total: 1, limit: 10, items: [{ id: "ord-1", orderCode: "CTR-1-AF0042", callNumber: null, totalAmount: 75000, cancelledAt: "2026-10-14T05:56:59.324Z", reason: "Khách đổi ý trước khi trả tiền" }] },
  ...over,
});

describe("màn Báo cáo chi nhánh (BM-03)", () => {
  it("mặc định: 7 ngày, URL sạch, đủ mục (thẻ số, doanh thu, hình thức, giờ, món, topping, đơn huỷ)", async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId("report-kpi-revenue")).toBeTruthy());
    expect(screen.getByTestId("probe").textContent).toBe("/manager/dashboard");
    for (const id of ["report-kpi-orders", "report-kpi-avg", "report-kpi-prep", "report-revenue-bars", "report-payments", "report-hours-bars", "report-top-items", "report-top-toppings", "report-cancellations"]) {
      expect(screen.getByTestId(id), id).toBeTruthy();
    }
    expect(document.querySelectorAll('[data-testid="report-hours-bars"] [data-key]')).toHaveLength(24);
    expect(document.querySelectorAll('[data-testid="report-revenue-bars"] [data-key]')).toHaveLength(7);
    expect(document.body.textContent).not.toMatch(/CASH|BANK_TRANSFER|hoàn tiền|sắp có/i);
  });

  it("URL giữ khoảng và kỳ: F5 (mount lại) cho cùng kết quả; chọn nhanh ghi URL", async () => {
    const first = mount("/manager/dashboard?from=2026-09-16&to=2026-10-15&granularity=week");
    await waitFor(() => expect(screen.getByTestId("report-revenue-bars")).toBeTruthy());
    const keys = [...document.querySelectorAll('[data-testid="report-revenue-bars"] [data-key]')].map((e) => e.getAttribute("data-key"));
    expect(keys[0]).toBe("2026-09-14"); // thứ Hai của tuần chứa 16/09
    first.unmount();
    mount("/manager/dashboard?from=2026-09-16&to=2026-10-15&granularity=week");
    await waitFor(() => expect(screen.getByTestId("report-revenue-bars")).toBeTruthy());
    expect([...document.querySelectorAll('[data-testid="report-revenue-bars"] [data-key]')].map((e) => e.getAttribute("data-key"))).toEqual(keys);
  });

  it("chọn nhanh 'Hôm nay' và '30 ngày' ghi from/to lên URL", async () => {
    mount();
    await waitFor(() => expect(screen.getByTestId("report-kpi-revenue")).toBeTruthy());
    const seg = screen.getByTestId("report-preset");
    fireEvent.click([...seg.querySelectorAll("label")].find((l) => l.textContent === "Hôm nay")!);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/manager/dashboard?from=2026-10-15&to=2026-10-15"));
    fireEvent.click([...seg.querySelectorAll("label")].find((l) => l.textContent === "30 ngày")!);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/manager/dashboard?from=2026-09-16&to=2026-10-15"));
    fireEvent.click([...seg.querySelectorAll("label")].find((l) => l.textContent === "7 ngày")!);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/manager/dashboard"));
  });

  it("URL hỏng bị bỏ qua, không lỗi", async () => {
    mount("/manager/dashboard?from=abc&to=xyz&granularity=year");
    await waitFor(() => expect(screen.getByTestId("report-kpi-revenue")).toBeTruthy());
    expect(screen.queryByTestId("report-error")).toBeNull();
  });

  it("thời gian pha: 0,02 giây → 'Dưới 1 giây'; 125 giây → '2:05'; null → 'Chưa có dữ liệu'; hiện đúng số BE", async () => {
    const spy = vi.spyOn(managerReportApi, "getReport").mockResolvedValue(report());
    mount();
    await waitFor(() => expect(screen.getByTestId("report-kpi-prep")).toBeTruthy());
    expect(txt("report-kpi-prep")).toContain("Dưới 1 giây");
    expect(txt("report-kpi-revenue")).toContain("1.090.000");
    expect(txt("report-kpi-orders")).toContain("11");
    expect(txt("report-kpi-avg")).toContain("99.091"); // định dạng làm tròn đồng, không tính lại
    spy.mockResolvedValue(report({ preparation: { averageSeconds: 125, completedUnits: 4 } }));
    fireEvent.click(screen.getByTestId("report-refresh"));
    await waitFor(() => expect(txt("report-kpi-prep")).toContain("2:05"));
    await waitFor(() => expect(screen.getByTestId("report-refresh").className).not.toContain("loading")); // nút đang tải thì bỏ qua cú bấm
    spy.mockResolvedValue(report({ preparation: { averageSeconds: null, completedUnits: 0 } }));
    fireEvent.click(screen.getByTestId("report-refresh"));
    await waitFor(() => expect(txt("report-kpi-prep")).toContain("Chưa có dữ liệu"));
  });

  it("Làm mới gửi đúng 1 lần GET, giữ khoảng thời gian", async () => {
    const spy = vi.spyOn(managerReportApi, "getReport").mockResolvedValue(report());
    mount("/manager/dashboard?from=2026-10-01&to=2026-10-10");
    await waitFor(() => expect(screen.getByTestId("report-kpi-revenue")).toBeTruthy());
    const before = spy.mock.calls.length;
    fireEvent.click(screen.getByTestId("report-refresh"));
    await waitFor(() => expect(spy.mock.calls.length).toBe(before + 1));
    await new Promise((r) => setTimeout(r, 300));
    expect(spy.mock.calls.length).toBe(before + 1);
    expect(spy.mock.calls.at(-1)![1]).toMatchObject({ from: "2026-10-01", to: "2026-10-10", granularity: "day", limit: 10 });
    expect(screen.getByTestId("probe").textContent).toBe("/manager/dashboard?from=2026-10-01&to=2026-10-10");
  });

  it("đơn huỷ: lý do hiện, bấm mã đơn dẫn tới /manager/orders/:id", async () => {
    vi.spyOn(managerReportApi, "getReport").mockResolvedValue(report());
    mount();
    await waitFor(() => expect(screen.getByTestId("report-cancellations")).toBeTruthy());
    expect(txt("report-cancellations")).toContain("Khách đổi ý trước khi trả tiền");
    expect(txt("report-cancellations")).toContain("75.000");
    const link = screen.getByTestId("report-cancel-link") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/manager/orders/ord-1");
    fireEvent.click(link);
    await waitFor(() => expect(screen.getByTestId("detail")).toBeTruthy());
    expect(screen.getByTestId("probe").textContent).toBe("/manager/orders/ord-1");
  });

  it("còn nhiều đơn huỷ hơn danh sách: có liên kết 'Xem tất cả' sang Tra cứu đơn đã lọc", async () => {
    vi.spyOn(managerReportApi, "getReport").mockResolvedValue(report({ cancellations: { total: 25, limit: 10, items: report().cancellations.items } }));
    mount("/manager/dashboard?from=2026-10-01&to=2026-10-10");
    await waitFor(() => expect(screen.getByTestId("report-cancel-all")).toBeTruthy());
    expect((screen.getByTestId("report-cancel-all") as HTMLAnchorElement).getAttribute("href")).toBe("/manager/orders?status=CANCELLED&from=2026-10-01&to=2026-10-10");
    expect(txt("report-cancellations")).toContain("25 đơn huỷ");
  });

  it("rỗng: 'Chưa có đơn trong khoảng thời gian này', thẻ số vẫn hiện 0", async () => {
    mount("/manager/dashboard?from=2000-01-01&to=2000-01-07");
    await waitFor(() => expect(screen.getByTestId("report-empty")).toBeTruthy());
    expect(txt("report-empty")).toBe("Chưa có đơn trong khoảng thời gian này");
    expect(txt("report-kpi-orders")).toContain("0");
    expect(screen.queryByTestId("report-payments")).toBeNull();
  });

  it("lỗi 500: khối lỗi tiếng Việt + Thử lại tải lại được", async () => {
    const spy = vi.spyOn(managerReportApi, "getReport").mockRejectedValueOnce(new ApiError(500, "Internal server error"));
    mount();
    await waitFor(() => expect(screen.getByTestId("report-error")).toBeTruthy());
    expect(txt("report-error")).not.toMatch(/Internal server error/i);
    fireEvent.click(screen.getByTestId("report-retry"));
    await waitFor(() => expect(screen.getByTestId("report-kpi-revenue")).toBeTruthy());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("lỗi 400 do tham số: câu tiếng Việt, không treo", async () => {
    vi.spyOn(managerReportApi, "getReport").mockRejectedValueOnce(new ApiError(400, "Report range must contain 1 to 366 days"));
    mount();
    await waitFor(() => expect(screen.getByTestId("report-error")).toBeTruthy());
    expect(txt("report-error")).toMatch(/Khoảng ngày báo cáo không hợp lệ/);
    expect(screen.getByTestId("report-filters")).toBeTruthy();
  });
});
