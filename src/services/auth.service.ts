/** Service xác thực — quản lý DemoAccount (mọi tài khoản đăng nhập được) và AuthUser. */
import { db } from "../mock/db";
import type { DemoAccount } from "../types";
import { DEFAULT_PASSWORD } from "../types";
import { delay, newId } from "./_utils";

/** Lấy danh sách mọi tài khoản đăng nhập được (màn chọn tài khoản). */
export async function getDemoAccounts(): Promise<DemoAccount[]> {
  await delay();
  return [...db.demoAccounts];
}

/** Đổi mật khẩu — dùng cho bắt buộc ở lần đăng nhập đầu (CM-01) và đổi tự nguyện. */
export async function changePassword(accountId: string, newPassword: string): Promise<void> {
  await delay();
  const account = db.demoAccounts.find((a) => a.id === accountId);
  if (!account) throw new Error("Tài khoản không tồn tại");
  if (newPassword.trim().length < 6) throw new Error("Mật khẩu phải từ 6 ký tự trở lên");
  account.password = newPassword;
  account.mustChangePassword = false;
}

/** Admin/Owner/Manager đặt lại mật khẩu tài khoản cấp dưới — về mặc định, bắt đổi ở lần đăng nhập tới. */
export async function resetPassword(accountId: string): Promise<void> {
  await delay();
  const account = db.demoAccounts.find((a) => a.id === accountId);
  if (!account) throw new Error("Tài khoản không tồn tại");
  account.password = DEFAULT_PASSWORD;
  account.mustChangePassword = true;
}

/** Khoá / mở khoá một tài khoản. */
export async function setAccountActive(accountId: string, active: boolean): Promise<void> {
  await delay();
  const account = db.demoAccounts.find((a) => a.id === accountId);
  if (!account) throw new Error("Tài khoản không tồn tại");
  account.active = active;
}

/** Chuyển tài khoản (Manager/Cashier/Barista) sang chi nhánh khác (OW-05). */
export async function reassignAccountBranch(accountId: string, branchId: string): Promise<void> {
  await delay();
  const account = db.demoAccounts.find((a) => a.id === accountId);
  if (!account) throw new Error("Tài khoản không tồn tại");
  account.branchId = branchId;
}

/**
 * Tạo tài khoản mới — mật khẩu mặc định, bắt đổi ở lần đăng nhập đầu.
 * Dùng chung cho: Admin duyệt hồ sơ (Owner), Owner tạo Manager, Manager tạo
 * Cashier/Barista. Không export hạn mức gói ở đây — caller tự kiểm tra bằng
 * `_guard.ts#assertWithinAccountLimit` TRƯỚC khi gọi hàm này.
 */
export function buildAccount(
  partial: Omit<DemoAccount, "id" | "password" | "mustChangePassword" | "active">
): DemoAccount {
  const account: DemoAccount = {
    id: `ACC-${newId()}`,
    password: DEFAULT_PASSWORD,
    mustChangePassword: true,
    active: true,
    ...partial,
  };
  db.demoAccounts.push(account);
  return account;
}

/** Đếm số tài khoản đang hoạt động của một doanh nghiệp (mọi vai trò) — dùng hiển thị hạn mức. */
export async function countTenantAccounts(tenantId: string): Promise<number> {
  await delay();
  return db.demoAccounts.filter((a) => a.tenantId === tenantId && a.active).length;
}

/** Lấy Branding của tenant đang đăng nhập (dùng cho ConfigProvider). */
export async function getTenantBranding(tenantId: string | null) {
  await delay(50); // nhanh hơn vì gọi ngay khi login
  if (!tenantId) return null;
  return db.brandings.find((b) => b.tenantId === tenantId) ?? null;
}
