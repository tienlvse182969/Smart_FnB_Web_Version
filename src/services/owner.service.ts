/** Service dành riêng cho thao tác của Owner trên tài khoản cấp dưới (mục 4.4.C, OW-05/06). */
import { db } from "../mock/db";
import type { DemoAccount } from "../types";
import { buildAccount } from "./auth.service";
import { assertTenantWritable, assertWithinAccountLimit } from "./_guard";
import { delay } from "./_utils";

/** Danh sách tài khoản Branch Manager của doanh nghiệp. */
export async function listManagerAccounts(tenantId: string): Promise<DemoAccount[]> {
  await delay();
  return db.demoAccounts.filter((a) => a.tenantId === tenantId && a.role === "manager");
}

/**
 * Owner tạo tài khoản Branch Manager (OW-05) — cho phép nhiều tài khoản
 * cùng chi nhánh (trực ca). Chặn khi vượt maxAccounts (BR-23) hoặc tenant
 * chỉ đọc (BR-22).
 */
export async function createManagerAccount(
  tenantId: string,
  branchId: string,
  name: string,
  email: string
): Promise<DemoAccount> {
  await delay();
  assertTenantWritable(tenantId);
  assertWithinAccountLimit(tenantId);
  return buildAccount({
    role: "manager",
    name,
    email,
    label: "Branch Manager",
    scope: branchId,
    tenantId,
    branchId,
  });
}

/** Owner chỉ XEM danh sách Waiter/Kitchen — không tạo/sửa được (mục 4.4.C). */
export async function listStaffAccountsForOwner(tenantId: string): Promise<DemoAccount[]> {
  await delay();
  return db.demoAccounts.filter(
    (a) => a.tenantId === tenantId && (a.role === "waiter" || a.role === "kitchen")
  );
}
