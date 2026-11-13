import { request } from "./http/client";
import { mapBusiness, mapPage, mapPlan, mapRegistration, mapRegistrationDetail, type RawBusiness, type RawPage, type RawPlan, type RawRegistration } from "./modules/admin/mapper";
import type { ApproveRegistrationInput, PageQuery, RegistrationStatus } from "../types";

const base = "/platform-staff";

/** PS-01 / 30.3: one row of "Đã duyệt — chờ kích hoạt". Only registration + platform billing data (BR-07). */
export type AwaitingActivation = {
  id: string;
  applicationCode: string;
  businessName: string;
  representativeName: string;
  representativeEmail: string;
  representativePhone: string;
  approvedPlan: { id: string; code: string; name: string; monthlyPrice: number } | null;
  activationSentAt: string | null;
  activationExpiresAt: string | null;
  activationLastOpenedAt: string | null;
  linkExpired: boolean;
  /** "created" = đã tạo QR PayOS kỳ đầu cho link hiện tại; khác với "paid" (đã thanh toán). */
  firstPeriodQr: { created: boolean; createdAt: string | null; latestStatus: string | null; paid: boolean; needsReview: boolean; amount: number | null };
};

type RawAwaitingActivation = Omit<AwaitingActivation, "approvedPlan" | "firstPeriodQr"> & {
  approvedPlan: { id: string; code: string; name: string; monthlyPrice: string | number } | null;
  firstPeriodQr: Omit<AwaitingActivation["firstPeriodQr"], "amount"> & { amount: string | number | null };
};

export function mapAwaitingActivation(raw: RawAwaitingActivation): AwaitingActivation {
  return {
    ...raw,
    approvedPlan: raw.approvedPlan ? { ...raw.approvedPlan, monthlyPrice: Number(raw.approvedPlan.monthlyPrice) } : null,
    firstPeriodQr: { ...raw.firstPeriodQr, amount: raw.firstPeriodQr.amount == null ? null : Number(raw.firstPeriodQr.amount) },
  };
}

function query(params: Record<string, string | number | undefined>) {
  const url = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== "") url.set(key, String(value)); });
  return url.size ? `?${url}` : "";
}

export const platformStaffApi = {
  async listRegistrations({ page = 1, limit = 20, search, status }: PageQuery & { status?: RegistrationStatus } = {}) {
    return mapPage(await request<RawPage<RawRegistration>>(`${base}/registration-applications${query({ page, limit, search, status })}`), mapRegistration);
  },
  async listAwaitingActivation({ page = 1, limit = 20, search }: PageQuery = {}) {
    const raw = await request<{ items: RawAwaitingActivation[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`${base}/registration-applications/awaiting-activation${query({ page, limit, search })}`);
    return { items: raw.items.map(mapAwaitingActivation), pagination: raw.pagination };
  },
  /** PS-01/BR-56: đặt lại mật khẩu Brand Manager sau khi xác minh ngoài hệ thống; ghi chú bắt buộc. */
  resetOwnerPassword(ownerId: string, note: string) {
    return request<{ ownerId: string; recipient: string; expiresAt: string; emailStatus?: "SENT" | "PENDING" | "FAILED" }>(`${base}/owners/${ownerId}/reset-password`, { method: "POST", body: { note: note.trim() } });
  },
  async getRegistration(id: string) { return mapRegistrationDetail(await request<RawRegistration>(`${base}/registration-applications/${id}`)); },
  async approveRegistration(id: string, input: ApproveRegistrationInput) { return mapRegistrationDetail(await request<RawRegistration>(`${base}/registration-applications/${id}/approve`, { method: "POST", body: input })); },
  async rejectRegistration(id: string, reason: string) { return mapRegistrationDetail(await request<RawRegistration>(`${base}/registration-applications/${id}/reject`, { method: "POST", body: { reason } })); },
  async listPlans() { return (await request<RawPlan[]>(`${base}/service-plans`)).map(mapPlan); },
  async listBusinesses({ page = 1, limit = 20, search }: PageQuery = {}) { return mapPage(await request<RawPage<RawBusiness>>(`${base}/businesses${query({ page, limit, search })}`), mapBusiness); },
  async getBusiness(id: string) { return mapBusiness(await request<RawBusiness>(`${base}/businesses/${id}`)); },
  async scheduleNextPlan(id: string, planId: string, note: string) { return mapBusiness(await request<RawBusiness>(`${base}/businesses/${id}/next-plan`, { method: "POST", body: { planId, note } })); },
  getBusinessBilling(id: string) { return request<{ subscription: { nextPlanId: string | null; expiresAt: string }; checkouts: { id: string; amount: string; status: string; createdAt: string; paidAt: string | null; reviewReason: string | null; checkoutUrl: string | null }[] }>(`${base}/businesses/${id}/billing`); },
  resendInvoice(id: string, note: string) { return request(`${base}/businesses/${id}/billing/resend-invoice`, { method: "POST", body: { note } }); },
  recheckPayment(id: string, checkoutId: string, note: string) { return request(`${base}/businesses/${id}/billing/checkouts/${checkoutId}/recheck`, { method: "POST", body: { note } }); },
};

export async function changeApprovedPlan(basePath: "/admin" | "/platform-staff", id: string, planId: string, note: string) {
  return mapRegistrationDetail(await request<RawRegistration>(`${basePath}/registration-applications/${id}/change-approved-plan`, { method: "POST", body: { planId, note } }));
}

export async function resendActivation(basePath: "/admin" | "/platform-staff", id: string, note: string) {
  return mapRegistrationDetail(await request<RawRegistration>(`${basePath}/registration-applications/${id}/resend-activation`, { method: "POST", body: { note } }));
}
