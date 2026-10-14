import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

let branchId = "";
let chainId = "";
const mount = (id: string) =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={[`/manager/orders/${id}`]}>
        <Routes>
          <Route path="/manager/orders" element={<div>danh sách</div>} />
          <Route path="/manager/orders/:orderId" element={<OrderDetail />} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );
const scn = (suffix: string) => `${branchId}-${suffix}`;
const txt = (id: string) => screen.getByTestId(id).textContent ?? "";
const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });
const waitDetail = () => waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());

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

/** Mở hộp huỷ, điền lý do, sang bước xem lại. */
async function toReview(suffix: string, reason = "Khách đổi ý, không nhận món", bank = false) {
  mount(scn(suffix));
  await waitDetail();
  fireEvent.click(screen.getByTestId("order-cancel-open"));
  await waitFor(() => expect(screen.getByTestId("cancel-step-form")).toBeTruthy());
  if (bank) {
    const radio = screen.getByTestId("cancel-method-bank");
    fireEvent.click(radio.matches("input") ? radio : radio.querySelector("input")!);
  }
  type("cancel-reason", reason);
  fireEvent.click(screen.getByTestId("cancel-next"));
  await waitFor(() => expect(screen.getByTestId("cancel-step-review")).toBeTruthy());
}

describe("huỷ đơn đã trả và khoản hoàn (BM-06, #43, quyết định 115–)", () => {
  it("nút hiện ở đơn đã trả chưa giao (đã thanh toán / đang pha / sẵn sàng); không ở đơn hoàn tất, chờ thanh toán, đã huỷ", async () => {
    for (const [suffix, shown] of [
      ["scn-paid", true],
      ["scn-preparing", true],
      ["scn-ready", true],
      ["scn-options", false],
      ["scn-qr-waiting", false],
      ["scn-cash-waiting", false],
      ["scn-cancelled-pending", false],
    ] as const) {
      const view = mount(scn(suffix));
      await waitDetail();
      expect(!!screen.queryByTestId("order-cancel-open"), suffix).toBe(shown);
      view.unmount();
    }
  });

  it("hộp xác nhận: tóm tắt số tiền phải hoàn; lý do ngắn bị chặn ở bước nhập", async () => {
    mount(scn("scn-paid"));
    await waitDetail();
    fireEvent.click(screen.getByTestId("order-cancel-open"));
    await waitFor(() => expect(screen.getByTestId("cancel-step-form")).toBeTruthy());
    expect(txt("cancel-amount")).toMatch(/65\.000/);
    type("cancel-reason", "ab");
    fireEvent.click(screen.getByTestId("cancel-next"));
    expect(screen.getByTestId("cancel-step-form")).toBeTruthy();
    expect(txt("cancel-reason-error")).toMatch(/ít nhất 3/);
  });

  it("tiền mặt: huỷ → đơn 'Đã huỷ', khoản hoàn 'Đã hoàn tiền' ngay, không còn nút", async () => {
    await toReview("scn-paid");
    expect(txt("cancel-review-method")).toBe("Tiền mặt tại quầy");
    expect(txt("cancel-reminder")).toMatch(/trả lại khách tiền mặt/i);
    fireEvent.click(screen.getByTestId("cancel-submit"));
    await waitFor(() => expect(txt("order-detail-status")).toBe("Đã huỷ"));
    expect(txt("order-refunds-table")).toContain("Đã hoàn tiền");
    expect(txt("order-refunds-table")).toContain("65.000");
    expect(txt("order-refunds-table")).toContain("Khách đổi ý, không nhận món");
    expect(screen.queryByTestId("order-cancel-open")).toBeNull();
    expect(screen.queryByTestId("refund-complete-open")).toBeNull();
  });

  it("chuyển khoản: khoản 'Chờ hoàn tiền' → Đánh dấu đã hoàn → 'Đã hoàn tiền'", async () => {
    await toReview("scn-preparing", "Khách bỏ về", true);
    expect(txt("cancel-review-method")).toBe("Chuyển khoản");
    fireEvent.click(screen.getByTestId("cancel-submit"));
    await waitFor(() => expect(screen.getByTestId("refund-complete-open")).toBeTruthy());
    expect(txt("order-refunds-table")).toContain("Chờ hoàn tiền");
    expect(txt("order-refund-pending")).toMatch(/65\.000/);
    fireEvent.click(screen.getByTestId("refund-complete-open"));
    await waitFor(() => expect(screen.getByTestId("complete-modal")).toBeTruthy());
    type("complete-note", "Đã chuyển khoản lúc 14:05");
    fireEvent.click(screen.getByTestId("complete-submit"));
    await waitFor(() => expect(screen.queryByTestId("refund-complete-open")).toBeNull());
    expect(txt("order-refunds-table")).toContain("Đã hoàn tiền");
    expect(txt("order-refunds-table")).toContain("Đã chuyển khoản lúc 14:05");
    expect(screen.queryByTestId("order-refund-pending")).toBeNull();
  });

  it("lệch thiếu (Cần xử lý): nút ở khung cảnh báo; số hoàn = số đã nhận; huỷ cả đơn", async () => {
    mount(scn("scn-mismatch-short"));
    await waitDetail();
    fireEvent.click(screen.getByTestId("order-cancel-open-attention"));
    await waitFor(() => expect(screen.getByTestId("cancel-step-form")).toBeTruthy());
    expect(txt("cancel-mismatch-note")).toMatch(/huỷ cả đơn/);
    expect(txt("cancel-received")).toMatch(/70\.000/);
    expect(txt("cancel-amount")).toMatch(/70\.000/);
    expect(screen.queryByTestId("cancel-lines")).toBeNull();
  });

  it("bấm đúp 'Huỷ đơn' chỉ gửi 1 request", async () => {
    const spy = vi.spyOn(orderApi, "cancelPaidOrder").mockImplementation(() => new Promise((r) => setTimeout(r, 40)));
    await toReview("scn-paid");
    const btn = screen.getByTestId("cancel-submit");
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][1]).toBe(scn("scn-paid"));
    expect(spy.mock.calls[0][2]).toEqual({ reason: "Khách đổi ý, không nhận món", refundMethod: "CASH" });
  });

  it("409 (đơn vừa được giao ở nơi khác): câu tiếng Việt qua thông báo, đóng hộp", async () => {
    vi.spyOn(orderApi, "cancelPaidOrder").mockRejectedValueOnce(new ApiError(409, "Delivered, completed or already cancelled orders cannot be cancelled"));
    await toReview("scn-ready");
    fireEvent.click(screen.getByTestId("cancel-submit"));
    await waitFor(() => expect(document.body.textContent).toMatch(/đã giao, đã hoàn tất hoặc đã huỷ nên không huỷ được nữa/));
    expect(document.body.textContent).not.toMatch(/Delivered, completed/);
  });

  it("5xx: báo lỗi tiếng Việt, GIỮ hộp để thử lại", async () => {
    vi.spyOn(orderApi, "cancelPaidOrder").mockRejectedValueOnce(new ApiError(500, "Internal server error"));
    await toReview("scn-paid");
    fireEvent.click(screen.getByTestId("cancel-submit"));
    await waitFor(() => expect(document.body.textContent).toMatch(/Máy chủ đang gặp sự cố/));
    expect(screen.getByTestId("cancel-modal")).toBeTruthy();
    expect((screen.getByTestId("cancel-submit") as HTMLButtonElement).disabled).toBe(false);
  });
});
