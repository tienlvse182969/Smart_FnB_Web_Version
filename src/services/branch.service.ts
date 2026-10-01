/** Service quản lý Chi nhánh. */
import { db } from "../mock/db";
import type { Branch } from "../types";
import { assertTenantWritable, assertWithinBranchLimit } from "./_guard";
import { delay, newId } from "./_utils";

/** Danh sách chi nhánh theo tenant. */
export async function listBranches(tenantId?: string): Promise<Branch[]> {
  await delay();
  if (!tenantId) return [...db.branches];
  return db.branches.filter((b) => b.tenantId === tenantId);
}

/** Lấy thông tin 1 chi nhánh theo ID. */
export async function getBranch(id: string): Promise<Branch | undefined> {
  await delay();
  return db.branches.find((b) => b.id === id);
}

/** Tạo mới chi nhánh — chặn khi vượt maxBranches của gói (BR-23) hoặc tenant chỉ đọc (BR-22). */
export async function createBranch(
  tenantId: string,
  data: Omit<Branch, "id" | "tenantId">
): Promise<Branch> {
  await delay();
  assertTenantWritable(tenantId);
  assertWithinBranchLimit(tenantId);
  const newBranch: Branch = {
    id: `BR-${newId()}`,
    tenantId,
    ...data,
  };
  db.branches.push(newBranch);
  return newBranch;
}

/** Cập nhật chi nhánh. */
export async function updateBranch(
  id: string,
  data: Partial<Branch>
): Promise<Branch> {
  await delay();
  const idx = db.branches.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error("Chi nhánh không tồn tại");
  assertTenantWritable(db.branches[idx].tenantId);
  db.branches[idx] = { ...db.branches[idx], ...data };
  return db.branches[idx];
}

