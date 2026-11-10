import { request } from "./http/client";
import type { ServicePlan } from "../types";

export type InvoiceLine = { id?: string; kind: string; description: string; quantity: number; unitPrice: number; amount: number };
export type NextInvoicePreview = {
  plan: ServicePlan;
  extraBranches: number;
  accountPacks: number;
  branchLimit: number;
  accountLimit: number;
  startsAt: string;
  endsAt: string;
  currentPeriodEndsAt: string;
  paidUpcoming: boolean;
  lines: InvoiceLine[];
  total: number;
};
export type SubscriptionInvoice = {
  id: string;
  planName: string;
  periodStartsAt: string;
  periodEndsAt: string;
  total: number;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidAt: string | null;
  lines: InvoiceLine[];
};

const base = (chainId: string) => `/restaurant-chains/${chainId}/subscription`;
const normalize = (preview: NextInvoicePreview): NextInvoicePreview => ({ ...preview, plan: { ...preview.plan, monthlyPrice: Number(preview.plan.monthlyPrice) } });

export const subscriptionScheduleApi = {
  async preview(chainId: string) { return normalize(await request<NextInvoicePreview>(`${base(chainId)}/next-invoice-preview`)); },
  invoices(chainId: string) { return request<SubscriptionInvoice[]>(`${base(chainId)}/invoices`); },
  async putPlan(chainId: string, planId: string) { return normalize(await request<NextInvoicePreview>(`${base(chainId)}/next-plan`, { method: "PUT", body: { planId } })); },
  async clearPlan(chainId: string) { return normalize(await request<NextInvoicePreview>(`${base(chainId)}/next-plan`, { method: "DELETE" })); },
  async putAddons(chainId: string, extraBranches: number, accountPacks: number) { return normalize(await request<NextInvoicePreview>(`${base(chainId)}/next-addons`, { method: "PUT", body: { extraBranches, accountPacks } })); },
};
