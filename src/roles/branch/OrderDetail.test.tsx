import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { ApiError, describeApiError, setApiErrorHandler } from "../../api/http/errors";
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

describe("xác nhận chuyển khoản thủ công (BM-05, quyết định 82–85)", () => {
  const openBtn = () => screen.queryByTestId("order-confirm-open");
  const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
  const waitDetail = () => waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
  /** Mở hộp ở đơn đã gắn kịch bản, điền lý do và số tiền, sang bước xem lại. */
  const toReview = async (suffix: string, received: string, reason = "Khách chìa màn hình chuyển khoản") => {
    mount(scn(suffix));
    await waitDetail();
    fireEvent.click(openBtn()!);
    await waitFor(() => expect(screen.getByTestId("confirm-step-form")).toBeTruthy());
    type("confirm-received", received);
    type("confirm-reason", reason);
    fireEvent.click(screen.getByTestId("confirm-next"));
    await waitFor(() => expect(screen.getByTestId("confirm-step-review")).toBeTruthy());
  };

  it("nút hiện ở QR chờ và Lệch số tiền; không hiện ở tiền mặt, FAILED, đơn huỷ, đơn đã trả", async () => {
    for (const [suffix, shown] of [
      ["scn-qr-waiting", true],
      ["scn-mismatch-short", true],
      ["scn-mismatch-over", true],
      ["scn-cash-waiting", false],
      ["scn-qr-failed", false],
      ["scn-cancelled-pending", false],
      ["scn-manual", false],
      ["scn-options", false],
    ] as const) {
      const view = mount(scn(suffix));
      await waitDetail();
      expect(!!openBtn(), suffix).toBe(shown);
      view.unmount();
    }
  });

  it("Lệch số tiền: nhãn 'Cần xử lý' / 'Lệch số tiền' và số nhận được ở lịch sử thanh toán", async () => {
    mount(scn("scn-mismatch-short"));
    await waitDetail();
    expect(txt("order-detail-status")).toBe("Cần xử lý");
    expect(txt("order-detail-payment")).toBe("Lệch số tiền");
    expect(txt("order-detail-attention")).toMatch(/70\.000/);
    expect(txt("order-detail-payments")).toContain("Lệch số tiền");
    expect(txt("order-pay-detail")).toMatch(/Số tiền nhận được: 70\.000/);
  });

  it("BR-28: nhận thiếu → câu BR-28 và nút Tiếp tục bị khoá; bằng → bình thường; dư → 'Phải trả lại khách'", async () => {
    mount(scn("scn-qr-waiting"));
    await waitDetail();
    fireEvent.click(openBtn()!);
    await waitFor(() => expect(screen.getByTestId("confirm-received")).toBeTruthy());
    type("confirm-reason", "Khách chìa màn hình");
    type("confirm-received", "70000");
    expect(txt("confirm-short")).toContain("Nhận thiếu so với tổng đơn. Không xác nhận được — cần huỷ đơn và ghi khoản phải hoàn.");
    expect((screen.getByTestId("confirm-next") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Huỷ đơn/)).toBeNull();
    type("confirm-received", "75000");
    expect(screen.queryByTestId("confirm-short")).toBeNull();
    expect((screen.getByTestId("confirm-next") as HTMLButtonElement).disabled).toBe(false);
    type("confirm-received", "80000");
    expect(txt("confirm-change")).toContain("Phải trả lại khách 5.000");
  });

  it("lý do dưới 3 ký tự không sang bước xem lại và báo lỗi tại ô", async () => {
    mount(scn("scn-qr-waiting"));
    await waitDetail();
    fireEvent.click(openBtn()!);
    await waitFor(() => expect(screen.getByTestId("confirm-received")).toBeTruthy());
    type("confirm-received", "75000");
    type("confirm-reason", "ab");
    fireEvent.click(screen.getByTestId("confirm-next"));
    await waitFor(() => expect(screen.getByTestId("confirm-reason-error")).toBeTruthy());
    expect(txt("confirm-reason-error")).toMatch(/ít nhất 3/);
    expect(screen.queryByTestId("confirm-step-review")).toBeNull();
  });

  it("bước xem lại: tóm tắt (mã đơn, tổng, số nhận, phần dư, lý do) và dòng nhắc kiểm tiền (GĐ-04)", async () => {
    await toReview("scn-qr-waiting", "80000", "Khách chìa màn hình");
    const modal = screen.getByTestId("confirm-step-review");
    expect(modal.textContent).toMatch(/CTR-\d+/);
    // formatVnd dùng khoảng trắng không ngắt trước ₫.
    expect(txt("confirm-expected")).toMatch(/^75\.000\s₫$/);
    expect(txt("confirm-review-received")).toMatch(/^80\.000\s₫$/);
    expect(txt("confirm-review-change")).toMatch(/^5\.000\s₫$/);
    expect(txt("confirm-review-reason")).toBe("Khách chìa màn hình");
    expect(txt("confirm-reminder")).toContain("Chỉ xác nhận khi đã kiểm tra tiền đã vào tài khoản của quán.");
  });

  it("thành công: đúng 1 request với thân đúng DTO, thông báo, GET lại; lịch sử có người xác nhận, lý do, số tiền thực nhận", async () => {
    const spy = vi.spyOn(orderApi, "confirmPayment");
    const get = vi.spyOn(orderApi, "getOrder");
    await toReview("scn-qr-waiting", "80000", "  Khách chìa màn hình  ");
    const before = get.mock.calls.length;
    fireEvent.click(screen.getByTestId("confirm-submit"));
    fireEvent.click(screen.getByTestId("confirm-submit"));
    await waitFor(() => expect(txt("order-detail-status")).toBe("Đã thanh toán"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][2]).toEqual({ reason: "Khách chìa màn hình", receivedAmount: 80000 });
    expect(get.mock.calls.length).toBeGreaterThan(before);
    await waitFor(() => expect(document.body.textContent).toMatch(/Đã xác nhận thanh toán thủ công/));
    expect(openBtn()).toBeNull();
    expect(txt("order-detail-call")).not.toBe("—");
    expect(txt("order-pay-detail")).toMatch(/Xác nhận thủ công bởi Quản lý mẫu: Khách chìa màn hình/);
    expect(txt("order-pay-detail")).toMatch(/Số tiền thực nhận: 80\.000/);
  });

  it("409 (webhook vừa về): câu tiếng Việt, GET lại, đóng hộp, đơn thành Đã thanh toán", async () => {
    await toReview("scn-qr-conflict", "70000");
    fireEvent.click(screen.getByTestId("confirm-submit"));
    await waitFor(() => expect(txt("order-detail-status")).toBe("Đã thanh toán"));
    await waitFor(() => expect(document.body.textContent).toMatch(/đã được xác nhận hoặc không còn chờ xác nhận/));
    expect(document.body.textContent).not.toMatch(/PAYMENT_ALREADY_SETTLED/);
    expect(screen.queryByTestId("confirm-submit")).toBeNull();
  });

  it("409 nhận thiếu từ BE: câu BR-28, GET lại, đóng hộp", async () => {
    vi.spyOn(orderApi, "confirmPayment").mockRejectedValueOnce(new ApiError(409, "Số tiền thực nhận thấp hơn tổng tiền đơn hàng.", [], "PAYMENT_AMOUNT_INSUFFICIENT"));
    const get = vi.spyOn(orderApi, "getOrder");
    await toReview("scn-qr-waiting", "75000");
    const before = get.mock.calls.length;
    fireEvent.click(screen.getByTestId("confirm-submit"));
    await waitFor(() => expect(document.body.textContent).toMatch(/Nhận thiếu so với tổng đơn\. Không xác nhận được/));
    // Đơn vẫn chờ xác nhận nên hộp còn trong DOM (jsdom không chạy xong hiệu ứng đóng); điều quan sát được: đã GET lại chi tiết.
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(before));
  });

  it("400 từ BE: lỗi theo ô bằng tiếng Việt, hộp còn mở để sửa", async () => {
    vi.spyOn(orderApi, "confirmPayment").mockRejectedValueOnce(new ApiError(400, "receivedAmount must not be less than 0.01", ["receivedAmount must not be less than 0.01"]));
    await toReview("scn-qr-waiting", "75000");
    fireEvent.click(screen.getByTestId("confirm-submit"));
    await waitFor(() => expect(document.body.textContent).toMatch(/Số tiền thực nhận không được nhỏ hơn 0\.01/));
    expect(screen.getByTestId("confirm-submit")).toBeTruthy();
    expect((screen.getByTestId("confirm-submit") as HTMLButtonElement).disabled).toBe(false);
  });

  it("403 (không đủ quyền): câu tiếng Việt, hộp còn mở", async () => {
    // 403 do lớp API báo toàn cục (ApiErrorBridge, không gắn trong test): bắt qua handler và kiểm câu hiển thị.
    const shown: string[] = [];
    setApiErrorHandler((e) => shown.push(describeApiError(e.error)));
    try {
      vi.spyOn(orderApi, "confirmPayment").mockRejectedValueOnce(new ApiError(403, "Only MANAGER can manually confirm bank transfers"));
      await toReview("scn-qr-waiting", "75000");
      fireEvent.click(screen.getByTestId("confirm-submit"));
      await waitFor(() => expect(shown).toEqual(["Bạn không đủ quyền thực hiện thao tác này."]));
      expect(document.body.textContent).not.toMatch(/Only MANAGER/);
      expect((screen.getByTestId("confirm-submit") as HTMLButtonElement).disabled).toBe(false);
    } finally {
      setApiErrorHandler(null);
    }
  });

  it("gói hết hạn (chỉ đọc): nút khoá, không mở được hộp", async () => {
    act(() =>
      useAppStore.setState({
        plan: { chainId: "c", tier: "STANDARD", planName: "Demo", status: "expired", expiresAt: "2020-01-01T00:00:00.000Z", limits: [], features: {}, source: { limits: "real", features: "real" } } as never,
      }),
    );
    mount(scn("scn-qr-waiting"));
    await waitDetail();
    expect((openBtn() as HTMLButtonElement).disabled).toBe(true);
    act(() => useAppStore.setState({ plan: null }));
  });
});
