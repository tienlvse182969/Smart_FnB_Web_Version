import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { cashLedgerApi, ledgerSearch, mapLedger } from "../../api/cashLedger";
import { useAppStore } from "../../store";
import CashLedger from "./CashLedger";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const summary = { cashCollected: "300000.00", qrCollected: "200000.00", cashRefunded: "50000.00", netCash: "250000.00", netTotal: "450000.00" };
const raw = {
  items: [
    { id: "l1", direction: "INFLOW", sourceType: "CASH_PAYMENT", paymentMethod: "CASH", amount: "300000.00", occurredAt: "2026-11-02T03:00:00Z", branch: { id: "b1", code: "B1", name: "CN 1" }, orderCode: "CTR-1", callNumber: 7, actor: { firstName: "Lan", lastName: "Trần" }, note: null },
    { id: "l2", direction: "OUTFLOW", sourceType: "REFUND", paymentMethod: "CASH", amount: "50000.00", occurredAt: "2026-11-02T04:00:00Z", branch: { id: "b1", code: "B1", name: "CN 1" }, orderCode: "CTR-2", callNumber: null, actor: { employeeCode: "E9" }, note: "Hết món" },
  ],
  pagination: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
  summary,
  branches: [{ branch: { id: "b1", code: "B1", name: "CN 1" }, summary }],
};

describe("Sổ giao dịch (mục 32, BM-07, OW-08)", () => {
  it("sends whole Vietnam days to the timestamp API and maps money strings without recomputing", () => {
    const search = new URLSearchParams(ledgerSearch({ from: "2026-11-01", to: "2026-11-07", direction: "OUTFLOW" }));
    expect(search.get("from")).toBe("2026-11-01T00:00:00.000+07:00");
    expect(search.get("to")).toBe("2026-11-07T23:59:59.999+07:00");
    expect(search.get("direction")).toBe("OUTFLOW");
    const page = mapLedger(raw);
    expect(page.summary).toEqual({ cashCollected: 300000, qrCollected: 200000, cashRefunded: 50000, netCash: 250000, netTotal: 450000 });
    expect(page.items.map((i) => [i.direction, i.amount, i.actorName])).toEqual([["INFLOW", 300000, "Lan Trần"], ["OUTFLOW", 50000, "E9"]]);
  });

  it("Store Manager reads only the own branch ledger with signed amounts", async () => {
    act(() => useAppStore.setState({ chainId: "c1", currentBranchId: "b1", apiBranches: [] as never }));
    const branch = vi.spyOn(cashLedgerApi, "branch").mockResolvedValue(mapLedger(raw));
    const chain = vi.spyOn(cashLedgerApi, "chain");
    render(<AntApp><CashLedger scope="branch" /></AntApp>);
    await waitFor(() => expect(screen.getAllByTestId("ledger-amount").length).toBe(2));
    expect(branch).toHaveBeenCalledWith("b1", expect.objectContaining({ page: 1 }));
    expect(chain).not.toHaveBeenCalled();
    const [inflow, outflow] = screen.getAllByTestId("ledger-amount").map((n) => n.textContent ?? "");
    expect(inflow.startsWith("+") && inflow.includes("300.000")).toBe(true);
    expect(outflow.startsWith("−") && outflow.includes("50.000")).toBe(true);
    expect(screen.getByText("Tiền mặt thuần trong két")).toBeTruthy();
    expect(screen.queryByTestId("ledger-branches")).toBeNull();
  });

  it("Brand Manager sees the chain ledger with the per-branch summary and can drill into one branch", async () => {
    act(() => useAppStore.setState({ chainId: "c1", currentBranchId: null, apiBranches: [{ id: "b1", chainId: "c1", name: "CN 1", code: "B1" }] as never }));
    const chain = vi.spyOn(cashLedgerApi, "chain").mockResolvedValue(mapLedger(raw));
    const branch = vi.spyOn(cashLedgerApi, "branch").mockResolvedValue(mapLedger({ ...raw, branches: [] }));
    render(<AntApp><CashLedger scope="chain" /></AntApp>);
    const table = await screen.findByTestId("ledger-branches");
    expect(chain).toHaveBeenCalledWith("c1", expect.anything());
    expect(table.textContent).toContain("250.000");
    fireEvent.click(screen.getAllByText("CN 1").find((n) => n.closest("[data-testid=ledger-branches]"))!);
    await waitFor(() => expect(branch).toHaveBeenCalledWith("b1", expect.anything()));
  });
});
