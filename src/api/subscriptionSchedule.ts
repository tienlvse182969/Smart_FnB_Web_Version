import { request } from "./http/client";
import type { ServicePlan } from "../types";

export type InvoiceLine = { id?: string; kind: string; description: string; quantity: number; unitPrice: number; amount: number };
export type KeepRequirement = { limit: number; used: number; mustRemove: number; owners?: number; lockedWithBranches?: number };
export type NextViolation = {
  error: string;
  message: string;
  suggestedPlan?: { id: string; code: string; name: string; monthlyPrice: number; maxBranches: number };
  selectionTotal?: number;
} | null;

/** `GET /subscription/next-invoice-preview` (BE `SubscriptionScheduleService.preview`). */
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
  upcomingPaid?: { plan: ServicePlan; extraBranches: number; accountPacks: number; branchLimit: number; accountLimit: number; startsAt: string; endsAt: string } | null;
  registered?: boolean;
  registeredByRole?: "BRAND_MANAGER" | "PLATFORM_STAFF" | "PLATFORM_ADMIN" | null;
  registeredAt?: string | null;
  basePlanId?: string;
  keepBranchIds?: string[] | null;
  keepAccountIds?: string[] | null;
  keepRequired?: { branches: KeepRequirement; accounts: KeepRequirement };
  usage?: { branches: number; accounts: number; owners: number; employees: number; pendingInvitations: number };
  violation?: NextViolation;
  warnings?: string[];
  maxSellableExtraBranches?: number;
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
/** `GET /subscription/keep-candidates`: what can be ticked when the next limit shrinks (BR-11). */
export type KeepCandidates = {
  owners: number;
  branches: { id: string; code: string; name: string; status: string }[];
  accounts: { id: string; userId: string; name: string; email: string; role: string; status: string; invitationState: string | null; branchId: string; branchName: string }[];
};
export type NextDraft = { planId?: string; extraBranches?: number; accountPacks?: number };
export type KeepSelection = { keepBranchIds?: string[]; keepAccountIds?: string[] };
export type NextPeriodInput = NextDraft & KeepSelection;

const base = (chainId: string) => `/restaurant-chains/${chainId}/subscription`;
const plan = (raw: ServicePlan): ServicePlan => ({
  ...raw,
  monthlyPrice: Number(raw.monthlyPrice),
  extraBranchPrice: Number(raw.extraBranchPrice ?? 0),
  extraAccountPackPrice: Number(raw.extraAccountPackPrice ?? 0),
  extraBranchAccounts: Number(raw.extraBranchAccounts ?? 8),
});
export const normalizePreview = (preview: NextInvoicePreview): NextInvoicePreview => ({
  ...preview,
  plan: plan(preview.plan),
  upcomingPaid: preview.upcomingPaid ? { ...preview.upcomingPaid, plan: plan(preview.upcomingPaid.plan) } : null,
});
export function draftQuery(draft?: NextDraft) {
  if (!draft) return "";
  const url = new URLSearchParams();
  Object.entries(draft).forEach(([key, value]) => { if (value !== undefined) url.set(key, String(value)); });
  return url.size ? `?${url}` : "";
}

export const subscriptionScheduleApi = {
  async preview(chainId: string, draft?: NextDraft) { return normalizePreview(await request<NextInvoicePreview>(`${base(chainId)}/next-invoice-preview${draftQuery(draft)}`)); },
  invoices(chainId: string) { return request<SubscriptionInvoice[]>(`${base(chainId)}/invoices`); },
  keepCandidates(chainId: string) { return request<KeepCandidates>(`${base(chainId)}/keep-candidates`); },
  async putPlan(chainId: string, planId: string, keep: KeepSelection = {}) { return normalizePreview(await request<NextInvoicePreview>(`${base(chainId)}/next-plan`, { method: "PUT", body: { planId, ...keep } })); },
  async clearPlan(chainId: string, keep: KeepSelection = {}) { return normalizePreview(await request<NextInvoicePreview>(`${base(chainId)}/next-plan`, { method: "DELETE", body: keep })); },
  async putAddons(chainId: string, extraBranches: number, accountPacks: number, keep: KeepSelection = {}) { return normalizePreview(await request<NextInvoicePreview>(`${base(chainId)}/next-addons`, { method: "PUT", body: { extraBranches, accountPacks, ...keep } })); },
  /** One registration (plan + add-ons + BR-11 keep lists) in a single call: `PUT /subscription/next-period`. */
  async register(chainId: string, input: NextPeriodInput) {
    return normalizePreview(await request<NextInvoicePreview>(`${base(chainId)}/next-period`, { method: "PUT", body: { extraBranches: 0, accountPacks: 0, ...input } }));
  },
};

/** Same contract for Platform Staff / Admin on behalf of a customer (note required, audited). */
export function supportNextPeriodApi(basePath: "/platform-staff" | "/admin", businessId: string) {
  const url = `${basePath}/businesses/${businessId}/next-period`;
  return {
    async load(draft?: NextDraft) {
      const raw = await request<{ preview: NextInvoicePreview; candidates: KeepCandidates; invoices: SubscriptionInvoice[] }>(`${url}${draftQuery(draft)}`);
      return { ...raw, preview: normalizePreview(raw.preview) };
    },
    async save(input: NextPeriodInput & { note: string; clear?: boolean }) { return normalizePreview(await request<NextInvoicePreview>(url, { method: "PUT", body: input })); },
  };
}
