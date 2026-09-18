/**
 * Service quản lý Nhân viên chi nhánh (mục 4.5.H, BM-08).
 *
 * TẠM DÙNG `StaffLegacy` từ `mock/db.ts` làm bản ghi tài khoản Waiter/Kitchen
 * theo chi nhánh (`onShift`/`active` là cờ đơn giản, không phải lượt làm việc
 * thật). ĐÂY KHÔNG PHẢI MÔ HÌNH CUỐI CÙNG — ở bước 7 (ca làm), việc "đang
 * trong ca" sẽ chuyển sang tính từ `WorkSession` (check-in/out thật, có mốc
 * thời gian, gắn `ShiftAssignment`/`ShiftTemplate` — xem `types/shift.ts` và
 * `shift.service.ts`), và service này sẽ được refactor hoặc thu hẹp lại chỉ
 * còn quản lý thông tin tài khoản (tên, email, khoá/mở khoá), không tự ý
 * chuyển ngay bây giờ để tránh phá luồng Branch Manager vừa migrate.
 *
 * `createStaffAccount` tạo ĐỒNG THỜI một `StaffLegacy` (roster hiển thị ở
 * StaffTable) và một `DemoAccount` thật (để Waiter/Kitchen đăng nhập được —
 * BM-08), cùng chung `id`.
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
    onShift: false,
    active: true,
  };
  db.staffLegacy.push(staffMember);
  return staffMember;
}

/** Check-in / check-out — do Branch Manager thao tác (BR-42), không phải nhân viên tự làm. */
export async function setStaffShift(id: string, onShift: boolean): Promise<void> {
  await delay();
  const s = db.staffLegacy.find((x) => x.id === id);
  if (!s) throw new Error("Nhân viên không tồn tại");
  assertTenantWritable(s.tenantId);
  s.onShift = onShift;
}

/** Khoá/mở khoá tài khoản khi nhân viên nghỉ việc — đồng bộ với DemoAccount để chặn đăng nhập. */
export async function setStaffActive(id: string, active: boolean): Promise<void> {
  await delay();
  const s = db.staffLegacy.find((x) => x.id === id);
  if (!s) throw new Error("Nhân viên không tồn tại");
  assertTenantWritable(s.tenantId);
  s.active = active;
  if (!active) s.onShift = false;

  const account = db.demoAccounts.find((a) => a.id === id);
  if (account) account.active = active;
}
