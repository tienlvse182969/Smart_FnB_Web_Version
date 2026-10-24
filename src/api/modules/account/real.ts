/**
 * Bản real của module account.
 * - Manager (OW-05): `/employees` của BE (role OWNER, employees.controller.ts); tạo Manager qua lời mời, không mật khẩu.
 * - Cashier/Barista cho Owner XEM: `GET /employees?role=…`.
 * - Cashier/Barista cho Manager quản (BM-01, #24, từ 7.4c): `/manager/staff*` (BE `d98b4c1`, `branch-manager.controller.ts:48-108`,
 *   `manager-staff.service.ts`). Chi nhánh lấy từ JWT nên `branchId`/`chainId` KHÔNG gửi đi; BE bật `forbidNonWhitelisted` nên body CHỈ
 *   gồm trường của DTO (không `password`, không `branchId`).
 */
import { ApiError, request } from "../../http/client";
import { accountMock } from "./mock";
import type { StaffAccount, StaffEmployee } from "../../../types";
import { mapManager, mapManagerPage, mapStaff, mapStaffEmployee, mapStaffPage, type RawEmployee, type RawEmployeePage, type RawStaff, type RawStaffPage } from "./mapper";
import { validateStaffReason } from "./staffRules";
import type { AccountApi } from "./index";

/** Khoá tài khoản = `SUSPENDED` (BE: mọi trạng thái khác ACTIVE đều khoá và thu hồi phiên; INACTIVE dành cho chưa kích hoạt). */
const LOCKED = "SUSPENDED";

/** `reason` bắt buộc 3–500 ký tự (`ManagerStaffStatusDto`/`ManagerResetPasswordDto`); kiểm trước để không gửi request chắc chắn 400. */
function assertReason(reason: string | undefined): string {
  const error = validateStaffReason(reason ?? "");
  if (error) throw new ApiError(400, error, [error]);
  return (reason as string).trim();
}

export const accountReal: AccountApi = {
  async inviteAccount(_chainId, input) {
    const raw = await request<{ account: RawEmployee; invitationExpiresAt: string; emailStatus?: "SENT" | "PENDING" | "FAILED" }>("/employees/invitations", {
      method: "POST", body: { name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, branchId: input.branchId },
    });
    return { account: mapManager(raw.account), expiresAt: raw.invitationExpiresAt, emailStatus: raw.emailStatus };
  },

  async setDirectPassword(accountId, password) {
    await request(`/employees/${accountId}/password`, { method: "PATCH", body: { password } });
  },
  // --- Manager: thật ---------------------------------------------------------------------------------------------
  async listManagers(_chainId, query = {}) {
    // BE lấy phạm vi từ token Owner (mọi chuỗi được gán) nên `_chainId` không gửi đi.
    const params = new URLSearchParams({ role: "MANAGER", page: String(query.page ?? 1), limit: String(query.limit ?? 20) });
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.status) params.set("status", query.status);
    if (query.branchId) params.set("branchId", query.branchId);
    return mapManagerPage(await request<RawEmployeePage>(`/employees?${params}`));
  },

  async setManagerActive(accountId, active, reason) {
    await request(`/employees/${accountId}/status`, { method: "PATCH", body: { status: active ? "ACTIVE" : LOCKED, reason: assertReason(reason) } });
  },

  async resetManagerPassword(accountId, reason, pending = false) {
    const raw = await request<{ expiresAt: string; emailStatus?: "SENT" | "PENDING" | "FAILED" }>(`/employees/${accountId}/${pending ? "invitation/resend" : "reset-password"}`, { method: "POST", body: { reason: assertReason(reason) } });
    return { expiresAt: raw.expiresAt, emailStatus: raw.emailStatus };
  },

  async reassignManager(accountId, branchId) {
    await request(`/employees/${accountId}/branch`, { method: "PATCH", body: { branchId } });
  },

  async createManager(_chainId, branchId, name, email) {
    const raw = await request<{ account: RawEmployee; invitationExpiresAt: string; emailStatus?: "SENT" | "PENDING" | "FAILED" }>("/employees/managers", {
      method: "POST",
      body: { branchId, name: name.trim(), email: email.trim() },
    });
    return { account: mapManager(raw.account), expiresAt: raw.invitationExpiresAt, emailStatus: raw.emailStatus };
  },

  // --- Cashier/Barista: Owner XEM thật (OW-05: Owner chỉ xem; `GET /employees?role=…` mở cho OWNER) --------------------
  async listStaffAccounts() {
    const all: StaffAccount[] = [];
    for (const role of ["CASHIER", "BARISTA"]) {
      for (let page = 1; ; page += 1) {
        const raw = await request<RawEmployeePage>(`/employees?${new URLSearchParams({ role, page: String(page), limit: "100" })}`);
        all.push(...raw.items.flatMap((e) => mapStaff(e) ?? []));
        if (page >= raw.pagination.totalPages) break;
      }
    }
    return all;
  },

  // --- Manager quản Cashier/Barista: THẬT (`/manager/staff*`, #24) ---------------------------------------------------
  async listStaff(_chainId, _branchId, query = {}) {
    // BE chỉ cho `limit` ≤ 100 (`ManagerPageDto`); màn không phân trang nên lấy trang đầu 100 dòng.
    const params = new URLSearchParams({ page: String(query.page ?? 1), limit: String(Math.min(query.limit ?? 100, 100)) });
    if (query.role) params.set("role", query.role);
    if (query.status) params.set("status", query.status);
    if (query.search?.trim()) params.set("search", query.search.trim());
    return mapStaffPage(await request<RawStaffPage>(`/manager/staff?${params}`));
  },

  async createStaff(_chainId, _branchId, input) {
    // `ManagerCreateStaffDto` = CreateStaffDto bỏ role/branchId/password + role Cashier|Barista. Ô tuỳ chọn trống thì không gửi.
    const body: Record<string, unknown> = {
      email: input.email.trim(),
      role: input.role,
      employeeCode: input.employeeCode.trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
    };
    if (input.phone?.trim()) body.phone = input.phone.trim();
    const raw = await request<RawStaff & { invitationExpiresAt: string; emailStatus?: string }>("/manager/staff", { method: "POST", body });
    const staff = mapStaffEmployee(raw) as StaffEmployee;
    const emailStatus = raw.emailStatus === "SENT" || raw.emailStatus === "FAILED" || raw.emailStatus === "PENDING" ? raw.emailStatus : undefined;
    return { staff, expiresAt: raw.invitationExpiresAt, emailStatus };
  },

  async updateStaff(_chainId, _branchId, staffId, patch) {
    // BE `fb7cae9` (#63): chỉ `phone` nhận `null` để xoá số điện thoại (các trường khác null → 400); chuỗi rỗng bị BE bỏ qua nên gửi null.
    const body: Record<string, unknown> = {};
    if (patch.firstName !== undefined) body.firstName = patch.firstName.trim();
    if (patch.lastName !== undefined) body.lastName = patch.lastName.trim();
    if (patch.phone !== undefined) body.phone = patch.phone && patch.phone.trim() ? patch.phone.trim() : null;
    const raw = await request<RawStaff>(`/manager/staff/${staffId}`, { method: "PATCH", body });
    return mapStaffEmployee(raw) as StaffEmployee;
  },

  async setStaffActive(_chainId, _branchId, staffId, active, reason) {
    await request(`/manager/staff/${staffId}/status`, { method: "PATCH", body: { status: active ? "ACTIVE" : LOCKED, reason: assertReason(reason) } });
  },

  async cancelStaffInvitation(_chainId, _branchId, staffId, reason) {
    await request(`/manager/staff/${encodeURIComponent(staffId)}/invitation/cancel`, { method: "POST", body: { reason: assertReason(reason) } });
  },

  async resetStaffPassword(_chainId, _branchId, staffId, reason) {
    const raw = await request<{ message: string; employeeId: string; expiresAt: string; emailStatus?: string }>(`/manager/staff/${staffId}/reset-password`, {
      method: "POST",
      body: { reason: assertReason(reason) },
    });
    const emailStatus = raw.emailStatus === "SENT" || raw.emailStatus === "FAILED" || raw.emailStatus === "PENDING" ? raw.emailStatus : undefined;
    return { expiresAt: raw.expiresAt, emailStatus };
  },

  // Hạn mức: ở real màn Nhân viên đọc GÓI THẬT trong store (`plan.limits`, quyết định 54); hai hàm dưới chỉ phục vụ mock gói khi
  // cờ plan=mock mà account=real (cấu hình lai) — không gọi BE.
  getAccountQuota: accountMock.getAccountQuota,
  countAccounts: accountMock.countAccounts,
};
