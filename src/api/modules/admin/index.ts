/**
 * Module admin — Platform Admin: duyệt hồ sơ (PA-01..03), gói (PA-04), doanh nghiệp (PA-05..07).
 * Mock cho tới giai đoạn 3; BE đã có `/admin/*`. Admin chỉ thấy số liệu tổng hợp (BR-07).
 */
import type { Plan, RegistrationRequest, Tenant, TenantStatus } from "../../../types";
import { defineApi } from "../../define";
import { adminMock } from "./mock";

export interface RegistrationInput {
  businessName: string;
  taxCode: string;
  address: string;
  estimatedBranches: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface TenantUsage {
  branches: number;
  accounts: number;
}

export interface AdminApi {
  listTenants(): Promise<Tenant[]>;
  getTenantUsage(tenantId: string): Promise<TenantUsage>;
  listPlans(): Promise<Plan[]>;
  createPlan(data: Omit<Plan, "id">): Promise<Plan>;
  updatePlan(id: string, data: Partial<Omit<Plan, "id">>): Promise<Plan>;
  /** Người đăng ký nộp hồ sơ (GU-01) — chưa có tài khoản. */
  submitRegistration(data: RegistrationInput): Promise<RegistrationRequest>;
  listRegistrations(): Promise<RegistrationRequest[]>;
  /** Cảnh báo (không chặn) nếu mã số thuế trùng một doanh nghiệp đã duyệt. */
  findDuplicateTaxCode(taxCode: string, excludeId?: string): Promise<RegistrationRequest[]>;
  approveRegistration(id: string, planId: string): Promise<{ tenant: Tenant; ownerEmail: string }>;
  rejectRegistration(id: string, reason: string): Promise<void>;
  setTenantStatus(id: string, status: TenantStatus): Promise<void>;
  renewTenant(id: string): Promise<Tenant>;
  changeTenantPlan(id: string, planId: string): Promise<Tenant>;
  /** Đặt lại mật khẩu Owner; trả về email để Admin báo lại. */
  resetOwnerPassword(tenantId: string): Promise<{ email: string }>;
}

// CHỜ BE: BE có /admin/registration-applications, /admin/service-plans, /admin/businesses/* — giai đoạn 3 nối.
export const adminApi = defineApi<AdminApi>("admin", { mock: adminMock });
