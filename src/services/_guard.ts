/**
 * Kiểm tra dùng chung cho lớp service — cách ly tenant, chế độ chỉ đọc
 * (BR-22) và hạn mức gói (BR-23). Chặn ở ĐÂY (service), không chỉ ẩn nút ở
 * frontend. Không export qua `services/index.ts` — chỉ service khác gọi.
 */
import { db } from "../mock/db";

/**
 * BR-22: doanh nghiệp `suspended`/`expired` chuyển chế độ chỉ đọc — mọi thao
 * tác GHI dữ liệu vận hành (bàn, order, menu, thanh toán, nhân sự...) bị
 * chặn. Rút tiền (ví) KHÔNG áp guard này — Owner vẫn rút được số dư khả dụng.
 */
export function assertTenantWritable(tenantId: string): void {
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (tenant && (tenant.status === "suspended" || tenant.status === "expired")) {
    throw new Error(
      "Doanh nghiệp đang ở chế độ chỉ đọc (tạm ngưng/hết hạn) — không thể ghi dữ liệu (BR-22)"
    );
  }
}

export function getTenantOrThrow(tenantId: string) {
  const tenant = db.tenants.find((t) => t.id === tenantId);
  if (!tenant) throw new Error("Doanh nghiệp không tồn tại");
  return tenant;
}

/** BR-23: chặn ở service khi vượt `maxBranches` của gói — không chỉ ẩn nút. */
export function assertWithinBranchLimit(tenantId: string): void {
  const tenant = getTenantOrThrow(tenantId);
  const plan = db.plans.find((p) => p.id === tenant.planId);
  if (!plan) return;
  const count = db.branches.filter((b) => b.tenantId === tenantId).length;
  if (count >= plan.maxBranches) {
    throw new Error(
      `Đã đạt giới hạn ${plan.maxBranches} chi nhánh của gói ${plan.name} — nâng gói để thêm chi nhánh`
    );
  }
}

/** BR-23: chặn ở service khi vượt `maxAccounts` của gói (tính chung mọi vai trò). */
export function assertWithinAccountLimit(tenantId: string): void {
  const tenant = getTenantOrThrow(tenantId);
  const plan = db.plans.find((p) => p.id === tenant.planId);
  if (!plan) return;
  const count = db.demoAccounts.filter((a) => a.tenantId === tenantId && a.active).length;
  if (count >= plan.maxAccounts) {
    throw new Error(
      `Đã đạt giới hạn ${plan.maxAccounts} tài khoản của gói ${plan.name} — nâng gói để thêm tài khoản`
    );
  }
}
