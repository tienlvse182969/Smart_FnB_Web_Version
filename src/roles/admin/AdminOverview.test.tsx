import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { adminAnalyticsApi } from "../../api/adminAnalytics";
import { adminRoutes } from "../../router/routeConfig";
import Kpis from "./Kpis";
import type { AdminOverviewMetrics } from "../../types";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const metrics: AdminOverviewMetrics = {
  registrations: { PENDING: 3, APPROVED: 2, ACTIVATED: 5, REJECTED: 0 } as AdminOverviewMetrics["registrations"],
  businesses: { total: 9, paid: 6, trial: 1, expired: 1, suspended: 1 },
  activePlans: 3,
  mrr: 549000,
  revenueThisMonth: 798000,
  invoicesNeedReview: 1,
  unpaidInvoices: 3,
  outstandingAmount: 897000,
  generatedAt: "2026-11-26T03:00:00Z",
};

it("sidebar puts Doanh thu nền tảng right after Tổng quan", () => {
  expect(adminRoutes.slice(0, 2).map((r) => r.path)).toEqual(["overview", "platform-revenue"]);
});

it("overview shows the current state and work to do, linking to the revenue and billing pages", async () => {
  vi.spyOn(adminAnalyticsApi, "overview").mockResolvedValue(metrics);
  render(<MemoryRouter><Kpis /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText(/^549\.000\s₫$/)).toBeTruthy());
  expect(screen.getByTestId("kpi-revenue-link").getAttribute("href")).toBe("/admin/platform-revenue");
  const invoices = screen.getByTestId("kpi-invoices");
  // 3 chưa trả + 1 cần đối chiếu; đối chiếu ưu tiên nên link lọc NEEDS_REVIEW.
  expect(invoices.textContent).toContain("4");
  expect(invoices.textContent).toMatch(/3 chưa trả · 897\.000\s₫ · 1 cần đối chiếu/);
  expect(invoices.getAttribute("href")).toBe("/admin/billing?status=NEEDS_REVIEW");
  expect(screen.getByText("Hết hạn")).toBeTruthy();
  expect(screen.getByText("Tạm ngưng")).toBeTruthy();
});

it("only unpaid invoices: the card opens the billing list filtered to PENDING", async () => {
  vi.spyOn(adminAnalyticsApi, "overview").mockResolvedValue({ ...metrics, invoicesNeedReview: 0 });
  render(<MemoryRouter><Kpis /></MemoryRouter>);
  await waitFor(() => expect(screen.getByTestId("kpi-invoices").getAttribute("href")).toBe("/admin/billing?status=PENDING"));
});
