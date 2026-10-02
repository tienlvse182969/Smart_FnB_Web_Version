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
