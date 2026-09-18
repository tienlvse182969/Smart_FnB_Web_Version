/** Service quản lý Chi nhánh và Bàn. */
import { db } from "../mock/db";
import type { Branch, FloorTable } from "../types";
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

/** Danh sách bàn theo chi nhánh. */
export async function getFloorTables(branchId: string): Promise<FloorTable[]> {
  await delay();
  return db.floorTables.filter((t) => t.branchId === branchId);
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

/** Cập nhật trạng thái bàn. */
export async function updateTableStatus(
  tableId: string,
  status: FloorTable["status"],
  currentSessionId?: string | null
): Promise<void> {
  await delay();
  const tbl = db.floorTables.find((t) => t.id === tableId);
  if (tbl) {
    tbl.status = status;
    if (currentSessionId !== undefined) {
      tbl.currentSessionId = currentSessionId;
    }
  }
}

/**
 * Branch Manager tạm khoá/mở lại bàn hỏng (mục 5.3: Trống → Tạm khoá).
 * Không cho khoá bàn đang có khách.
 */
export async function setTableLocked(tableId: string, locked: boolean): Promise<void> {
  await delay();
  const tbl = db.floorTables.find((t) => t.id === tableId);
  if (!tbl) throw new Error("Bàn không tồn tại");
  const branch = db.branches.find((b) => b.id === tbl.branchId);
  if (branch) assertTenantWritable(branch.tenantId);
  if (tbl.status === "occupied") throw new Error("Không thể khoá bàn đang có khách");
  tbl.status = locked ? "locked" : "available";
}

/** Branch Manager thiết kế sơ đồ bàn — thêm bàn mới (mục 4.5.F). */
export async function createTable(
  branchId: string,
  id: string,
  area: string,
  seats: number
): Promise<FloorTable> {
  await delay();
  const branch = db.branches.find((b) => b.id === branchId);
  if (branch) assertTenantWritable(branch.tenantId);
  if (db.floorTables.some((t) => t.id === id)) {
    throw new Error(`Bàn ${id} đã tồn tại`);
  }
  const table: FloorTable = {
    id,
    branchId,
    area,
    seats,
    status: "available",
    currentSessionId: null,
    adjacentTableIds: [],
  };
  db.floorTables.push(table);
  return table;
}

/**
 * Khai báo/gỡ quan hệ liền kề giữa 2 bàn — bắt buộc cho thuật toán ghép bàn
 * (BR-25). Cập nhật đối xứng cả hai chiều, chỉ trong cùng khu vực.
 */
export async function setAdjacent(
  tableIdA: string,
  tableIdB: string,
  linked: boolean
): Promise<void> {
  await delay();
  const a = db.floorTables.find((t) => t.id === tableIdA);
  const b = db.floorTables.find((t) => t.id === tableIdB);
  if (!a || !b) throw new Error("Bàn không tồn tại");
  const branch = db.branches.find((br) => br.id === a.branchId);
  if (branch) assertTenantWritable(branch.tenantId);
  if (a.area !== b.area) throw new Error("Chỉ ghép được bàn cùng khu vực");

  const apply = (t: FloorTable, otherId: string) => {
    const has = t.adjacentTableIds.includes(otherId);
    if (linked && !has) t.adjacentTableIds.push(otherId);
    if (!linked && has) t.adjacentTableIds = t.adjacentTableIds.filter((x) => x !== otherId);
  };
  apply(a, tableIdB);
  apply(b, tableIdA);
}
