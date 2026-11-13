import { describe, expect, it } from "vitest";
import { mapLedger } from "./mapper";
import { buildLedgerQueryString } from "./query";

const entry = (over: Record<string, unknown> = {}) => ({
  id: "e1",
  direction: "INFLOW",
  sourceType: "CASH_PAYMENT",
  paymentMethod: "CASH",
  amount: "45000.00",
  occurredAt: "2026-11-13T03:00:00.000Z",
  occurredAtVietnam: "2026-11-13 10:00:00",
  businessDate: "2026-11-13T00:00:00.000Z",
  branch: { id: "b1", code: "CN1", name: "Chi nhánh 1" },
  orderCode: "A-101",
  callNumber: 7,
  actor: { id: "emp1", employeeCode: "NV1", firstName: "Lan", lastName: "Lê" },
  refundReason: null,
  note: null,
  ...over,
});

const summary = { cashCollected: "100000.00", qrCollected: "50000", cashRefunded: "15000.00", netCash: "85000.00", netTotal: "135000.00", inflow: "150000", outflow: "15000", net: "135000" };

describe("mapLedger (BE 2491dce)", () => {
  it("đổi Decimal chuỗi sang số nguyên đồng, giữ 5 tổng BE trả, không tự cộng", () => {
    const ledger = mapLedger({ items: [entry()], pagination: { page: 2, pageSize: 20, total: 41, totalPages: 3 }, summary, branches: [] });
    expect(ledger.summary).toEqual({ cashCollected: 100000, qrCollected: 50000, cashRefunded: 15000, netCash: 85000, netTotal: 135000 });
    expect(ledger.pagination).toEqual({ page: 2, pageSize: 20, total: 41, totalPages: 3 });
    expect(ledger.items[0]).toMatchObject({ branchId: "b1", amount: 45000, method: "CASH", orderCode: "A-101", callNumber: 7, actorName: "Lan Lê", businessDate: "2026-11-13" });
  });

  it("dòng chi hoàn: số tiền luôn dương, hướng OUTFLOW, ghi chú lấy từ note rồi tới lý do", () => {
    const a = mapLedger({ items: [entry({ direction: "OUTFLOW", sourceType: "REFUND", amount: "15000", note: "Khách đổi ý", refundReason: "x" })], summary }).items[0];
    expect(a).toMatchObject({ direction: "OUTFLOW", amount: 15000, note: "Khách đổi ý" });
    const b = mapLedger({ items: [entry({ direction: "OUTFLOW", note: null, refundReason: "Sai món" })], summary }).items[0];
    expect(b.note).toBe("Sai món");
  });

  it("tổng theo chi nhánh của sổ cả chuỗi", () => {
    const ledger = mapLedger({ items: [], summary, branches: [{ branch: { id: "b1", code: "CN1", name: "Chi nhánh 1" }, summary }, { branch: {}, summary }, null] });
    expect(ledger.branches).toHaveLength(1);
    expect(ledger.branches[0]).toMatchObject({ branchId: "b1", code: "CN1", name: "Chi nhánh 1" });
    expect(ledger.branches[0].summary.netCash).toBe(85000);
  });

  it("bỏ dòng thiếu id, thời điểm hoặc hướng; thiếu người thao tác thì null", () => {
    const ledger = mapLedger({ items: [entry({ id: "" }), entry({ direction: "X" }), entry({ occurredAt: null }), null, entry({ id: "ok", actor: null })], summary: {} });
    expect(ledger.items.map((i) => i.id)).toEqual(["ok"]);
    expect(ledger.items[0].actorName).toBeNull();
    expect(ledger.summary.netCash).toBe(0);
  });

  it("body lạ không làm vỡ", () => {
    expect(mapLedger(null).items).toEqual([]);
    expect(mapLedger({ items: "x" }).items).toEqual([]);
    expect(mapLedger(null).pagination.page).toBe(1);
  });
});

describe("buildLedgerQueryString", () => {
  it("ngày giờ Việt Nam, kèm bộ lọc và phân trang; bộ lọc trống không gửi", () => {
    const p = new URLSearchParams(buildLedgerQueryString({ from: "2026-11-12", to: "2026-11-13", direction: "OUTFLOW", paymentMethod: "CASH", cashierId: "emp1", page: 2, pageSize: 20 }));
    expect(p.get("from")).toBe("2026-11-12T00:00:00.000+07:00");
    expect(p.get("to")).toBe("2026-11-13T23:59:59.999+07:00");
    expect([p.get("direction"), p.get("paymentMethod"), p.get("cashierId"), p.get("page"), p.get("pageSize")]).toEqual(["OUTFLOW", "CASH", "emp1", "2", "20"]);
    const bare = new URLSearchParams(buildLedgerQueryString({ from: "2026-11-12", to: "2026-11-12" }));
    expect(bare.has("direction") || bare.has("paymentMethod") || bare.has("cashierId")).toBe(false);
    expect([bare.get("page"), bare.get("pageSize")]).toEqual(["1", "50"]);
  });

  it("kẹp pageSize trong 1–100", () => {
    expect(new URLSearchParams(buildLedgerQueryString({ from: "2026-11-12", to: "2026-11-12", pageSize: 999 })).get("pageSize")).toBe("100");
    expect(new URLSearchParams(buildLedgerQueryString({ from: "2026-11-12", to: "2026-11-12", pageSize: 0 })).get("pageSize")).toBe("1");
  });
});
