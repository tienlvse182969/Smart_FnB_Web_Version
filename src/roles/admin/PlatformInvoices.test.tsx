import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { adminAnalyticsApi } from "../../api/adminAnalytics";
import PlatformInvoices from "./PlatformInvoices";
import { reviewReasonText } from "./invoiceReview";
import type { PlatformInvoice } from "../../types";

vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const row = (over: Partial<PlatformInvoice>): PlatformInvoice => ({
  source: "SUBSCRIPTION", id: "i1", referenceCode: "R1", businessId: "b1", businessCode: "B1", businessName: "Quán A",
  planId: "p", planName: "Cơ bản", amount: 299000, status: "PAID", createdAt: "2026-11-20T03:00:00Z", paidAt: "2026-11-20T03:05:00Z",
  reviewReason: null, ...over,
} as PlatformInvoice);

it("translates every BE review reason and keeps unknown codes visible", () => {
  for (const code of ["SIGNED_AMOUNT_MISMATCH", "CHECKOUT_INVALIDATED_BEFORE_PAYMENT", "INVOICE_INVALIDATED_BEFORE_PAYMENT", "SUBSCRIPTION_STATE_CHANGED", "AMOUNT_OR_ACTIVATION_STATE_MISMATCH"])
    expect(reviewReasonText(code)).not.toContain("_");
  expect(reviewReasonText("NEW_CODE")).toBe("NEW_CODE");
  expect(reviewReasonText(null)).toBe("Không rõ lý do.");
});

it("no separate reconciliation column: only invoices needing review get a Xác nhận action, with a readable reason", async () => {
  vi.spyOn(adminAnalyticsApi, "invoices").mockResolvedValue({
    items: [row({ id: "paid" }), row({ id: "review", status: "NEEDS_REVIEW", reviewReason: "SIGNED_AMOUNT_MISMATCH" }), row({ id: "pending", status: "PENDING", paidAt: null })],
    pagination: { page: 1, limit: 12, total: 3, totalPages: 1 },
  });
  const confirm = vi.spyOn(adminAnalyticsApi, "confirmInvoice").mockResolvedValue({ id: "review", status: "PAID", paidAt: "2026-11-26T03:00:00Z" });
  render(<AntApp><PlatformInvoices /></AntApp>);
  await screen.findByTestId("invoice-status-NEEDS_REVIEW");
  expect(screen.queryByText("Đối chiếu")).toBeNull();
  expect(screen.getAllByTestId("confirm-invoice")).toHaveLength(1);
  expect(document.body.textContent).not.toContain("SIGNED_AMOUNT_MISMATCH");
  fireEvent.click(screen.getByTestId("confirm-invoice"));
  expect(await screen.findByText(/Số tiền PayOS báo về khác số tiền trên hoá đơn/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Ghi chú đối chiếu"), { target: { value: "Đã đối chiếu sao kê, khách chuyển thiếu 1.000 ₫" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận đã thu" }));
  await waitFor(() => expect(confirm).toHaveBeenCalledWith("SUBSCRIPTION", "review", "Đã đối chiếu sao kê, khách chuyển thiếu 1.000 ₫"));
});
