/**
 * Báo cáo Manager theo BE `fb7cae9` (lượt 7.7b, #72, QĐ 77/125): web hiện đúng số BE trả, không tự tính, không tự lọc đơn v7.
 */
import { describe, expect, it } from "vitest";
import { mapManagerReport } from "./mapper";

const fallback = { from: "2026-09-14", to: "2026-10-13", granularity: "day" as const };

describe("payments[] của BE fb7cae9", () => {
  it("giữ settledAmount/receivedAmount (nay là số sau hoàn) và các trường mới nếu có", () => {
    const r = mapManagerReport(
      {
        summary: { orderCount: 9, averageOrderValue: "105555.56", grossRevenue: "1090000.00", refundAmount: "140000.00", netRevenue: "950000.00", revenue: "950000.00" },
        payments: [
          {
            method: "CASH",
            grossSettledAmount: "5925000.00",
            settledAmount: "5785000.00",
            grossReceivedAmount: "5925000.00",
            receivedAmount: "5785000.00",
            refundAmount: "140000.00",
            netAmount: "5785000.00",
            paymentCount: 37,
            cancelledAfterPaymentCount: 2,
          },
        ],
      },
      fallback,
    );
    expect(r.payments[0]).toEqual({
      method: "CASH",
      settledAmount: 5785000,
      receivedAmount: 5785000,
      paymentCount: 37,
      grossSettledAmount: 5925000,
      refundAmount: 140000,
      cancelledAfterPaymentCount: 2,
    });
  });

  it("BE cũ không có trường mới: không bịa số (không có refundAmount/grossSettledAmount)", () => {
    const r = mapManagerReport({ payments: [{ method: "BANK_TRANSFER", settledAmount: "75000", receivedAmount: "75000", paymentCount: 1 }] }, fallback);
    expect(r.payments[0]).toEqual({ method: "BANK_TRANSFER", settledAmount: 75000, receivedAmount: 75000, paymentCount: 1 });
    expect(r.payments[0]).not.toHaveProperty("refundAmount");
  });
});
