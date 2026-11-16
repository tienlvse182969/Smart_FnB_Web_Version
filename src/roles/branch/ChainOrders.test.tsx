import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { ApiError } from "../../api/http/errors";
import { orderApi } from "../../api";
import { mapOrderDetail, mapOrderPage } from "../../api/modules/order/mapper";
import { buildOrderQueryString } from "../../api/modules/order/query";
import { useAppStore } from "../../store";
import { ownerRoutes } from "../../router/routeConfig";
import OrderDetail from "./OrderDetail";
import OrderSearch from "./OrderSearch";
import { filtersToSearch, parseFilters, toOrderQuery, defaultFilters } from "./orderFilters";

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const BRANCH_1 = { id: "11111111-1111-4111-8111-111111111111", code: "B1", name: "CN Một" };
const BRANCH_2 = { id: "22222222-2222-4222-8222-222222222222", code: "B2", name: "CN Hai" };

const rawOrder = (over: Record<string, unknown> = {}) => ({
  id: "o1",
  orderCode: "CTR-1",
  callNumber: 7,
  type: "COUNTER_PICKUP",
  status: "COMPLETED",
  paymentStatus: "PAID",
  totalAmount: "45000",
  placedAt: "2026-11-10T03:00:00.000Z",
  paidAt: "2026-11-10T03:01:00.000Z",
  branch: BRANCH_1,
  createdByCashier: { firstName: "Lan", lastName: "Trần", employeeCode: "E1" },
  payments: [],
  refunds: [],
  ...over,
});

function Probe() {
  const location = useLocation();
  return <div data-testid="probe">{location.pathname + location.search}</div>;
}

const mountList = (url = "/brand-manager/orders") =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={[url]}>
        <Probe />
        <Routes>
          <Route path="/brand-manager/orders" element={<OrderSearch scope="chain" />} />
          <Route path="/brand-manager/orders/:orderId" element={<div data-testid="detail-page">chi tiết</div>} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );

const mountDetail = (id = "o1") =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={[`/brand-manager/orders/${id}`]}>
        <Probe />
        <Routes>
          <Route path="/brand-manager/orders" element={<div data-testid="list-page">danh sách</div>} />
          <Route path="/brand-manager/orders/:orderId" element={<OrderDetail scope="chain" />} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );

const rows = () => document.querySelectorAll(".ant-table-tbody > tr.ant-table-row");

beforeEach(() => {
  act(() =>
    useAppStore.setState({
      chainId: "c1",
      currentBranchId: null,
      apiBranches: [{ ...BRANCH_1, chainId: "c1" }, { ...BRANCH_2, chainId: "c1" }] as never,
    }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null, apiBranches: [] as never }));
});

describe("Brand Manager: danh sách Đơn hàng (GAP-310)", () => {
  it("gọi API của chuỗi (không cần chi nhánh gán), có cột Chi nhánh và tổng số đơn", async () => {
    const page = mapOrderPage({ items: [rawOrder(), rawOrder({ id: "o2", orderCode: "CTR-2", callNumber: 8, branch: BRANCH_2 })], total: 2, page: 1, limit: 20 }, { page: 1, limit: 20 });
    const list = vi.spyOn(orderApi, "listChainOrders").mockResolvedValue(page);
    const branchList = vi.spyOn(orderApi, "listOrders");
    mountList();
    await waitFor(() => expect(rows().length).toBe(2));
    expect(list).toHaveBeenCalledWith("c1", expect.objectContaining({ page: 1, limit: 20 }));
    expect(branchList).not.toHaveBeenCalled();
    expect(screen.getByText("Chi nhánh", { selector: "th" })).toBeTruthy();
    expect([...document.querySelectorAll('[data-testid="order-branch"]')].map((n) => n.textContent)).toEqual(["CN Một", "CN Hai"]);
    expect(screen.getByTestId("order-total").textContent).toContain("2 đơn");
    expect(screen.getByText("Đơn hàng")).toBeTruthy();
  });

  it("bộ chọn chi nhánh: Tất cả + từng chi nhánh, đổi thì gọi lại với branchId và ghi lên URL", async () => {
    const list = vi.spyOn(orderApi, "listChainOrders").mockResolvedValue(mapOrderPage({ items: [rawOrder()], total: 1, page: 1, limit: 20 }, { page: 1, limit: 20 }));
    mountList();
    await waitFor(() => expect(rows().length).toBe(1));
    expect(list.mock.calls[0][1].branchId).toBeUndefined();
    const select = screen.getByTestId("order-branch-filter");
    fireEvent.mouseDown(within(select).getByRole("combobox"));
    expect(await screen.findByText("Tất cả chi nhánh", { selector: ".ant-select-item-option-content" })).toBeTruthy();
    expect(screen.getByText("CN Hai", { selector: ".ant-select-item-option-content" })).toBeTruthy();
    fireEvent.click(screen.getByText("CN Hai", { selector: ".ant-select-item-option-content" }));
    await waitFor(() => expect(list.mock.calls.at(-1)![1].branchId).toBe(BRANCH_2.id));
    expect(screen.getByTestId("probe").textContent).toBe(`/brand-manager/orders?branch=${BRANCH_2.id}`);
  });

  it("đang tải → trạng thái đang tải; rỗng → câu không có đơn", async () => {
    let resolve!: (v: ReturnType<typeof mapOrderPage>) => void;
    vi.spyOn(orderApi, "listChainOrders").mockReturnValue(new Promise((r) => (resolve = r)));
    mountList();
    expect(screen.getByTestId("order-total").textContent).toBe("Đang tải…");
    await act(async () => resolve(mapOrderPage({ items: [], total: 0, page: 1, limit: 20 }, { page: 1, limit: 20 })));
    await waitFor(() => expect(screen.getByText("Không có đơn trong khoảng thời gian này")).toBeTruthy());
  });

  it("lỗi → khối lỗi kèm Thử lại gọi lại API", async () => {
    const list = vi.spyOn(orderApi, "listChainOrders").mockRejectedValueOnce(new ApiError(500, "boom")).mockResolvedValue(mapOrderPage({ items: [rawOrder()], total: 1, page: 1, limit: 20 }, { page: 1, limit: 20 }));
    mountList();
    expect(await screen.findByTestId("order-error")).toBeTruthy();
    fireEvent.click(screen.getByTestId("order-retry"));
    await waitFor(() => expect(rows().length).toBe(1));
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("bấm một dòng mở chi tiết đơn trong /brand-manager/orders/:id", async () => {
    vi.spyOn(orderApi, "listChainOrders").mockResolvedValue(mapOrderPage({ items: [rawOrder()], total: 1, page: 1, limit: 20 }, { page: 1, limit: 20 }));
    mountList();
    await waitFor(() => expect(rows().length).toBe(1));
    fireEvent.click(rows()[0]);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/brand-manager/orders/o1"));
  });
});

describe("Brand Manager: chi tiết đơn (GAP-310)", () => {
  const detail = (over: Record<string, unknown> = {}) => mapOrderDetail({ ...rawOrder(), items: [], ...over });

  it("lấy theo chuỗi, hiện chi nhánh, đang tải rồi nội dung", async () => {
    let resolve!: (v: ReturnType<typeof detail>) => void;
    const get = vi.spyOn(orderApi, "getChainOrder").mockReturnValue(new Promise((r) => (resolve = r)));
    const branchGet = vi.spyOn(orderApi, "getOrder");
    mountDetail();
    expect(document.querySelector(".ant-card-loading")).not.toBeNull();
    await act(async () => resolve(detail()));
    await waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
    expect(get).toHaveBeenCalledWith("c1", "o1");
    expect(branchGet).not.toHaveBeenCalled();
    expect(screen.getByTestId("order-detail-branch").textContent).toBe("CN Một");
  });

  it("chỉ xem: khoản chuyển khoản đang chờ KHÔNG có nút Xác nhận thủ công, không có nút hoàn tiền", async () => {
    vi.spyOn(orderApi, "getChainOrder").mockResolvedValue(
      detail({ status: "CONFIRMED", paymentStatus: "UNPAID", payments: [{ id: "p1", paymentCode: "P1", method: "BANK_TRANSFER", status: "PENDING", amount: "45000", createdAt: "2026-11-10T03:00:00.000Z" }] }),
    );
    mountDetail();
    await waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
    expect(screen.queryByTestId("order-confirm-open")).toBeNull();
    const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent?.trim());
    expect(buttons).toEqual(["Quay lại"]);
    expect(document.body.textContent).not.toMatch(/Hoàn tiền ngay|Xác nhận thủ công/);
  });

  it("khoản hoàn tiền mặt đã xác nhận có nút Xem phiếu hoàn (PDF)", async () => {
    vi.spyOn(orderApi, "getChainOrder").mockResolvedValue(
      detail({ status: "CANCELLED", cancelledAt: "2026-11-10T04:00:00.000Z", refunds: [{ id: "r1", amount: "45000", status: "COMPLETED", method: "CASH", source: "MANAGER_CANCELLATION", reason: "Khách đổi ý", requestedByRole: "CASHIER", completedByRole: "MANAGER", items: [] }] }),
    );
    mountDetail();
    await waitFor(() => expect(screen.getByTestId("order-refunds")).toBeTruthy());
    expect(screen.getByTestId("refund-slip-open").textContent).toBe("Xem phiếu hoàn (PDF)");
  });

  it("404 → Không tìm thấy đơn và nút về Đơn hàng", async () => {
    vi.spyOn(orderApi, "getChainOrder").mockRejectedValue(new ApiError(404, "Order not found in this chain"));
    mountDetail("zzz");
    expect(await screen.findByTestId("order-detail-notfound")).toBeTruthy();
    expect(screen.getByText("Đơn này không thuộc chuỗi của bạn hoặc đã bị xoá.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("order-detail-tolist"));
    await waitFor(() => expect(screen.getByTestId("list-page")).toBeTruthy());
  });

  it("lỗi khác → khối lỗi kèm Thử lại", async () => {
    const get = vi.spyOn(orderApi, "getChainOrder").mockRejectedValueOnce(new ApiError(500, "boom")).mockResolvedValue(detail());
    mountDetail();
    expect(await screen.findByTestId("order-detail-error")).toBeTruthy();
    fireEvent.click(screen.getByTestId("order-detail-retry"));
    await waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe("GAP-310: dữ liệu, tham số và menu", () => {
  it("mapper giữ chi nhánh của đơn; BE cũ không trả thì null", () => {
    expect(mapOrderPage({ items: [rawOrder()], total: 1 }, { page: 1, limit: 20 }).items[0].branch).toEqual(BRANCH_1);
    expect(mapOrderPage({ items: [rawOrder({ branch: undefined })], total: 1 }, { page: 1, limit: 20 }).items[0].branch).toBeNull();
  });

  it("branchId đi vào chuỗi truy vấn và vòng bộ lọc ↔ URL", () => {
    const query = toOrderQuery({ ...defaultFilters("2026-11-10"), branch: BRANCH_2.id });
    expect(query.branchId).toBe(BRANCH_2.id);
    expect(new URLSearchParams(buildOrderQueryString(query)).get("branchId")).toBe(BRANCH_2.id);
    expect(new URLSearchParams(buildOrderQueryString({ page: 1, limit: 20 })).has("branchId")).toBe(false);
    const filters = { ...defaultFilters("2026-11-10"), branch: BRANCH_2.id };
    expect(parseFilters(filtersToSearch(filters, "2026-11-10"), "2026-11-10")).toEqual(filters);
    expect(parseFilters("branch=<script>", "2026-11-10").branch).toBe("");
  });

  it("sidebar Brand Manager có mục Đơn hàng ngay sau Chi nhánh, chi tiết đơn không hiện trên menu", () => {
    const nav = ownerRoutes.filter((r) => r.nav !== false).map((r) => r.path);
    expect(nav.indexOf("orders")).toBe(nav.indexOf("branches") + 1);
    expect(ownerRoutes.find((r) => r.path === "orders")?.label).toBe("Đơn hàng");
    expect(ownerRoutes.find((r) => r.path === "orders/:orderId")?.nav).toBe(false);
  });
});
