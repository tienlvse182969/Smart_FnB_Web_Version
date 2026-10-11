import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { orderApi } from "../../api";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { useAppStore } from "../../store";

// Ép `order` về real CHỈ ở tầng giao diện để màn chi tiết đăng ký nghe socket (không có token nên không nối thật); dữ liệu vẫn từ mock.
vi.mock("../../api", async (importActual) => {
  const actual = await importActual<typeof import("../../api")>();
  return { ...actual, modeOf: (m: Parameters<typeof actual.modeOf>[0]) => (m === "order" ? "real" : actual.modeOf(m)) };
});

mockControl.latency = [0, 0];
mockControl.failure = null;

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

import OrderDetail from "./OrderDetail";

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
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null }));
});

describe("quyết định 102: hộp xác nhận tay tự đóng khi đơn đổi trạng thái", () => {
  it("webhook về trong lúc hộp đang mở → đóng hộp và nói rõ trạng thái mới", async () => {
    const id = `${branchId}-scn-qr-waiting`;
    render(
      <AntApp>
        <MemoryRouter initialEntries={[`/manager/orders/${id}`]}>
          <Routes>
            <Route path="/manager/orders/:orderId" element={<OrderDetail />} />
          </Routes>
        </MemoryRouter>
      </AntApp>,
    );
    await waitFor(() => expect(screen.getByTestId("order-confirm-open")).toBeTruthy());
    fireEvent.click(screen.getByTestId("order-confirm-open"));
    await waitFor(() => expect(screen.getByTestId("confirm-step-form")).toBeTruthy());

    // BE: khoản được thanh toán (webhook) — dựng bằng mock rồi bơm sự kiện socket giả (hook DEV-only của `operations.ts`).
    const detail = await orderApi.getOrder({ chainId, branchId }, id);
    await orderApi.confirmPayment({ chainId, branchId }, detail.payments[0].id, { reason: "webhook về", receivedAmount: detail.total });
    const inject = (window as unknown as { __injectOperationsEvent?: (e: unknown) => number }).__injectOperationsEvent;
    expect(inject).toBeTypeOf("function");
    act(() => {
      inject!({ type: "payment.confirmed", occurredAt: new Date().toISOString(), data: { orderId: id } });
    });

    await waitFor(() => expect(document.body.textContent).toMatch(/Đơn vừa được cập nhật \(Đã thanh toán\), không cần xác nhận nữa\./), { timeout: 4000 });
    expect(screen.queryByTestId("order-confirm-open")).toBeNull();
    expect(screen.getByTestId("order-detail-status").textContent).toBe("Đã thanh toán");
  });
});
