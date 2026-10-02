/**
 * Module account — tài khoản Manager/Cashier/Barista (OW-05, BM-01).
 * - Manager (Owner quản): REAL qua `/employees` của BE (giai đoạn 5.3); tạo Manager chờ BE (#23).
 * - Cashier/Barista: Owner XEM bằng real (`/employees`, 5.3b); Manager quản (tạo/liệt kê/khoá) là MOCK, BE chưa có endpoint
 *   (api-contract-plan #24) — làm tiếp ở 5.4.
 * Mỗi tầng chỉ tạo tài khoản tầng ngay dưới: Owner tạo Manager, Manager tạo Cashier/Barista (BR-05).
 */
import type { ManagerAccount, ManagerPage, ManagerQuery, PasswordSetupNotice, StaffAccount, StaffMember } from "../../../types";
import { defineApi } from "../../define";
import { accountMock } from "./mock";
import { accountReal } from "./real";

export interface AccountApi {
  // --- Manager (Owner) ---------------------------------------------------------------------------------------------
  /** Phân trang/tìm kiếm/lọc phía server (BE `GET /employees?role=MANAGER`). */
  listManagers(chainId: string, query?: ManagerQuery): Promise<ManagerPage>;
  /** Không có mật khẩu: tài khoản mới nhận email đặt mật khẩu một lần (như Admin duyệt hồ sơ). Real: chờ BE #23. */
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
  /** Danh sách nhân sự của chi nhánh (BM-01). */
  listStaff(chainId: string, branchId: string): Promise<StaffMember[]>;
  createStaff(
    chainId: string,
    branchId: string,
    name: string,
    email: string,
    role: "Cashier" | "Barista",
  ): Promise<{ staff: StaffMember } & PasswordSetupNotice>;
  setStaffActive(accountId: string, active: boolean): Promise<void>;
  /** Số tài khoản đang hoạt động của doanh nghiệp (Owner + Manager + Cashier + Barista — mục 13.1). */
  countAccounts(chainId: string): Promise<number>;
}

export const accountApi = defineApi<AccountApi>("account", { real: accountReal, mock: accountMock });
