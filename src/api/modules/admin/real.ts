import { request } from "../../http/client";
import {
  mapBusiness,
  mapPage,
  mapPlan,
  mapRegistration,
  mapRegistrationDetail,
  type RawBusiness,
  type RawPage,
  type RawPlan,
  type RawRegistration,
} from "./mapper";
import type { AdminApi } from "./index";

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const adminReal: AdminApi = {
  async listRegistrations({ page = 1, limit = 20, search, status } = {}) {
    const raw = await request<RawPage<RawRegistration>>(
      `/admin/registration-applications${query({ page, limit, search: search?.trim(), status })}`,
    );
    return mapPage(raw, mapRegistration);
  },

  async getRegistration(id) {
    return mapRegistrationDetail(await request<RawRegistration>(`/admin/registration-applications/${id}`));
  },

  async approveRegistration(id, input) {
    const raw = await request<RawRegistration>(`/admin/registration-applications/${id}/approve`, {
      method: "POST",
      body: input,
    });
    return mapRegistrationDetail(raw);
  },

  async rejectRegistration(id, reason) {
    const raw = await request<RawRegistration>(`/admin/registration-applications/${id}/reject`, {
      method: "POST",
      body: { reason },
    });
    return mapRegistrationDetail(raw);
  },

  async submitRegistration(input) {
    // Công khai: không gắn Bearer.
    const raw = await request<RawRegistration>("/registration-applications", {
      method: "POST",
      body: input,
      anonymous: true,
    });
    return mapRegistration(raw);
  },

  async listBusinesses({ page = 1, limit = 20, search } = {}) {
    const raw = await request<RawPage<RawBusiness>>(`/admin/businesses${query({ page, limit, search: search?.trim() })}`);
    return mapPage(raw, (b) => mapBusiness(b));
  },

  async getBusiness(id) {
    return mapBusiness(await request<RawBusiness>(`/admin/businesses/${id}`));
  },

  async renewBusiness(id, input) {
    return mapBusiness(
      await request<RawBusiness>(`/admin/businesses/${id}/subscription/renew`, { method: "POST", body: input }),
    );
  },

  async changeBusinessPlan(id, input) {
    return mapBusiness(
      await request<RawBusiness>(`/admin/businesses/${id}/subscription/change-plan`, { method: "POST", body: input }),
    );
  },

  async suspendBusiness(id, reason) {
    return mapBusiness(
      await request<RawBusiness>(`/admin/businesses/${id}/suspend`, { method: "POST", body: { reason } }),
    );
  },

  async reactivateBusiness(id, reason) {
    return mapBusiness(
      await request<RawBusiness>(`/admin/businesses/${id}/reactivate`, {
        method: "POST",
        body: reason ? { reason } : {},
      }),
    );
  },

  async resetOwnerPassword(ownerId) {
    const raw = await request<{ ownerId: string; expiresAt: string }>(`/admin/owners/${ownerId}/reset-password`, {
      method: "POST",
    });
    return { ownerId: raw.ownerId, expiresAt: raw.expiresAt };
  },

  async listPlans() {
    return (await request<RawPlan[]>("/admin/service-plans")).map(mapPlan);
  },

  async createPlan(input) {
    // maxTables là v7 nhưng BE còn bắt buộc → luôn gửi 0 (TODO BE: bỏ bắt buộc, api-contract-plan.md mục 7 #10).
    return mapPlan(await request<RawPlan>("/admin/service-plans", { method: "POST", body: { ...input, maxTables: 0 } }));
  },

  async updatePlan(id, input) {
    return mapPlan(await request<RawPlan>(`/admin/service-plans/${id}`, { method: "PATCH", body: { ...input, maxTables: 0 } }));
  },
};
