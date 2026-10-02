/**
 * Bản real của module account — CHỈ phần Manager (OW-05), qua `/employees` của BE (role OWNER, employees.controller.ts).
 * Phần Cashier/Barista KHÔNG có endpoint ở BE (api-contract-plan #24) nên chuyển rõ ràng sang mock; tạo Manager cũng chờ BE
 * (#23: `POST /auth/managers` bắt buộc mật khẩu, web không còn mật khẩu).
 */
import { ApiError, request } from "../../http/client";
import { accountMock } from "./mock";
import { mapManagerPage, type RawEmployeePage } from "./mapper";
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

  async createManager() {
    // CHỜ BE #23: POST /auth/managers bắt buộc `password`. Màn hình khoá nút ở chế độ real; đây là chốt chặn thứ hai.
    throw new ApiError(501, "Chờ BE gửi email thay vì đặt mật khẩu (api-contract-plan #23).");
  },

  // --- Cashier/Barista: MOCK (chờ BE #24 — Manager chưa có endpoint tạo/liệt kê/khoá nhân viên; 5.4 làm tiếp) ---------
  listStaffAccounts: accountMock.listStaffAccounts,
  listStaff: accountMock.listStaff,
  createStaff: accountMock.createStaff,
  setStaffActive: accountMock.setStaffActive,
  countAccounts: accountMock.countAccounts,
};
