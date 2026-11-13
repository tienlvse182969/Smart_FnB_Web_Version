import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../../api/http/errors";
import { accountApi, ledgerApi, managerReportApi } from "../../api";
import { useAppStore } from "../../store";
import type { Ledger, LedgerSummary } from "../../types";
import TransactionLedger, { signedAmountText } from "./TransactionLedger";

vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const SUMMARY: LedgerSummary = { cashCollected: 100000, qrCollected: 50000, cashRefunded: 15000, netCash: 85000, netTotal: 135000 };
const LEDGER: Ledger = {
  items: [
    { id: "1", branchId: "b", direction: "INFLOW", sourceType: "CASH_PAYMENT", method: "CASH", amount: 45000, occurredAt: "2026-11-13T03:00:00.000Z", businessDate: "2026-11-13", orderCode: "A-101", callNumber: 7, actorName: "Lan Lê", note: null },
    { id: "2", branchId: "b", direction: "OUTFLOW", sourceType: "REFUND", method: "CASH", amount: 15000, occurredAt: "2026-11-13T04:00:00.000Z", businessDate: "2026-11-13", orderCode: "A-102", callNumber: 8, actorName: "Minh", note: "Khách đổi ý" },
  ],
  pagination: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
  summary: SUMMARY,
  branches: [],
};

const mount = () =>
  render(
    <AntApp>
      <MemoryRouter initialEntries={["/store-manager/ledger"]}>
        <TransactionLedger />
      </MemoryRouter>
    </AntApp>,
  );

const reportWith = (cashDrawer: { cashCollected: number; cashRefunded: number; netCash: number }[] | undefined) =>
  ({ cashDrawer: cashDrawer?.map((r, i) => ({ employeeId: `e${i}`, employeeName: `NV${i}`, ...r })) }) as never;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(accountApi, "listStaff").mockResolvedValue({ items: [{ id: "emp1", firstName: "Lan", lastName: "Lê", employeeCode: "NV1" }], pagination: {} } as never);
  vi.spyOn(managerReportApi, "getReport").mockResolvedValue(reportWith([{ cashCollected: 100000, cashRefunded: 15000, netCash: 85000 }]));
  act(() => useAppStore.setState({ chainId: "c", currentBranchId: "b" }));
});

describe("TransactionLedger", () => {
  it("dòng có dấu, 5 tổng lấy từ BE, đủ cột, mã đơn mở Tra cứu đơn theo mã", async () => {
    const spy = vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue(LEDGER);
    mount();
    await waitFor(() => expect(screen.getByTestId("ledger-total-netCash").textContent).toContain("85.000"));
    for (const [key, text] of [["cashCollected", "100.000"], ["qrCollected", "50.000"], ["cashRefunded", "15.000"], ["netTotal", "135.000"]]) {
      expect(screen.getByTestId(`ledger-total-${key}`).textContent).toContain(text);
    }
    expect(screen.getByText("+45.000 ₫", { exact: false })).toBeTruthy();
    expect(screen.getByText("−15.000 ₫", { exact: false })).toBeTruthy();
    expect(screen.getByText("Khách đổi ý")).toBeTruthy();
    expect(screen.getByText("Lan Lê")).toBeTruthy();
    expect(document.querySelector('a[href="/store-manager/orders?orderCode=A-101"]')).not.toBeNull();
    expect(spy).toHaveBeenCalledWith("b", expect.objectContaining({ page: 1, pageSize: 50 }));
  });

  it("đổi bộ lọc gửi lên BE, về trang 1, không lọc ở client", async () => {
    const spy = vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue(LEDGER);
    mount();
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    { const el = screen.getByLabelText("Loại"); fireEvent.mouseDown((el.closest(".ant-select-selector") ?? el.closest(".ant-select")?.querySelector(".ant-select-selector") ?? el) as Element); }
    fireEvent.click(await screen.findByText("Chi", { selector: ".ant-select-item-option-content" }));
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith("b", expect.objectContaining({ direction: "OUTFLOW", page: 1 })));
    expect(screen.getByTestId("ledger-filtered-note")).toBeTruthy();
    // Danh sách vẫn đúng như BE trả: web không bỏ dòng nào.
    expect(screen.getByText("+45.000 ₫", { exact: false })).toBeTruthy();
  });

  it("kiểm chéo: khớp báo cáo thì báo khớp; lệch thì cảnh báo và giữ nguyên số của sổ", async () => {
    vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue(LEDGER);
    const { unmount } = mount();
    await waitFor(() => expect(screen.getByTestId("ledger-crosscheck-ok")).toBeTruthy());
    unmount();
    vi.spyOn(managerReportApi, "getReport").mockResolvedValue(reportWith([{ cashCollected: 90000, cashRefunded: 15000, netCash: 75000 }]));
    mount();
    await waitFor(() => expect(screen.getByTestId("ledger-crosscheck-diff")).toBeTruthy());
    expect(screen.getByTestId("ledger-crosscheck-diff").textContent).toContain("90.000");
    expect(screen.getByTestId("ledger-total-netCash").textContent).toContain("85.000");
  });

  it("báo cáo lỗi: ghi chưa đối chiếu được, không báo lệch", async () => {
    vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue(LEDGER);
    vi.spyOn(managerReportApi, "getReport").mockRejectedValue(new ApiError(500, "boom"));
    mount();
    await waitFor(() => expect(screen.getByTestId("ledger-crosscheck-na")).toBeTruthy());
    expect(screen.queryByTestId("ledger-crosscheck-diff")).toBeNull();
  });

  it("ngày trống thì báo không có giao dịch", async () => {
    vi.spyOn(ledgerApi, "getBranchLedger").mockResolvedValue({ ...LEDGER, items: [], pagination: { page: 1, pageSize: 50, total: 0, totalPages: 0 } });
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
});

describe("signedAmountText", () => {
  it("thu +, chi −", () => {
    expect(signedAmountText({ direction: "INFLOW", amount: 1000 })).toMatch(/^\+1\.000/);
    expect(signedAmountText({ direction: "OUTFLOW", amount: 1000 })).toMatch(/^−1\.000/);
  });
});
