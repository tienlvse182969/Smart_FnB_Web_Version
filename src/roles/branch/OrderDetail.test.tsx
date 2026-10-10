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
import OrderDetail from "./OrderDetail";

mockControl.latency = [0, 0];
mockControl.failure = null;

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

function Probe() {
  const location = useLocation();
  return <div data-testid="probe">{location.pathname + location.search}</div>;
}

let branchId = "";
let chainId = "";
const mount = (id: string, from?: string) =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={[{ pathname: `/manager/orders/${id}`, state: from === undefined ? null : { from } }]}>
        <Probe />
        <Routes>
          <Route path="/manager/orders" element={<div data-testid="list">danh sách</div>} />
          <Route path="/manager/orders/:orderId" element={<OrderDetail />} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );
const txt = (id: string) => screen.getByTestId(id).textContent ?? "";
const scn = (suffix: string) => `${branchId}-${suffix}`;

beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  chainId = (await branchMock.listChains())[0].id;
  branchId = (await branchMock.listBranches())[0].id;
  act(() => useAppStore.setState({ chainId, currentBranchId: branchId, branches: [] }));
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null }));
});

describe("trang chi tiết đơn (BM-04, quyết định 73)", () => {
  it("đầu trang: số gọi, mã đơn, thời gian đặt/thanh toán, trạng thái, thu ngân; không có nút hành động", async () => {
    mount(scn("scn-options"));
    await waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
    expect(txt("order-detail-call")).toBe("900");
    expect(txt("order-detail-code")).toMatch(/^CTR-\d+$/);
    expect(txt("order-detail-placed")).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(txt("order-detail-paid-at")).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(txt("order-detail-status")).toBe("Hoàn tất");
    expect(txt("order-detail-payment")).toBe("Đã thanh toán");
    expect(txt("order-detail-cashier")).toBe("Thu ngân mẫu");
    const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent?.trim());
    expect(buttons).toEqual(["Quay lại"]);
    expect(screen.queryByText(/xác nhận thủ công/i)).toBeNull();
    expect(screen.queryByText(/nhật ký|audit/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/Khách đưa|Tiền thối/i);
  });

  it("dòng món: tuỳ chọn và topping kèm giá cộng thêm, giá lúc bán, thành tiền, ghi chú, trạng thái dòng", async () => {
    mount(scn("scn-options"));
    await waitFor(() => expect(screen.getByTestId("order-detail-lines")).toBeTruthy());
    const options = txt("order-line-options");
    expect(options).toContain("Kích cỡ: L");
    expect(options).toContain("+10.000");
    expect(options).toContain("Mức đường: 50% đường");
    expect(options).toContain("Topping: Trân châu đen");
    expect(options).toContain("+5.000");
    const line = txt("order-line");
    expect(line).toContain("Trà đào");
    expect(line).toContain("Giá món 35.000");
    expect(line).toContain("tuỳ chọn 15.000");
    expect(line).toContain("Ghi chú: ít đá");
    const row = document.querySelector('[data-testid="order-detail-lines"] tr.ant-table-row')!.textContent ?? "";
    expect(row).toMatch(/50\.000/); // giá lúc bán đã gồm tuỳ chọn
    expect(row).toMatch(/100\.000/); // thành tiền
    expect(row).toContain("Xong");
    expect(txt("order-detail-total")).toMatch(/100\.000/);
  });

  it("xác nhận thủ công: người xác nhận, lý do, số tiền thực nhận, mã giao dịch", async () => {
    mount(scn("scn-manual"));
    await waitFor(() => expect(screen.getByTestId("order-detail-payments")).toBeTruthy());
    const detail = txt("order-pay-detail");
    expect(detail).toContain("Xác nhận thủ công bởi Quản lý mẫu");
    expect(detail).toContain("Khách chìa màn hình chuyển khoản thành công, webhook không về");
    expect(detail).toContain("Số tiền thực nhận: 80.000");
    expect(detail).toContain("Mã giao dịch: FT26100812345");
    expect(txt("order-detail-payments")).toContain("Chuyển khoản (QR)");
  });

  it("nhiều khoản thanh toán: mỗi khoản một dòng với trạng thái riêng", async () => {
    mount(scn("scn-multi"));
    await waitFor(() => expect(screen.getByTestId("order-detail-payments")).toBeTruthy());
    const rows = [...document.querySelectorAll('[data-testid="order-detail-payments"] tr.ant-table-row')].map((r) => r.textContent ?? "");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("Chuyển khoản (QR)");
    expect(rows[0]).toContain("Chờ chuyển khoản");
    expect(rows[1]).toContain("Tiền mặt");
    expect(rows[1]).toContain("Đã thanh toán");
    expect(document.querySelectorAll('[data-testid="order-detail-lines"] tr.ant-table-row')).toHaveLength(2);
  });

  it("đơn huỷ: người huỷ, thời điểm, lý do", async () => {
    const cancelled = (await orderApi.listOrders({ chainId, branchId }, { page: 1, limit: 100, status: "CANCELLED" })).items[0];
    mount(cancelled.id);
    await waitFor(() => expect(screen.getByTestId("order-detail-cancel")).toBeTruthy());
    expect(txt("order-detail-status")).toBe("Đã huỷ");
    expect(txt("order-detail-cancel-by")).not.toBe("—");
    expect(txt("order-detail-cancel-at")).toMatch(/^\d{2}\/\d{2}\/\d{4}/);
    expect(txt("order-detail-cancel-reason")).not.toBe("—");
  });

  it("Quay lại về đúng bộ lọc trước đó; mở thẳng (không có state) về danh sách trơn", async () => {
    const first = mount(scn("scn-options"), "?status=DELIVERED&page=2");
    await waitFor(() => expect(screen.getByTestId("order-detail-back")).toBeTruthy());
    fireEvent.click(screen.getByTestId("order-detail-back"));
    await waitFor(() => expect(screen.getByTestId("list")).toBeTruthy());
    expect(screen.getByTestId("probe").textContent).toBe("/manager/orders?status=DELIVERED&page=2");
    first.unmount();
    mount(scn("scn-options"));
    await waitFor(() => expect(screen.getByTestId("order-detail-back")).toBeTruthy());
    fireEvent.click(screen.getByTestId("order-detail-back"));
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/manager/orders"));
  });

  it("404: khối 'Không tìm thấy đơn' + nút về Tra cứu đơn giữ bộ lọc", async () => {
    mount("khong-co", "?callNumber=5");
    await waitFor(() => expect(screen.getByTestId("order-detail-notfound")).toBeTruthy());
    expect(screen.getByTestId("order-detail-notfound").textContent).toContain("Không tìm thấy đơn");
    fireEvent.click(screen.getByTestId("order-detail-tolist"));
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe("/manager/orders?callNumber=5"));
  });

  it("id không phải UUID (BE trả 400) cũng là 'Không tìm thấy đơn'", async () => {
    vi.spyOn(orderApi, "getOrder").mockRejectedValueOnce(new ApiError(400, "Validation failed (uuid is expected)"));
    mount("abc");
    await waitFor(() => expect(screen.getByTestId("order-detail-notfound")).toBeTruthy());
  });

  it("lỗi 500: khối lỗi trong trang bằng tiếng Việt + Thử lại tải lại được", async () => {
    const spy = vi.spyOn(orderApi, "getOrder").mockRejectedValueOnce(new ApiError(500, "Internal server error"));
    mount(scn("scn-options"));
    await waitFor(() => expect(screen.getByTestId("order-detail-error")).toBeTruthy());
    expect(txt("order-detail-error")).not.toMatch(/Internal server error/i);
    fireEvent.click(screen.getByTestId("order-detail-retry"));
    await waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("lỗi 403: câu tiếng Việt về quyền, không hiện tiếng Anh", async () => {
    vi.spyOn(orderApi, "getOrder").mockRejectedValueOnce(new ApiError(403, "You do not have permission to access this resource"));
    mount(scn("scn-options"));
    await waitFor(() => expect(screen.getByTestId("order-detail-error")).toBeTruthy());
    expect(txt("order-detail-error")).toMatch(/không đủ quyền/i);
    expect(txt("order-detail-error")).not.toMatch(/permission/i);
  });
});
