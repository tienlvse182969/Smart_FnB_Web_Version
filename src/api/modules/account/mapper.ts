/**
 * Mapper whitelist cho `GET /employees` (Owner). Chỉ chép các trường của `ManagerAccount`; mọi trường khác của BE
 * (`phone`, `jobTitle`, `hireDate`, `createdAt`, `user.id`, và bất cứ thứ gì BE thêm sau này) bị bỏ, kể cả token hay mã băm.
 */
import type { AccountStatus, ManagerAccount, ManagerPage } from "../../../types";

export interface RawEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  branch: { id: string; name: string };
  user: { email: string; status: string; lastLoginAt: string | null; role: { code: string } };
}

export interface RawEmployeePage {
  items: RawEmployee[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const STATUSES: AccountStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

/** Trạng thái lạ của BE coi như chưa kích hoạt (không bao giờ mở nút Khoá/Mở khoá). */
const toStatus = (raw: string): AccountStatus => (STATUSES.includes(raw as AccountStatus) ? (raw as AccountStatus) : "INACTIVE");

export function mapManager(raw: RawEmployee): ManagerAccount {
  return {
    id: raw.id,
    employeeCode: raw.employeeCode,
    name: `${raw.firstName} ${raw.lastName}`.trim(),
    email: raw.user.email,
    status: toStatus(raw.user.status),
    lastLoginAt: raw.user.lastLoginAt ?? null,
    branchId: raw.branch.id,
    branchName: raw.branch.name,
  };
}

export function mapManagerPage(raw: RawEmployeePage): ManagerPage {
  const { page, limit, total, totalPages } = raw.pagination;
  return { items: raw.items.map(mapManager), pagination: { page, limit, total, totalPages } };
}
