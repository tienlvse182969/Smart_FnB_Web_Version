/**
 * Mapper whitelist cho `GET /employees` (Owner). Chỉ chép các trường của `ManagerAccount`; mọi trường khác của BE
 * (`phone`, `jobTitle`, `hireDate`, `createdAt`, `user.id`, và bất cứ thứ gì BE thêm sau này) bị bỏ, kể cả token hay mã băm.
 */
import type { AccountStatus, ManagerAccount, ManagerPage, StaffAccount, StaffEmployee, StaffPage } from "../../../types";

export interface RawEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  branch?: { id: string; name: string };
  branchId?: string;
  user: { email: string; status: string; lastLoginAt: string | null; role: { code: string }; staffInvitationState?: string | null; passwordSetupTokens?: { expiresAt: string }[] };
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
    branchId: raw.branch?.id ?? raw.branchId ?? "",
    branchName: raw.branch?.name ?? "",
    invitationState: raw.user.staffInvitationState === "PENDING" || raw.user.staffInvitationState === "ACCEPTED" || raw.user.staffInvitationState === "CANCELLED" ? raw.user.staffInvitationState : null,
    invitationExpiresAt: raw.user.passwordSetupTokens?.[0]?.expiresAt ?? null,
  };
}

/** Cashier/Barista của `GET /employees?role=…`; vai trò lấy từ `user.role.code` (vai trò khác bị bỏ khỏi danh sách). */
export function mapStaff(raw: RawEmployee): StaffAccount | null {
  const role = raw.user.role.code === "CASHIER" ? "Cashier" : raw.user.role.code === "BARISTA" ? "Barista" : null;
  if (!role) return null;
  const { lastLoginAt: _drop, ...account } = mapManager(raw);
  return { ...account, role };
}

/**
 * `GET /manager/staff` của Branch Manager (BE `manager-staff.service.ts` `staffSelect`): khác `/employees` của Owner — không có
 * `branch`, không có `user.lastLoginAt`, phân trang phẳng `{ items, total, page, limit }`, có `user.phone`.
 */
export interface RawStaff {
  id: string;
  branchId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  user: { email: string; phone: string | null; status: string; lastLoginAt?: string | null; role: { code: string } };
  /** BE `fb7cae9` (#64). */
  invitationStatus?: string;
  invitationExpiresAt?: string | null;
}

export interface RawStaffPage {
  items: RawStaff[];
  total: number;
  page: number;
  limit: number;
}

/** Vai trò khác CASHIER/BARISTA không thể có ở endpoint này; nếu BE trả thì bỏ dòng (null). */
export function mapStaffEmployee(raw: RawStaff): StaffEmployee | null {
  const role = raw.user.role.code;
  if (role !== "CASHIER" && role !== "BARISTA") return null;
  return {
    id: raw.id,
    employeeCode: raw.employeeCode,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.user.email,
    phone: raw.user.phone ?? null,
    role,
    status: toStatus(raw.user.status),
    // BE `fb7cae9` (#62) trả `user.lastLoginAt` (null = chưa từng đăng nhập).
    lastLoginAt: typeof raw.user.lastLoginAt === "string" ? raw.user.lastLoginAt : null,
    branchId: raw.branchId,
    invitationStatus: toInvitationStatus(raw.invitationStatus),
    invitationExpiresAt: typeof raw.invitationExpiresAt === "string" ? raw.invitationExpiresAt : null,
  };
}

const INVITATION_STATUSES = ["ACTIVE", "SUSPENDED", "INVITED", "INVITATION_EXPIRED", "DEACTIVATED", "CANCELLED"] as const;
function toInvitationStatus(v: unknown): (typeof INVITATION_STATUSES)[number] | null {
  return typeof v === "string" && (INVITATION_STATUSES as readonly string[]).includes(v) ? (v as (typeof INVITATION_STATUSES)[number]) : null;
}

export function mapStaffPage(raw: RawStaffPage): StaffPage {
  const limit = raw.limit > 0 ? raw.limit : 1;
  return {
    items: raw.items.flatMap((e) => mapStaffEmployee(e) ?? []),
    pagination: { page: raw.page, limit: raw.limit, total: raw.total, totalPages: Math.max(1, Math.ceil(raw.total / limit)) },
  };
}

export function mapManagerPage(raw: RawEmployeePage): ManagerPage {
  const { page, limit, total, totalPages } = raw.pagination;
  return { items: raw.items.map(mapManager), pagination: { page, limit, total, totalPages } };
}
