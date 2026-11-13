import { describe, expect, it } from "vitest";
import { mapLedger, LEDGER_BE_LIMIT } from "./mapper";
import { buildLedgerQueryString } from "./query";

const entry = (over: Record<string, unknown> = {}) => ({
  id: "e1",
  branchId: "b1",
  orderId: "o1",
  direction: "INFLOW",
  sourceType: "CASH_PAYMENT",
  paymentMethod: "CASH",
  amount: "45000.00",
  occurredAt: "2026-11-13T03:00:00.000Z",
  ...over,
});

describe("mapLedger", () => {
  it("đổi Decimal chuỗi của BE sang số nguyên đồng, giữ nguyên 3 tổng BE trả", () => {
    const ledger = mapLedger({ items: [entry(), entry({ id: "e2", direction: "OUTFLOW", sourceType: "REFUND", amount: "15000" })], summary: { inflow: "45000.00", outflow: "15000.00", net: "30000.00" } });
    expect(ledger.items.map((i) => [i.direction, i.amount])).toEqual([["INFLOW", 45000], ["OUTFLOW", 15000]]);
    expect(ledger.summary).toEqual({ inflow: 45000, outflow: 15000, net: 30000 });
    expect(ledger.mayBeTruncated).toBe(false);
  });

  it("bỏ dòng thiếu id, thời điểm hoặc hướng; không đoán giá trị", () => {
    const ledger = mapLedger({ items: [entry({ id: "" }), entry({ direction: "X" }), entry({ occurredAt: null }), null, "x"], summary: {} });
    expect(ledger.items).toEqual([]);
    expect(ledger.summary).toEqual({ inflow: 0, outflow: 0, net: 0 });
  });

  it("chỉ gắn trường BE chưa trả (L6) khi BE có trả", () => {
    const bare = mapLedger({ items: [entry()], summary: {} }).items[0];
    expect("orderCode" in bare || "actorName" in bare || "note" in bare).toBe(false);
    const full = mapLedger({ items: [entry({ orderCode: "A-1", callNumber: 7, actorName: "Lan", note: "Khách đổi ý" })], summary: { cashIn: "1000", cashNet: "400" } });
    expect(full.items[0]).toMatchObject({ orderCode: "A-1", callNumber: 7, actorName: "Lan", note: "Khách đổi ý" });
    expect(full.summary).toMatchObject({ cashIn: 1000, cashNet: 400 });
    expect(full.summary.qrIn).toBeUndefined();
  });

  it("báo có thể bị cắt khi đủ 500 dòng (BE take 500)", () => {
    const items = Array.from({ length: LEDGER_BE_LIMIT }, (_, i) => entry({ id: `e${i}` }));
    expect(mapLedger({ items, summary: {} }).mayBeTruncated).toBe(true);
  });

  it("body lạ không làm vỡ", () => {
    expect(mapLedger(null).items).toEqual([]);
    expect(mapLedger({ items: "x" }).items).toEqual([]);
  });
});

describe("buildLedgerQueryString", () => {
  it("ngày theo giờ Việt Nam: đầu ngày from đến cuối ngày to", () => {
    const qs = buildLedgerQueryString({ from: "2026-11-12", to: "2026-11-13" });
    const params = new URLSearchParams(qs);
    expect(params.get("from")).toBe("2026-11-12T00:00:00.000+07:00");
    expect(params.get("to")).toBe("2026-11-13T23:59:59.999+07:00");
  });
});
