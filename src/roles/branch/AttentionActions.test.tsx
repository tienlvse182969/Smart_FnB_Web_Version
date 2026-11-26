/**
 * BM-05 "Đơn cần xử lý" — khối "Xử lý đơn": hoàn tiền mặt (cả đơn / món hết), làm tiếp món, đánh dấu đã xử lý; và các route BE.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { orderApi } from "../../api";
import { request } from "../../api/http/client";
import { ApiError } from "../../api/http/errors";
import { attentionPlan, linesRefundAmount, refundReasonText } from "../../api/modules/order/attentionActions";
import { useAppStore } from "../../store";
import type { OrderDetail as OrderDetailData, OrderDetailLine, OrderPaymentRecord } from "../../types";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("../../api/http/client", async (original) => ({ ...(await original<typeof import("../../api/http/client")>()), request: vi.fn() }));

import OrderDetail from "./OrderDetail";

const payment = (over: Partial<OrderPaymentRecord> = {}): OrderPaymentRecord => ({
  id: "p1",
  paymentCode: "PAY-1",
  method: "BANK_TRANSFER",
  status: "SUCCESS",
  amount: 75000,
  receivedAmount: null,
  transactionRef: null,
  confirmationReason: null,
  confirmedAt: null,
  paidAt: "2026-10-12T03:05:00.000Z",
  createdAt: "2026-10-12T03:00:00.000Z",
  failureReason: null,
  processedBy: null,
  ...over,
});
const line = (over: Partial<OrderDetailLine> = {}): OrderDetailLine => ({
  id: "l1",
  name: "Trà sữa",
  unitPrice: 30000,
  quantity: 1,
  options: [],
  total: 30000,
  status: "QUEUED",
  note: null,
  cancellationReason: null,
  parentId: null,
  ...over,
});
const detail = (over: Partial<OrderDetailData> = {}): OrderDetailData => ({
  id: "o1",
  orderCode: "CTR-O1",
  callNumber: 12,
  placedAt: "2026-10-12T03:00:00.000Z",
  paidAt: null,
  total: 75000,
  status: "REQUIRES_ATTENTION",
  paymentStatus: "UNPAID",
  payments: [payment()],
  cashierName: "Lan",
  cancelledAt: null,
  cancellationReason: null,
  refunds: [],
  subtotal: 75000,
  discount: 0,
  tax: 0,
  serviceCharge: 0,
  note: null,
  cancelledBy: null,
  lines: [],
  ...over,
});

const lateCancelled = detail({
  status: "CANCELLED",
  cancelledAt: "2026-10-12T03:10:00.000Z",
  attentionReason: "PAYMENT_RECEIVED_AFTER_CANCELLATION",
  payments: [payment({ status: "REQUIRES_ATTENTION", receivedAmount: 42000, failureReason: "PAYMENT_RECEIVED_AFTER_CANCELLATION" })],
});
const outOfStock = detail({
  paymentStatus: "PAID",
  attentionReason: "PAID_ITEM_OUT_OF_STOCK",
  payments: [payment({ method: "CASH" })],
  lines: [
    line({ id: "l1", status: "OUT_OF_STOCK" }),
    line({ id: "combo", name: "Combo sáng", total: 45000, status: "QUEUED" }),
    line({ id: "part", name: "Bánh mì", total: 0, status: "OUT_OF_STOCK", parentId: "combo" }),
  ],
});

beforeEach(() => {
  act(() => useAppStore.setState({ chainId: "c1", currentBranchId: "b1", branches: [], plan: null }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(request).mockReset();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null, plan: null }));
});

async function show(d: OrderDetailData) {
  const getOrder = vi.spyOn(orderApi, "getOrder").mockResolvedValue(d);
  render(
    <AntApp>
      <MemoryRouter initialEntries={["/manager/orders/o1"]}>
        <Routes>
          <Route path="/manager/orders/:orderId" element={<OrderDetail />} />
        </Routes>
      </MemoryRouter>
    </AntApp>,
  );
  await waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
  return getOrder;
}

describe("attentionPlan — Store Manager làm được gì", () => {
  it("tiền về sau khi huỷ: hoàn tiền mặt số đã nhận, đơn vẫn là đã huỷ", () => {
    expect(attentionPlan(lateCancelled).refund).toEqual({ amount: 42000, cancelsOrder: false, label: "Hoàn tiền mặt cho khách", defaultReason: "OTHER" });
  });

  it("đã hoàn rồi thì không còn việc gì", () => {
    const refunded = { ...lateCancelled, refunds: [{ id: "r1", paymentId: "p1", amount: 42000 } as never] };
    expect(attentionPlan(refunded).needsAttention).toBe(false);
  });

  it("QR hết hạn: huỷ đơn và hoàn; chuyển thiếu: huỷ và hoàn số đã nhận; chuyển dư: chỉ xác nhận thủ công", () => {
    const expiry = detail({ attentionReason: "PAYMENT_RECEIVED_AFTER_EXPIRY", payments: [payment({ status: "REQUIRES_ATTENTION", receivedAmount: 75000, failureReason: "PAYMENT_RECEIVED_AFTER_EXPIRY" })] });
    expect(attentionPlan(expiry).refund).toMatchObject({ amount: 75000, cancelsOrder: true, label: "Huỷ đơn và hoàn tiền mặt" });
    const short = detail({ attentionReason: "PAYMENT_AMOUNT_MISMATCH", payments: [payment({ status: "AMOUNT_MISMATCH", receivedAmount: 70000 })] });
    expect(attentionPlan(short).refund).toMatchObject({ amount: 70000, label: "Huỷ đơn và hoàn số đã nhận" });
    const over = detail({ attentionReason: "PAYMENT_AMOUNT_MISMATCH", payments: [payment({ status: "AMOUNT_MISMATCH", receivedAmount: 80000 })] });
    expect(attentionPlan(over).refund).toBeNull();
  });

  it("hết món: danh sách dòng gốc đang hết (combo theo dòng combo) và số tiền hoàn theo món", () => {
    const plan = attentionPlan(outOfStock);
    expect(plan.outOfStockLines.map((l) => l.id)).toEqual(["l1", "combo"]);
    expect(plan.refund).toMatchObject({ amount: 75000, label: "Huỷ cả đơn, hoàn tiền mặt", defaultReason: "OUT_OF_STOCK" });
    expect(linesRefundAmount(outOfStock, ["l1"])).toBe(30000);
    expect(plan.canResolve).toBe(false);
  });

  it("lý do hoàn hiện bằng tiếng Việt, giữ ghi chú", () => {
    expect(refundReasonText("OTHER: Khách đã về")).toBe("Khác: Khách đã về");
    expect(refundReasonText("OUT_OF_STOCK")).toBe("Hết món");
    expect(refundReasonText("Khách bỏ đi")).toBe("Khách bỏ đi");
    expect(refundReasonText(null)).toBeNull();
  });

  it("lý do không rõ: chỉ đánh dấu đã xử lý", () => {
    const unknown = detail({ attentionReason: "LEGACY", paymentStatus: "PAID", payments: [payment()] });
    expect(attentionPlan(unknown)).toMatchObject({ canResolve: true, refund: null, outOfStockLines: [] });
  });
});

describe("Chi tiết đơn — khối Xử lý đơn", () => {
  it("đơn đã huỷ có tiền về muộn: hiện cảnh báo và hoàn tiền mặt, gửi đúng route rồi tải lại", async () => {
    const getOrder = await show(lateCancelled);
    expect(screen.getByTestId("order-detail-attention").textContent).toMatch(/Tiền về sau khi đơn đã huỷ/);
    fireEvent.click(screen.getByTestId("attention-refund-open"));
    await screen.findByTestId("attention-refund-dialog");
    expect(screen.getByTestId("attention-refund-amount").textContent).toMatch(/42\.000/);
    const submit = () => screen.getByTestId("attention-refund-submit") as HTMLButtonElement;
    expect(submit().disabled).toBe(true); // "Khác" cần ghi chú
    fireEvent.change(screen.getByTestId("attention-refund-note"), { target: { value: "Khách đã về, trả lại tiền QR" } });
    expect(submit().disabled).toBe(false);
    const refund = vi.spyOn(orderApi, "attentionRefund").mockResolvedValue();
    fireEvent.click(submit());
    await waitFor(() => expect(refund).toHaveBeenCalledTimes(1));
    expect(refund.mock.calls[0].slice(1)).toEqual(["o1", { reasonCode: "OTHER", note: "Khách đã về, trả lại tiền QR", orderItemIds: undefined }]);
    await waitFor(() => expect(getOrder).toHaveBeenCalledTimes(2));
  });

  it("hết món: hoàn tiền từng món đã chọn và làm tiếp món", async () => {
    await show(outOfStock);
    const refund = vi.spyOn(orderApi, "attentionRefund").mockResolvedValue();
    const resume = vi.spyOn(orderApi, "resumeOutOfStock").mockResolvedValue();
    fireEvent.click(screen.getByTestId("attention-refund-lines-open"));
    await screen.findByTestId("attention-refund-dialog");
    const combo = screen.getByTestId("attention-line-combo");
    fireEvent.click(combo.querySelector("input") ?? combo);
    expect(screen.getByTestId("attention-refund-amount").textContent).toMatch(/30\.000/);
    fireEvent.click(screen.getByTestId("attention-refund-submit"));
    await waitFor(() => expect(refund).toHaveBeenCalledTimes(1));
    expect(refund.mock.calls[0].slice(1)).toEqual(["o1", { reasonCode: "OUT_OF_STOCK", note: undefined, orderItemIds: ["l1"] }]);

    fireEvent.click(screen.getByTestId("attention-resume-open"));
    await screen.findByTestId("attention-resume-dialog");
    fireEvent.click(screen.getByTestId("attention-resume-submit"));
    await waitFor(() => expect(resume).toHaveBeenCalledTimes(1));
    expect(resume.mock.calls[0].slice(1)).toEqual(["o1", { orderItemIds: ["l1", "combo"], note: undefined }]);
  });

  it("món còn đang hết (409): báo lỗi, đóng hộp và tải lại", async () => {
    const getOrder = await show(outOfStock);
    vi.spyOn(orderApi, "resumeOutOfStock").mockRejectedValue(new ApiError(409, "Mark the item or option available again before resuming these lines"));
    fireEvent.click(screen.getByTestId("attention-resume-open"));
    await screen.findByTestId("attention-resume-dialog");
    fireEvent.click(screen.getByTestId("attention-resume-submit"));
    await waitFor(() => expect(getOrder).toHaveBeenCalledTimes(2));
  });

  it("lý do không rõ: đánh dấu đã xử lý cần ghi chú", async () => {
    await show(detail({ attentionReason: "LEGACY", paymentStatus: "PAID", payments: [payment()] }));
    expect(screen.queryByTestId("attention-refund-open")).toBeNull();
    fireEvent.click(screen.getByTestId("attention-resolve-open"));
    await screen.findByTestId("attention-resolve-dialog");
    const submit = () => screen.getByTestId("attention-resolve-submit") as HTMLButtonElement;
    expect(submit().disabled).toBe(true);
    fireEvent.change(screen.getByTestId("attention-resolve-note"), { target: { value: "Đã kiểm tra với thu ngân" } });
    const resolve = vi.spyOn(orderApi, "resolveAttention").mockResolvedValue();
    fireEvent.click(submit());
    await waitFor(() => expect(resolve).toHaveBeenCalledWith({ chainId: "c1", branchId: "b1" }, "o1", "Đã kiểm tra với thu ngân"));
  });

  it("đơn bình thường và Brand Manager (chỉ xem) không có khối Xử lý đơn", async () => {
    await show(detail({ status: "COMPLETED", paymentStatus: "PAID" }));
    expect(screen.queryByTestId("attention-actions")).toBeNull();
  });
});

describe("API real — route của Store Manager", () => {
  it("gửi đúng route, chỉ các ô có giá trị (BE forbidNonWhitelisted)", async () => {
    vi.mocked(request).mockResolvedValue({});
    const { orderReal } = await import("../../api/modules/order/real");
    const scope = { chainId: "c1", branchId: "b1" };
    await orderReal.attentionRefund(scope, "o1", { reasonCode: "OTHER", note: "  trả lại tiền QR " });
    await orderReal.attentionRefund(scope, "o1", { reasonCode: "OUT_OF_STOCK", orderItemIds: ["l1"] });
    await orderReal.resumeOutOfStock(scope, "o1", {});
    await orderReal.resolveAttention(scope, "o1", " Đã kiểm tra ");
    expect(vi.mocked(request).mock.calls).toEqual([
      ["/manager/orders/o1/attention/refund", { method: "POST", body: { reasonCode: "OTHER", note: "trả lại tiền QR" } }],
      ["/manager/orders/o1/attention/refund", { method: "POST", body: { reasonCode: "OUT_OF_STOCK", orderItemIds: ["l1"] } }],
      ["/manager/orders/o1/attention/resume-items", { method: "POST", body: {} }],
      ["/manager/orders/o1/attention/resolve", { method: "POST", body: { note: "Đã kiểm tra" } }],
    ]);
  });
});
