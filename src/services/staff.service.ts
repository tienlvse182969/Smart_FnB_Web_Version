/**
 * Service quản lý Nhân viên chi nhánh (BM-01).
 *
 * Tạm dùng `StaffLegacy` từ `mock/db.ts` làm bản ghi tài khoản theo chi nhánh.
 * `createStaffAccount` tạo đồng thời một `StaffLegacy` (roster hiển thị ở
 * StaffTable) và một `DemoAccount`, cùng chung `id`. Sẽ thay bằng API thật khi
 * backend có endpoint Manager tạo thu ngân/pha chế.
 */
import { db, type StaffLegacy } from "../mock/db";
import { buildAccount } from "./auth.service";
import { assertTenantWritable, assertWithinAccountLimit } from "./_guard";
import { delay } from "./_utils";

export type { StaffLegacy };

/** Danh sách nhân viên của một chi nhánh. */
export async function listStaff(branchId: string): Promise<StaffLegacy[]> {
  await delay();
  return db.staffLegacy.filter((s) => s.branchId === branchId);
}

/**
 * Branch Manager tạo tài khoản Waiter/Kitchen cho chi nhánh mình (BM-08).
 * Owner không tạo được tài khoản này — chỉ xem danh sách (mục 4.4.C).
 * Chặn khi vượt `maxAccounts` của gói (BR-23) hoặc tenant chỉ đọc (BR-22).
 */
export async function createStaffAccount(
  tenantId: string,
  branchId: string,
  name: string,
  email: string,
  role: "Waiter" | "Kitchen"
): Promise<StaffLegacy> {
  await delay();
  assertTenantWritable(tenantId);
  assertWithinAccountLimit(tenantId);

  const account = buildAccount({
    role: role === "Waiter" ? "waiter" : "kitchen",
    name,
    email,
    label: role === "Waiter" ? "Waiter" : "Kitchen Staff",
    scope: branchId,
    tenantId,
    branchId,
  });

  const staffMember: StaffLegacy = {
    id: account.id,
    tenantId,
    branchId,
    name,
    email,
    role,
    active: true,
  };
  db.staffLegacy.push(staffMember);
  return staffMember;
}

/** Khoá/mở khoá tài khoản khi nhân viên nghỉ việc — đồng bộ với DemoAccount để chặn đăng nhập. */
export async function setStaffActive(id: string, active: boolean): Promise<void> {
  await delay();
  const s = db.staffLegacy.find((x) => x.id === id);
  if (!s) throw new Error("Nhân viên không tồn tại");
  assertTenantWritable(s.tenantId);
  s.active = active;

  const account = db.demoAccounts.find((a) => a.id === id);
  if (account) account.active = active;
}
