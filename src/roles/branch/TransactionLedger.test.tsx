import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../../api/http/errors";
import { ledgerApi } from "../../api";
import { useAppStore } from "../../store";
import type { Ledger } from "../../types";
import TransactionLedger, { signedAmountText } from "./TransactionLedger";

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const LEDGER: Ledger = {
  items: [
    { id: "1", branchId: "b", orderId: "o-aaaaaa", direction: "INFLOW", sourceType: "CASH_PAYMENT", method: "CASH", amount: 45000, occurredAt: "2026-11-13T03:00:00.000Z" },
    { id: "2", branchId: "b", orderId: "o-bbbbbb", direction: "OUTFLOW", sourceType: "REFUND", method: "CASH", amount: 15000, occurredAt: "2026-11-13T04:00:00.000Z" },
  ],
  summary: { inflow: 45000, outflow: 15000, net: 30000 },
  mayBeTruncated: false,
};

const mount = () =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={["/store-manager/ledger"]}>
        <TransactionLedger />
      </MemoryRouter>
    </AntApp>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  act(() => useAppStore.setState({ currentBranchId: "b" }));
});

describe("TransactionLedger", () => {
  it("dòng có dấu, 3 tổng lấy từ BE, mã đơn là liên kết mở chi tiết", async () => {
    const spy = vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue(LEDGER);
    mount();
    await waitFor(() => expect(screen.getByTestId("ledger-total-net").textContent).toContain("30.000"));
    expect(screen.getByText("+45.000 ₫", { exact: false })).toBeTruthy();
    expect(screen.getByText("−15.000 ₫", { exact: false })).toBeTruthy();
    expect(screen.getByTestId("ledger-total-in").textContent).toContain("45.000");
    expect(screen.getByTestId("ledger-total-out").textContent).toContain("15.000");
    expect(screen.queryByTestId("ledger-total-cashNet")).toBeNull();
    expect(document.querySelector('a[href="/store-manager/orders/o-aaaaaa"]')).not.toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ngày trống thì báo không có giao dịch", async () => {
    vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue({ items: [], summary: { inflow: 0, outflow: 0, net: 0 }, mayBeTruncated: false });
    mount();
    await waitFor(() => expect(screen.getByText("Không có giao dịch trong khoảng ngày này")).toBeTruthy());
  });

  it("lỗi 403 hiện thông báo kèm Thử lại; bấm Thử lại gọi lại", async () => {
    const spy = vi.spyOn(ledgerApi, "getBranchLedger").mockRejectedValueOnce(new ApiError(403, "forbidden")).mockResolvedValue(LEDGER);
    mount();
    await waitFor(() => expect(screen.getByTestId("ledger-error")).toBeTruthy());
    fireEvent.click(screen.getByText("Thử lại"));
    await waitFor(() => expect(screen.queryByTestId("ledger-error")).toBeNull());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("đủ 500 dòng thì cảnh báo chỉ hiện 500 dòng mới nhất", async () => {
    vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue({ ...LEDGER, mayBeTruncated: true });
    mount();
    await waitFor(() => expect(screen.getByTestId("ledger-truncated")).toBeTruthy());
  });

  it("hiện thêm tổng tiền mặt thuần khi BE trả", async () => {
    vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue({ ...LEDGER, summary: { ...LEDGER.summary, cashNet: 12000 } });
    mount();
    await waitFor(() => expect(screen.getByTestId("ledger-total-cashNet").textContent).toContain("12.000"));
  });
});

describe("signedAmountText", () => {
  it("thu +, chi −", () => {
    expect(signedAmountText({ direction: "INFLOW", amount: 1000 })).toMatch(/^\+1\.000/);
    expect(signedAmountText({ direction: "OUTFLOW", amount: 1000 })).toMatch(/^−1\.000/);
  });
});
