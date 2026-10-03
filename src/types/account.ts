/**
 * Tài khoản Branch Manager do Owner quản (OW-05), bám `GET /employees` của BE (employees.service.ts `employeeSelect`).
 * Chỉ giữ trường màn hình cần: KHÔNG có token, mã băm hay trường lạ — mapper (`api/modules/account/mapper.ts`) là whitelist.
 */
import type { Paginated } from "./admin";

/** Trạng thái tài khoản của BE (`UserStatus`): khoá = SUSPENDED; INACTIVE là chưa kích hoạt (chưa đặt mật khẩu). */
export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type ManagerAccount = {
  /** `employeeId` — dùng cho `/employees/{id}/...`. */
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  status: AccountStatus;
  lastLoginAt: string | null;
  branchId: string;
  branchName: string;
};

export type ManagerQuery = {
  page?: number;
  limit?: number;
  /** BE khớp tên, mã nhân viên hoặc email. */
  search?: string;
  status?: AccountStatus;
  branchId?: string;
};

export type ManagerPage = Paginated<ManagerAccount>;

/** Cashier/Barista cho Owner XEM (OW-05: Owner không tạo/sửa), cùng whitelist như `ManagerAccount`. */
export type StaffAccount = Omit<ManagerAccount, "lastLoginAt"> & { role: "Cashier" | "Barista" };

/**
 * Manager quản Cashier/Barista của CHI NHÁNH MÌNH (BM-01) — MOCK, BE chưa có endpoint (api-contract-plan #24).
 * Shape bám model Prisma: `User` (email, phone?, status, lastLoginAt, role) + `Employee` (employeeCode, firstName, lastName,
 * branchId) — schema.prisma:252-278, 448-461. Không có trường ngoài model. Họ tên = `firstName lastName` (cùng quy ước
 * `employeeSelect` của BE); trạng thái "chờ đặt mật khẩu" = `User.status = INACTIVE` (BE đổi sang ACTIVE khi đặt mật khẩu xong).
 */
export type StaffRole = "CASHIER" | "BARISTA";

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = { CASHIER: "Cashier", BARISTA: "Barista" };

export type StaffEmployee = {
  /** `employeeId`. */
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  status: AccountStatus;
  lastLoginAt: string | null;
  branchId: string;
};

/** Tạo nhân viên: KHÔNG có mật khẩu — BE xếp email đặt mật khẩu một lần. Vai trò quyết lúc tạo, đặc tả không nói đổi vai trò. */
export type StaffInput = { firstName: string; lastName: string; email: string; phone?: string; role: StaffRole };

/** Sửa nhân viên: chỉ họ tên và điện thoại (email là tên đăng nhập, vai trò không đổi). */
export type StaffPatch = { firstName?: string; lastName?: string; phone?: string | null };

export type StaffQuery = { role?: StaffRole; search?: string; status?: AccountStatus; page?: number; limit?: number };

export type StaffPage = Paginated<StaffEmployee>;

/** Số tài khoản đang tính vào hạn mức gói (đặc tả 13.1: mọi tài khoản đang hoạt động của doanh nghiệp, tài khoản khoá không tính). */
export type AccountQuota = { used: number; limit: number | null };
