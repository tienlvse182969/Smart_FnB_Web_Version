import type {
  AdminOverviewMetrics,
  Paginated,
  PlatformInvoice,
  PlatformInvoiceSource,
  PlatformInvoiceStatus,
  PlatformRevenueGroupBy,
  PlatformRevenueReport,
} from "../types";
import { request } from "./http/client";

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const adminAnalyticsApi = {
  overview: () => request<AdminOverviewMetrics>("/admin/overview"),
  revenue: (params: { from?: string; to?: string; groupBy: PlatformRevenueGroupBy; planId?: string }) =>
    request<PlatformRevenueReport>(`/admin/platform-revenue${query(params)}`),
  invoices: (params: { page?: number; limit?: number; search?: string; status?: PlatformInvoiceStatus; chainId?: string } = {}) =>
    request<Paginated<PlatformInvoice>>(`/admin/platform-billing/invoices${query(params)}`),
  confirmInvoice: (source: PlatformInvoiceSource, id: string, note: string) =>
    request<{ id: string; status: PlatformInvoiceStatus; paidAt: string | null }>(
      `/admin/platform-billing/invoices/${source.toLowerCase()}/${id}/confirm`,
      { method: "POST", body: { note } },
    ),
};
