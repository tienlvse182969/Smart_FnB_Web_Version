import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { orderApi } from "../../api";
import { useAppStore } from "../../store";
import OrderDetail from "./OrderDetail";

mockControl.latency = [0, 0];
mockControl.failure = null;
vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

let branchId = "";
beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  const chainId = (await branchMock.listChains())[0].id;
  branchId = (await branchMock.listBranches())[0].id;
  act(() => useAppStore.setState({ chainId, currentBranchId: branchId, branches: [] }));
});
afterEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ chainId: null, currentBranchId: null }));
});

const mount = (suffix: string) => render(
  <AntApp>
    <MemoryRouter initialEntries={[`/manager/orders/${branchId}-${suffix}`]}>
      <Routes><Route path="/manager/orders/:orderId" element={<OrderDetail />} /></Routes>
    </MemoryRouter>
  </AntApp>,
);

describe("Store Manager xem hoàn tiền, Thu ngân xác nhận chi trả", () => {
  it("không cho Store Manager huỷ đơn đã trả trực tiếp hoặc đánh dấu đã hoàn", async () => {
    mount("scn-paid");
    await waitFor(() => expect(screen.getByTestId("order-detail")).toBeTruthy());
    expect(screen.queryByTestId("order-cancel-open")).toBeNull();
    expect(screen.queryByTestId("refund-complete-open")).toBeNull();
  });

  it("vẫn cho xem khoản hoàn cũ ở đơn đã huỷ", async () => {
    const chainId = useAppStore.getState().chainId!;
    const orderId = `${branchId}-scn-cancelled-pending`;
    const original = await orderApi.getOrder({ chainId, branchId }, orderId);
    vi.spyOn(orderApi, "getOrder").mockResolvedValue({
      ...original,
      refunds: [{
        id: "legacy-refund", paymentId: "payment-1", amount: 65000,
        status: "PENDING", method: "BANK_TRANSFER", source: "MANAGER_CANCELLATION",
        reason: "Khách đổi ý", requestedByRole: "MANAGER", requestedAt: new Date().toISOString(),
        completedByRole: null, completedAt: null, note: null, lines: [],
      }],
    });
    mount("scn-cancelled-pending");
    await waitFor(() => expect(screen.getByTestId("order-refunds-table")).toBeTruthy());
    expect(screen.getByTestId("order-refunds-table").textContent).toMatch(/Chờ hoàn tiền/);
    expect(screen.queryByTestId("refund-complete-open")).toBeNull();
  });
});
