import { afterEach, describe, expect, it, vi } from "vitest";
import { adminAnalyticsApi } from "./adminAnalytics";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminAnalyticsApi", () => {
  it("gửi đúng bộ lọc báo cáo doanh thu nền tảng", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ summary: {}, series: [], plans: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await adminAnalyticsApi.revenue({ from: "2026-10-01", to: "2026-10-31", groupBy: "day", planId: "plan-1" });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/admin/platform-revenue?from=2026-10-01&to=2026-10-31&groupBy=day&planId=plan-1");
  });

  it("xác nhận đối chiếu đúng nguồn hoá đơn và gửi ghi chú audit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "invoice-1", status: "PAID", paidAt: "2026-10-10T00:00:00.000Z" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await adminAnalyticsApi.confirmInvoice("SUBSCRIPTION", "invoice-1", "Đã kiểm tra trên PayOS");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/admin/platform-billing/invoices/subscription/invoice-1/confirm");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ note: "Đã kiểm tra trên PayOS" });
  });
});
