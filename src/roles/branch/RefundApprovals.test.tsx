/** BM-06: màn "Yêu cầu hoàn tiền" tải lại danh sách đúng một lần khi socket mất kết nối rồi nối lại; không polling. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter } from "react-router-dom";
import type { OperationsSubscriber } from "../../api/realtime/operations";
import RefundApprovals from "./RefundApprovals";

const list = vi.hoisted(() => vi.fn());
const subscribers = vi.hoisted(() => [] as unknown[]);

vi.mock("../../api", async (importOriginal) => ({ ...(await importOriginal<typeof import("../../api")>()), modeOf: () => "real" }));
vi.mock("../../api/modules/order/refundApprovals", () => ({
  listManagerRefundApprovals: list,
  reviewManagerRefundApproval: vi.fn(),
}));
vi.mock("../../api/realtime/operations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/realtime/operations")>()),
  subscribeOperations: (subscriber: OperationsSubscriber) => {
    subscribers.push(subscriber);
    return () => undefined;
  },
}));

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const row = {
  id: "r1",
  orderId: "o1",
  status: "PENDING",
  amount: "65000",
  reason: "CHANGE_OF_MIND: Khách đổi ý",
  reasonCode: "CHANGE_OF_MIND",
  orderItemIds: [],
  requestedAt: "2026-11-06T03:00:00.000Z",
  reviewedAt: null,
  reviewNote: null,
  completedAt: null,
  order: { orderCode: "CTR-1", callNumber: 7, paidAt: "2026-11-05T03:00:00.000Z" },
};

const mount = () =>
  render(
    <AntApp>
      <MemoryRouter>
        <RefundApprovals />
      </MemoryRouter>
    </AntApp>,
  );

beforeEach(() => {
  list.mockReset();
  list.mockResolvedValue([row]);
  subscribers.length = 0;
});
afterEach(() => vi.useRealTimers());

describe("Yêu cầu hoàn tiền: làm tươi", () => {
  it("tải một lần khi mở; hiện số gọi, mã đơn, số tiền, lý do tiếng Việt", async () => {
    mount();
    await waitFor(() => expect(screen.getByText("CTR-1")).toBeTruthy());
    expect(list).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toMatch(/Khách đổi ý/);
    expect(document.body.textContent).toMatch(/Cả đơn/);
  });

  it("socket nối lại sau khi mất kết nối: tải lại đúng một lần; lần nối đầu tiên thì không", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mount();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    const sub = subscribers[0] as OperationsSubscriber;
    act(() => sub.onStatus?.("connected", { reconnected: false, exhausted: false }));
    await act(async () => vi.advanceTimersByTime(2000));
    expect(list).toHaveBeenCalledTimes(1);

    act(() => sub.onStatus?.("disconnected", { reconnected: false, exhausted: false }));
    act(() => sub.onStatus?.("connected", { reconnected: true, exhausted: false }));
    await act(async () => vi.advanceTimersByTime(2000));
    expect(list).toHaveBeenCalledTimes(2);
  });
});
