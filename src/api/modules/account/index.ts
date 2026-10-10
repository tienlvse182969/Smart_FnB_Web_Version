/**
 * Module account — tài khoản Manager/Cashier/Barista (OW-05, BM-01).
 * - Manager (Owner quản): REAL qua `/employees` của BE, gồm lời mời tạo tài khoản.
 * - Cashier/Barista: Owner XEM bằng real (`/employees`, 5.3b); Manager quản (liệt kê, tạo, sửa, khoá, gửi lại email) là MOCK
 *   (5.4), BE chưa có endpoint (api-contract-plan #24 — shape ở đó). Mock lưu qua F5 (`persist.ts`).
 * Mỗi tầng chỉ tạo tài khoản tầng ngay dưới: Owner tạo Manager, Manager tạo Cashier/Barista (BR-05).
 */
import type {
  AccountQuota,
  ManagerAccount,
  ManagerPage,
  ManagerQuery,
  PasswordSetupNotice,
  StaffAccount,
  StaffEmployee,
  StaffInput,
  StaffPage,
  StaffPatch,
  StaffQuery,
} from "../../../types";
import { defineApi } from "../../define";
import { accountMock } from "./mock";
import { accountReal } from "./real";

export interface AccountApi {
  // --- Manager (Owner) ---------------------------------------------------------------------------------------------
  /** Phân trang/tìm kiếm/lọc phía server (BE `GET /employees?role=MANAGER`). */
  listManagers(chainId: string, query?: ManagerQuery): Promise<ManagerPage>;
  /** Không có mật khẩu: tài khoản mới nhận email đặt mật khẩu một lần. */
  createManager(chainId: string, branchId: string, name: string, email: string): Promise<{ account: ManagerAccount } & PasswordSetupNotice>;
  /** Khoá/mở khoá (`PATCH /employees/{id}/status`); khoá thu hồi mọi phiên của Manager. */
  setManagerActive(accountId: string, active: boolean): Promise<void>;
  /** Thu hồi phiên và xếp email đặt mật khẩu mới (`POST /employees/{id}/reset-password`, hiệu lực 24 giờ). */
  resetManagerPassword(accountId: string): Promise<PasswordSetupNotice>;
  /** Chuyển Manager sang chi nhánh khác của cùng chuỗi (`PATCH /employees/{id}/branch`); Manager phải đăng nhập lại. */
  reassignManager(accountId: string, branchId: string): Promise<void>;

  // --- Cashier/Barista (mock, chờ BE #24) --------------------------------------------------------------------------
  /** Owner chỉ XEM Cashier/Barista, không tạo/sửa (OW-05). Real: `GET /employees?role=CASHIER|BARISTA`. */
  listStaffAccounts(chainId: string): Promise<StaffAccount[]>;
  /** Nhân viên (Cashier/Barista) CỦA CHI NHÁNH `branchId` — Manager chỉ thấy chi nhánh mình (BR-02). Lọc vai trò/tìm kiếm/trạng thái. */
  listStaff(chainId: string, branchId: string, query?: StaffQuery): Promise<StaffPage>;
  /**
   * Tạo nhân viên: KHÔNG mật khẩu, trạng thái chờ đặt mật khẩu (INACTIVE), email xếp một lần. Lỗi: 400 sai dữ liệu, 409 email trùng,
   * 409 `PLAN_LIMIT_REACHED` đủ hạn mức tài khoản (kèm gói gợi ý), 403 hết hạn gói.
   */
  createStaff(chainId: string, branchId: string, input: StaffInput): Promise<{ staff: StaffEmployee } & PasswordSetupNotice>;
  /** Sửa họ tên và điện thoại (email là tên đăng nhập, vai trò không đổi). */
  updateStaff(chainId: string, branchId: string, staffId: string, patch: StaffPatch): Promise<StaffEmployee>;
  /** Khoá (thu hồi phiên) / mở khoá. Mở khoá cũng bị chặn khi đủ hạn mức vì tài khoản khoá không tính (13.1). */
  setStaffActive(chainId: string, branchId: string, staffId: string, active: boolean): Promise<void>;
  /** Thu hồi phiên và xếp lại email đặt mật khẩu một lần (hiệu lực 24 giờ). */
  resetStaffPassword(chainId: string, branchId: string, staffId: string): Promise<PasswordSetupNotice>;
  /** Đã dùng / tối đa của hạn mức tài khoản (mock theo kịch bản gói). Đếm CẢ DOANH NGHIỆP (Owner, Manager, Cashier, Barista), trừ tài khoản khoá. */
  getAccountQuota(chainId: string): Promise<AccountQuota>;
  /** Số tài khoản đang hoạt động của doanh nghiệp (Owner + Manager + Cashier + Barista — mục 13.1). */
  countAccounts(chainId: string): Promise<number>;
}

export const accountApi = defineApi<AccountApi>("account", { real: accountReal, mock: accountMock });
