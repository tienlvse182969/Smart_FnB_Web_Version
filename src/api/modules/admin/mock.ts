import type { Plan, RegistrationRequest, Tenant } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { genId, newId, nowISO } from "../../mock/util";
import type { AdminApi, TenantUsage } from "./index";

// Số liệu gói dưới đây chỉ là dữ liệu mock (ví dụ đặc tả 13.1); số thật do Admin cấu hình và BE trả (CC-01).
let plans: Plan[] = [
  { id: "plan-basic", name: "Cơ bản", monthlyPrice: 0, maxBranches: 2, maxAccounts: 10 },
  { id: "plan-standard", name: "Tiêu chuẩn", monthlyPrice: 0, maxBranches: 5, maxAccounts: 30 },
  { id: "plan-advanced", name: "Nâng cao", monthlyPrice: 0, maxBranches: 10, maxAccounts: 80 },
];

let tenants: Tenant[] = [
  { id: "T-1001", name: "Cà Phê Mộc Nhà", planId: "plan-advanced", status: "active", renewsAt: "2026-10-15", createdAt: "2025-03-01" },
  { id: "T-1002", name: "Trà Sữa BoBa Lab", planId: "plan-basic", status: "active", renewsAt: "2026-10-28", createdAt: "2024-11-20" },
  { id: "T-1043", name: "Trà Chanh Cô Ba", planId: "plan-standard", status: "active", renewsAt: "2026-10-02", createdAt: "2025-01-10" },
  { id: "T-1060", name: "Cà Phê Phố Cổ", planId: "plan-basic", status: "active", renewsAt: "2026-09-14", createdAt: "2026-08-14" },
  { id: "T-1062", name: "Cà Phê Muối Đà Lạt", planId: "plan-standard", status: "suspended", renewsAt: "2026-08-30", createdAt: "2025-05-20" },
  { id: "T-1071", name: "Nước Ép Tươi Mát", planId: "plan-basic", status: "expired", renewsAt: "2026-09-01", createdAt: "2026-07-01" },
];

const usage: Record<string, TenantUsage> = {
  "T-1001": { branches: 3, accounts: 14 },
  "T-1002": { branches: 2, accounts: 9 },
  "T-1043": { branches: 4, accounts: 18 },
  "T-1060": { branches: 1, accounts: 4 },
  "T-1062": { branches: 3, accounts: 12 },
  "T-1071": { branches: 1, accounts: 3 },
};

const ownerEmails: Record<string, string> = {
  "T-1001": "owner.a@mock.local",
  "T-1002": "owner.b@mock.local",
};

let registrations: RegistrationRequest[] = [
  {
    id: "R-88", businessName: "Trà Đạo Sài Gòn", taxCode: "0312345671", address: "12 Nguyễn Trãi, Q.5, TP.HCM",
    contactEmail: "chi.nguyen@tradao.vn", contactName: "Nguyễn Thị Chi", contactPhone: "0908123456",
    estimatedBranches: 3, submittedAt: "2026-09-17T12:00:00", status: "pending",
  },
  {
    id: "R-89", businessName: "Cà Phê Rang Xay Hùng", taxCode: "0312345672", address: "88 Lê Văn Sỹ, Q.3, TP.HCM",
    contactEmail: "owner@caphehung.vn", contactName: "Lê Mạnh Hùng", contactPhone: "0918234567",
    estimatedBranches: 4, submittedAt: "2026-09-17T09:12:00", status: "pending",
  },
  {
    id: "R-90", businessName: "Sinh Tố Cô Hoa", taxCode: "0312345673", address: "45 Phan Xích Long, Phú Nhuận, TP.HCM",
    contactEmail: "hoa@sinhto.vn", contactName: "Trần Thị Hoa", contactPhone: "0928345678",
    estimatedBranches: 2, submittedAt: "2026-09-16T14:30:00", status: "rejected",
    rejectReason: "Hồ sơ không hợp lệ — thiếu giấy phép kinh doanh.",
  },
];

const findTenant = (id: string): Tenant => {
  const t = tenants.find((x) => x.id === id);
  if (!t) throw new ApiError(404, "Doanh nghiệp không tồn tại");
  return t;
};

export const adminMock: AdminApi = {
  async listTenants() {
    await mockDelay();
    return tenants.map((t) => ({ ...t }));
  },

  async getTenantUsage(tenantId) {
    await mockDelay();
    return usage[tenantId] ?? { branches: 0, accounts: 1 };
  },

  async listPlans() {
    await mockDelay();
    return plans.map((p) => ({ ...p }));
  },

  async createPlan(data) {
    await mockDelay();
    const plan: Plan = { id: genId("plan"), ...data };
    plans = [...plans, plan];
    return plan;
  },

  async updatePlan(id, data) {
    await mockDelay();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new ApiError(404, "Gói dịch vụ không tồn tại");
    plans[idx] = { ...plans[idx], ...data };
    return plans[idx];
  },

  async submitRegistration(data) {
    await mockDelay();
    const req: RegistrationRequest = { id: `R-${newId()}`, ...data, submittedAt: nowISO(), status: "pending" };
    registrations = [req, ...registrations];
    return req;
  },

  async listRegistrations() {
    await mockDelay();
    return registrations.map((r) => ({ ...r }));
  },

  async findDuplicateTaxCode(taxCode, excludeId) {
    await mockDelay();
    return registrations.filter((r) => r.id !== excludeId && r.taxCode === taxCode && r.status === "approved");
  },

  async approveRegistration(id, planId) {
    await mockDelay();
    const req = registrations.find((r) => r.id === id);
    if (!req) throw new ApiError(404, "Hồ sơ không tồn tại");
    if (req.status !== "pending") throw new ApiError(409, "Hồ sơ đã được xử lý");
    if (!plans.some((p) => p.id === planId)) throw new ApiError(404, "Gói dịch vụ không tồn tại");

    const renewsAt = new Date();
    renewsAt.setMonth(renewsAt.getMonth() + 1);
    const tenant: Tenant = {
      id: `T-${newId()}`,
      name: req.businessName,
      planId,
      status: "active",
      renewsAt: renewsAt.toISOString().slice(0, 10),
      createdAt: nowISO(),
    };
    tenants = [...tenants, tenant];
    usage[tenant.id] = { branches: 0, accounts: 1 };
    ownerEmails[tenant.id] = req.contactEmail;
    req.status = "approved";
    req.approvedPlanId = planId;
    req.approvedTenantId = tenant.id;
    // Giả lập gửi email — đồ án không có dịch vụ email thật.
    console.info(`[mock email] Gửi tài khoản Owner tới ${req.contactEmail}`);
    return { tenant, ownerEmail: req.contactEmail };
  },

  async rejectRegistration(id, reason) {
    await mockDelay();
    if (!reason.trim()) throw new ApiError(400, "Phải ghi lý do từ chối");
    const req = registrations.find((r) => r.id === id);
    if (!req) throw new ApiError(404, "Hồ sơ không tồn tại");
    if (req.status !== "pending") throw new ApiError(409, "Hồ sơ đã được xử lý");
    req.status = "rejected";
    req.rejectReason = reason;
  },

  async setTenantStatus(id, status) {
    await mockDelay();
    findTenant(id).status = status;
  },

  async renewTenant(id) {
    await mockDelay();
    const tenant = findTenant(id);
    const base = new Date(tenant.renewsAt);
    const from = Number.isNaN(base.getTime()) ? new Date() : base;
    from.setMonth(from.getMonth() + 1);
    tenant.renewsAt = from.toISOString().slice(0, 10);
    tenant.status = "active";
    return { ...tenant };
  },

  async changeTenantPlan(id, planId) {
    await mockDelay();
    const tenant = findTenant(id);
    if (!plans.some((p) => p.id === planId)) throw new ApiError(404, "Gói dịch vụ không tồn tại");
    tenant.planId = planId;
    return { ...tenant };
  },

  async resetOwnerPassword(tenantId) {
    await mockDelay();
    findTenant(tenantId);
    const email = ownerEmails[tenantId];
    if (!email) throw new ApiError(404, "Không tìm thấy tài khoản Owner của doanh nghiệp này");
    return { email };
  },
};
