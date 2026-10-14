/**
 * Chi tiết đơn theo BE `fb7cae9` (lượt 7.7b): tiền về sau khi QR hết hạn (#61/#75: không nút bấm ra 409), hết món đã trả (#67),
 * khách đưa/tiền thối/hạn QR (#48/#50), tên người ở khoản hoàn (#73), và QĐ 122 (huỷ đơn đã trả không khoá khi gói hết hạn).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { orderApi } from "../../api";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { useAppStore } from "../../store";
import type { OrderDetail as OrderDetailData, OrderPaymentRecord } from "../../types";

mockControl.latency = [0, 0];
mockControl.failure = null;

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

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

let chainId = "";
let branchId = "";
beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  chainId = (await branchMock.listChains())[0].id;
  branchId = (await branchMock.listBranches())[0].id;
  act(() => useAppStore.setState({ chainId, currentBranchId: branchId, branches: [], plan: null }));
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null, plan: null }));
});

async function show(d: OrderDetailData) {
  vi.spyOn(orderApi, "getOrder").mockResolvedValue(d);
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
}

describe("tiền về sau khi QR hết hạn (#61, #75)", () => {
  it("BE 7d7f2dc (#75): có 'Xác nhận thủ công' và 'Huỷ đơn và ghi hoàn tiền', không còn câu chờ hỗ trợ", async () => {
    await show(
      detail({
        attentionReason: "PAYMENT_RECEIVED_AFTER_EXPIRY",
        attentionAt: "2026-10-12T03:20:00.000Z",
        payments: [
          payment({ status: "REQUIRES_ATTENTION", receivedAmount: 75000, expiresAt: "2026-10-12T03:10:00.000Z", failureReason: "PAYMENT_RECEIVED_AFTER_EXPIRY" }),
        ],
      }),
    );
    const text = screen.getByTestId("order-detail-attention-text").textContent ?? "";
    expect(text).not.toMatch(/#75/);
    expect(text).toMatch(/Xác nhận thủ công/);
    expect(screen.getByTestId("order-detail-attention").textContent).toMatch(/Tiền về sau khi QR hết hạn/);
    expect(screen.getByTestId("order-confirm-open")).toBeTruthy();
    expect(screen.getByTestId("order-cancel-open")).toBeTruthy();
    expect(screen.getByTestId("order-cancel-open-attention")).toBeTruthy();
    // Khoản hiện đúng nhãn enum mới, không "Khác (…)", kèm số nhận được và hạn QR.
    const pays = screen.getByTestId("order-detail-payments").textContent ?? "";
    expect(pays).toMatch(/Cần xử lý/);
    expect(pays).not.toMatch(/Khác \(/);
    expect(pays).toMatch(/Tiền nhận được sau khi QR hết hạn/);
    expect(pays).toMatch(/Mã QR hết hạn lúc/);
  });
});

describe("hết món khi đơn đã trả (#67)", () => {
  it("lý do riêng, không gọi là lệch tiền; có nút huỷ đơn và ghi hoàn tiền", async () => {
    await show(
      detail({
        status: "REQUIRES_ATTENTION",
        paymentStatus: "PAID",
        paidAt: "2026-10-12T03:05:00.000Z",
        attentionReason: "PAID_ITEM_OUT_OF_STOCK",
        attentionAt: "2026-10-12T03:30:00.000Z",
        payments: [payment({ method: "CASH", status: "SUCCESS", receivedAmount: null, tenderedAmount: 100000, changeAmount: 25000 })],
      }),
    );
    const alert = screen.getByTestId("order-detail-attention").textContent ?? "";
    expect(alert).toMatch(/Hết món \(đơn đã trả\)/);
    expect(alert).not.toMatch(/lệch/i);
    expect(screen.getByTestId("order-cancel-open")).toBeTruthy();
    // #48: tiền mặt hiện khách đưa / tiền thối.
    expect(screen.getByTestId("order-detail-payments").textContent).toMatch(/Khách đưa: 100\.000\s?₫ · Tiền thối: 25\.000\s?₫/);
  });
});

describe("QĐ 122 (đổi QĐ 85, #59): gói hết hạn không khoá xác nhận tay và huỷ đơn đã trả", () => {
  it("đơn đã trả + gói expired: nút huỷ vẫn bấm được", async () => {
    act(() =>
      useAppStore.setState({
        plan: { chainId: "c", tier: "STANDARD", planName: "Demo", status: "expired", expiresAt: "2020-01-01T00:00:00.000Z", limits: [], features: {}, source: { limits: "real", features: "real" } } as never,
      }),
    );
    await show(detail({ status: "SUBMITTED", paymentStatus: "PAID", payments: [payment({ method: "CASH", status: "SUCCESS" })] }));
    const btn = screen.getByTestId("order-cancel-open") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

describe("tên người ở khoản hoàn (#73)", () => {
  it("hiện họ tên kèm vai trò; thiếu tên thì chỉ vai trò", async () => {
    await show(
      detail({
        status: "CANCELLED",
        paymentStatus: "PAID",
        payments: [payment({ method: "CASH", status: "SUCCESS" })],
        refunds: [
          {
            id: "r1",
            paymentId: "p1",
            amount: 75000,
            status: "COMPLETED",
            method: "BANK_TRANSFER",
            source: "MANAGER_CANCELLATION",
            reason: "Khách đổi ý",
            requestedByRole: "MANAGER",
            requestedAt: "2026-10-12T04:00:00.000Z",
            completedByRole: "OWNER",
            completedAt: "2026-10-12T05:00:00.000Z",
            note: null,
            lines: [],
            requestedByName: "Minh Quản lý",
            completedByName: null,
          },
        ],
      }),
    );
    expect(screen.getByTestId("refund-requested-by").textContent).toBe("Minh Quản lý (Quản lý chi nhánh)");
    expect(screen.getByTestId("refund-completed-by").textContent).toBe("Chủ chuỗi");
  });
});
