import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter } from "react-router-dom";
import { mockControl } from "../../api/mock/control";
import { setScenario } from "../../api/mock/scenario";
import { resetMockStates } from "../../api/mock/store";
import { branchMock } from "../../api/modules/branch/mock";
import { useAppStore } from "../../store";
import { attentionStore } from "./attentionStore";

// Ép `order` về real CHỈ ở giao diện để watcher đăng ký nghe socket (không có token nên không nối thật); dữ liệu vẫn từ mock.
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

import AttentionWatcher from "./AttentionWatcher";

beforeEach(async () => {
  setScenario({ profile: "A", tier: null, expired: false });
  resetMockStates();
  attentionStore.set(null);
  const chainId = (await branchMock.listChains())[0].id;
  const branchId = (await branchMock.listBranches())[0].id;
  act(() => useAppStore.setState({ chainId, currentBranchId: branchId, branches: [] }));
});
afterEach(() => act(() => useAppStore.setState({ chainId: null, currentBranchId: null })));

const inject = (event: unknown) =>
  (window as unknown as { __injectOperationsEvent: (e: unknown) => number }).__injectOperationsEvent(event);
const ev = (orderId: string) => ({
  type: "manager.order.attention-required",
  occurredAt: new Date().toISOString(),
  data: { reason: "PAYMENT_AMOUNT_MISMATCH", orderId, paymentId: "p", expectedAmount: "75000", receivedAmount: "70000" },
});

describe("AttentionWatcher: cảnh báo socket (QĐ 100)", () => {
  it("trong React StrictMode (dev): sự kiện lệch số tiền → đúng 1 thông báo tiếng Việt kèm nút Xem, sau cửa sổ gom 2 giây, không trùng đơn", async () => {
    render(
      <StrictMode>
        <AntApp>
          <MemoryRouter>
            <AttentionWatcher />
          </MemoryRouter>
        </AntApp>
      </StrictMode>,
    );
    await waitFor(() => expect(attentionStore.get()).not.toBeNull());
    let listeners = 0;
    act(() => {
      listeners = inject(ev("order-1"));
      inject(ev("order-1"));
      inject(ev("order-1"));
    });
    expect(listeners).toBeGreaterThanOrEqual(1);
    await waitFor(() => expect(document.body.textContent).toMatch(/Có đơn chuyển khoản lệch số tiền: nhận .* cần /), { timeout: 5000 });
    expect(document.querySelectorAll(".ant-notification-notice")).toHaveLength(1);
    expect(screen.getByTestId("attention-alert-view")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/PAYMENT_AMOUNT_MISMATCH|attention-required/);
  });
});
