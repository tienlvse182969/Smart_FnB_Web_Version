import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { adminAnalyticsApi } from "../../api/adminAnalytics";
import { adminApi } from "../../api";
import PlatformRevenue from "./PlatformRevenue";
import type { PlatformRevenueReport } from "../../types";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("dates MRR at the period end and shows trial conversion by start month (30.4)", async () => {
  vi.spyOn(adminApi, "listPlans").mockResolvedValue([]);
  const report: PlatformRevenueReport = {
    range: { from: "2026-09-30T17:00:00Z", to: "2026-10-31T16:59:59.999Z", groupBy: "month" },
    summary: {
      revenue: 798000, invoiceCount: 2, mrr: 549000, mrrAt: "2026-10-31T16:59:59.999Z", paidBusinesses: 2, trialBusinesses: 1,
      expiredBusinesses: 0, suspendedBusinesses: 0, trialConversionRate: 1 / 3, trialStarted: 3, trialConverted: 1, trialInProgress: 1,
      unpaidInvoices: 0, reviewInvoices: 0, outstandingAmount: 0, manualRenewals: 0,
    },
    series: [{ period: "2026-10", revenue: 798000, invoiceCount: 2 }],
    plans: [],
    trialCohorts: [{ month: "2026-10", started: 3, converted: 1, inTrial: 1, conversionRate: 1 / 3, settledConversionRate: 0.5 }],
  };
  vi.spyOn(adminAnalyticsApi, "revenue").mockResolvedValue(report);
  render(<PlatformRevenue />);
  expect(await screen.findByText("MRR tại 31/10/2026")).toBeTruthy();
  expect(screen.getByText("1/3 bắt đầu dùng thử trong kỳ · 1 còn đang dùng thử")).toBeTruthy();
  const cohorts = await screen.findByTestId("trial-cohorts");
  await waitFor(() => expect(cohorts.textContent).toContain("10/2026"));
  expect(cohorts.textContent).toContain("33,3%");
  expect(cohorts.textContent).toContain("50%");
});
