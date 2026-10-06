/**
 * Bản real của module account — CHỈ phần Manager (OW-05), qua `/employees` của BE (role OWNER, employees.controller.ts).
 * Owner XEM Cashier/Barista cũng bằng `/employees` (OW-05). Phần Manager quản Cashier/Barista KHÔNG có endpoint ở BE
 * (api-contract-plan #24) nên chuyển rõ ràng sang mock. Tạo Manager qua lời mời không cần chủ chuỗi đặt mật khẩu.
 */
import { ApiError, request } from "../../http/client";
import { accountMock } from "./mock";
import type { StaffAccount } from "../../../types";
import { mapManager, mapManagerPage, mapStaff, type RawEmployee, type RawEmployeePage } from "./mapper";
import type { AccountApi } from "./index";

/** Khoá tài khoản = `SUSPENDED` (BE: mọi trạng thái khác ACTIVE đều khoá và thu hồi phiên; INACTIVE dành cho chưa kích hoạt). */
const LOCKED = "SUSPENDED";

export const accountReal: AccountApi = {
  // --- Manager: thật ---------------------------------------------------------------------------------------------
  async listManagers(_chainId, query = {}) {
    // BE lấy phạm vi từ token Owner (mọi chuỗi được gán) nên `_chainId` không gửi đi.
    const params = new URLSearchParams({ role: "MANAGER", page: String(query.page ?? 1), limit: String(query.limit ?? 20) });
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.status) params.set("status", query.status);
    if (query.branchId) params.set("branchId", query.branchId);
    return mapManagerPage(await request<RawEmployeePage>(`/employees?${params}`));
  },

  async setManagerActive(accountId, active) {
    await request(`/employees/${accountId}/status`, { method: "PATCH", body: { status: active ? "ACTIVE" : LOCKED } });
  },

  async resetManagerPassword(accountId) {
    const raw = await request<{ message: string; expiresAt: string }>(`/employees/${accountId}/reset-password`, { method: "POST" });
    return { expiresAt: raw.expiresAt };
  },

  async reassignManager(accountId, branchId) {
    await request(`/employees/${accountId}/branch`, { method: "PATCH", body: { branchId } });
  },

  async createManager(_chainId, branchId, name, email) {
    const raw = await request<{ account: RawEmployee; expiresAt: string }>("/employees/managers", {
      method: "POST",
      body: { branchId, name: name.trim(), email: email.trim() },
    });
    return { account: mapManager(raw.account), expiresAt: raw.expiresAt };
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

  // --- Manager quản Cashier/Barista: MOCK (chờ BE #24 — Manager bị 403 ở /employees và chưa có endpoint tạo/khoá nhân viên). ---
  // Cố ý KHÔNG gọi BE: màn Nhân viên của Manager hiện banner "Dữ liệu mẫu" và không phát sinh request hay toast lỗi nào.
  listStaff: accountMock.listStaff,
  createStaff: accountMock.createStaff,
  updateStaff: accountMock.updateStaff,
  setStaffActive: accountMock.setStaffActive,
  resetStaffPassword: accountMock.resetStaffPassword,
  getAccountQuota: accountMock.getAccountQuota,
  countAccounts: accountMock.countAccounts,
};
