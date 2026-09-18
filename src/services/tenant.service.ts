/** Service quản lý Tenant, Plan và Onboarding — dành cho Platform Admin. */
import { db } from "../mock/db";
import type { Plan, RegistrationRequest, Tenant, TenantStatus } from "../types";
import { createDefaultBranding } from "../theme";
import { buildAccount } from "./auth.service";
import { assertTenantWritable } from "./_guard";
import { delay, newId, nowISO } from "./_utils";

function addAudit(tenantId: string | null, actor: string, action: string, target: string) {
  db.auditLog = [
    { id: `L-${newId()}`, tenantId, time: nowISO(), actor, action, target },
    ...db.auditLog,
  ];
}

/** Danh sách toàn bộ tenant (Platform Admin). */
export async function listTenants(): Promise<Tenant[]> {
  await delay();
  return [...db.tenants];
}

/** Chi tiết một tenant theo id. */
export async function getTenant(id: string): Promise<Tenant | null> {
  await delay();
  return db.tenants.find((t) => t.id === id) ?? null;
}

/** Danh sách tất cả Plans. */
export async function listPlans(): Promise<Plan[]> {
  await delay();
  return [...db.plans];
}

/** Platform Admin tạo gói dịch vụ mới. */
export async function createPlan(data: Omit<Plan, "id">): Promise<Plan> {
  await delay();
  const plan: Plan = { id: `plan-${newId()}`, ...data };
  db.plans.push(plan);
  return plan;
}

/** Platform Admin sửa gói dịch vụ (giá, hạn mức). */
export async function updatePlan(id: string, data: Partial<Omit<Plan, "id">>): Promise<Plan> {
  await delay();
  const idx = db.plans.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Gói dịch vụ không tồn tại");
  db.plans[idx] = { ...db.plans[idx], ...data };
  return db.plans[idx];
}

// ---------------------------------------------------------------------------
// Onboarding (mục 6.1, GU-01, PA-01→PA-04)
// ---------------------------------------------------------------------------

/** GU-01: Prospective Owner nộp hồ sơ đăng ký — chưa có tài khoản. */
export async function submitRegistration(data: {
  businessName: string;
  taxCode: string;
  address: string;
  estimatedBranches: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}): Promise<RegistrationRequest> {
  await delay();
  const req: RegistrationRequest = {
    id: `R-${newId()}`,
    ...data,
    submittedAt: nowISO(),
    status: "pending",
  };
  db.registrationRequests.unshift(req);
  return req;
}

/** Danh sách yêu cầu đăng ký mới. */
export async function listRegistrations(): Promise<RegistrationRequest[]> {
  await delay();
  return [...db.registrationRequests];
}

/** Cảnh báo (không chặn) nếu mã số thuế trùng với doanh nghiệp đã có hồ sơ được duyệt. */
export async function findDuplicateTaxCode(taxCode: string, excludeId?: string): Promise<RegistrationRequest[]> {
  await delay();
  return db.registrationRequests.filter(
    (r) => r.id !== excludeId && r.taxCode === taxCode && r.status === "approved"
  );
}

/**
 * PA-02: Duyệt hồ sơ — sinh Tenant (status active), Branding mặc định
 * (isCustom=false), tài khoản Owner (mật khẩu tạm, bắt đổi ở lần đăng nhập
 * đầu). Ví doanh nghiệp không cần khởi tạo riêng — số dư luôn tính từ sổ cái
 * (BR-34), rỗng nghiễm nhiên vì chưa có bút toán nào.
 */
export async function approveRegistration(
  id: string,
  planId: string
): Promise<{ tenant: Tenant; ownerEmail: string; ownerAccountId: string }> {
  await delay();
  const req = db.registrationRequests.find((r) => r.id === id);
  if (!req) throw new Error("Hồ sơ không tồn tại");
  if (req.status !== "pending") throw new Error("Hồ sơ đã được xử lý");
  const plan = db.plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Gói dịch vụ không tồn tại");

  const tenantId = `T-${newId()}`;
  const now = nowISO();
  const renewsAt = new Date();
  renewsAt.setMonth(renewsAt.getMonth() + 1);

  const tenant: Tenant = {
    id: tenantId,
    name: req.businessName,
    planId,
    status: "active",
    renewsAt: renewsAt.toISOString().slice(0, 10),
    createdAt: now,
  };
  db.tenants.push(tenant);
  db.brandings.push(createDefaultBranding(tenantId, req.businessName));

  const ownerAccount = buildAccount({
    role: "owner",
    name: req.contactName,
    email: req.contactEmail,
    label: "Owner",
    scope: `${req.businessName} · Toàn chuỗi`,
    tenantId,
  });

  req.status = "approved";
  req.approvedPlanId = planId;
  req.approvedTenantId = tenantId;

  addAudit(null, "admin@platform.vn", "Duyệt đăng ký", `${req.businessName} (${tenantId})`);
  // Giả lập gửi email — không có dịch vụ email thật trong đồ án.
  console.info(`[mock email] Gửi tài khoản Owner tới ${ownerAccount.email}: mật khẩu tạm phải đổi ở lần đăng nhập đầu.`);

  return { tenant, ownerEmail: ownerAccount.email, ownerAccountId: ownerAccount.id };
}

/** PA-02: Từ chối hồ sơ — bắt buộc lý do (BR-04). */
export async function rejectRegistration(id: string, rejectReason: string): Promise<void> {
  await delay();
  if (!rejectReason.trim()) throw new Error("Phải ghi lý do từ chối");
  const req = db.registrationRequests.find((r) => r.id === id);
  if (!req) throw new Error("Hồ sơ không tồn tại");
  if (req.status !== "pending") throw new Error("Hồ sơ đã được xử lý");
  req.status = "rejected";
  req.rejectReason = rejectReason;
  addAudit(null, "admin@platform.vn", "Từ chối đăng ký", `${req.businessName}: ${rejectReason}`);
}

// ---------------------------------------------------------------------------
// Quản trị doanh nghiệp (PA-05→PA-07)
// ---------------------------------------------------------------------------

/** Tạm ngưng / kích hoạt lại / đánh dấu hết hạn tenant (BR-22: không khoá cứng, không xoá dữ liệu). */
export async function setTenantStatus(id: string, status: TenantStatus): Promise<void> {
  await delay();
  const tenant = db.tenants.find((t) => t.id === id);
  if (!tenant) throw new Error("Doanh nghiệp không tồn tại");
  tenant.status = status;

  const actionLabel: Record<TenantStatus, string> = {
    active: "Kích hoạt tenant",
    suspended: "Tạm ngưng tenant",
    expired: "Đánh dấu hết hạn",
  };
  addAudit(null, "admin@platform.vn", actionLabel[status], id);
}

/** Gia hạn thuê bao thêm 1 tháng — cũng chuyển tenant về active nếu đang expired. */
export async function renewTenant(id: string): Promise<Tenant> {
  await delay();
  const tenant = db.tenants.find((t) => t.id === id);
  if (!tenant) throw new Error("Doanh nghiệp không tồn tại");
  const next = new Date(tenant.renewsAt);
  const base = Number.isNaN(next.getTime()) ? new Date() : next;
  base.setMonth(base.getMonth() + 1);
  tenant.renewsAt = base.toISOString().slice(0, 10);
  tenant.status = "active";
  addAudit(null, "admin@platform.vn", "Gia hạn thuê bao", `${id} → ${tenant.renewsAt}`);
  return tenant;
}

/** Nâng/hạ gói dịch vụ. */
export async function changeTenantPlan(id: string, planId: string): Promise<Tenant> {
  await delay();
  const tenant = db.tenants.find((t) => t.id === id);
  if (!tenant) throw new Error("Doanh nghiệp không tồn tại");
  const plan = db.plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Gói dịch vụ không tồn tại");
  tenant.planId = planId;
  addAudit(null, "admin@platform.vn", "Đổi gói dịch vụ", `${id} → ${plan.name}`);
  return tenant;
}

/** Cấu hình nền tảng (feePercent, holdHours, minWithdraw). */
export async function getPlatformConfig() {
  await delay();
  return { ...db.platformConfig };
}

/**
 * Platform Admin đổi cấu hình nền tảng — KHÔNG hồi tố: mức phí/tạm giữ chỉ
 * áp cho các bút toán quyết toán SAU thời điểm đổi (BR-37: mức phí chốt vào
 * bút toán tại thời điểm thanh toán/quyết toán, không tính lại các lô đã
 * quyết toán trước đó). Ghi audit log (BR-20).
 */
export async function updatePlatformConfig(
  data: { feePercent: number; holdHours: number; minWithdraw: number },
  actorEmail: string
) {
  await delay();
  if (data.feePercent < 0 || data.feePercent > 100) throw new Error("Phí dịch vụ phải trong khoảng 0–100%");
  if (data.holdHours < 0) throw new Error("Thời gian tạm giữ không được âm");
  if (data.minWithdraw < 0) throw new Error("Mức rút tối thiểu không được âm");

  db.platformConfig = { ...data };
  addAudit(
    null,
    actorEmail,
    "Đổi cấu hình nền tảng",
    `Phí ${data.feePercent}% · Tạm giữ ${data.holdHours}h · Rút tối thiểu ${data.minWithdraw.toLocaleString("vi-VN")}đ`
  );
  return { ...db.platformConfig };
}

/** Audit log (Platform Admin). */
export async function listAuditLog() {
  await delay();
  return [...db.auditLog];
}

/** Branding của một tenant. */
export async function getBranding(tenantId: string) {
  await delay();
  return db.brandings.find((b) => b.tenantId === tenantId) ?? null;
}

/**
 * Owner lưu nhận diện riêng (BR-28/BR-29) — chỉ Owner được gọi hàm này ở
 * tầng gọi (store/UI); từ đây `isCustom = true` nên `buildTenantTheme` sẽ
 * áp màu chủ đạo/accent cho mọi tài khoản thuộc doanh nghiệp. Ghi audit log
 * (BR-20) với người thực hiện.
 */
export async function updateBranding(
  tenantId: string,
  data: { primaryColor: string; accentColor: string; displayName: string; logoUrl?: string },
  actorEmail: string
) {
  await delay();
  assertTenantWritable(tenantId);
  const branding = db.brandings.find((b) => b.tenantId === tenantId);
  if (!branding) throw new Error("Không tìm thấy doanh nghiệp");
  branding.primaryColor = data.primaryColor;
  branding.accentColor = data.accentColor;
  branding.displayName = data.displayName;
  branding.logoUrl = data.logoUrl;
  branding.isCustom = true;
  addAudit(tenantId, actorEmail, "Đổi nhận diện thương hiệu", tenantId);
  return branding;
}

/** Owner khôi phục nhận diện mặc định — quay lại đúng theme đơn sắc nền tảng. */
export async function resetBranding(tenantId: string, actorEmail: string) {
  await delay();
  assertTenantWritable(tenantId);
  const defaults = createDefaultBranding(tenantId, "");
  const branding = db.brandings.find((b) => b.tenantId === tenantId);
  if (!branding) throw new Error("Không tìm thấy doanh nghiệp");
  branding.primaryColor = defaults.primaryColor;
  branding.accentColor = defaults.accentColor;
  branding.logoUrl = undefined;
  branding.isCustom = false;
  addAudit(tenantId, actorEmail, "Khôi phục nhận diện mặc định", tenantId);
  return branding;
}
