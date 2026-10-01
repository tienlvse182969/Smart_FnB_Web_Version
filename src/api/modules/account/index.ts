/**
 * Module account — tài khoản Manager/Cashier/Barista (OW-05, BM-01). Mock cho tới giai đoạn 5.
 * Mỗi tầng chỉ tạo tài khoản tầng ngay dưới: Owner tạo Manager, Manager tạo Cashier/Barista (BR-05).
 */
import type { DemoAccount, StaffMember } from "../../../types";
import { defineApi } from "../../define";
import { accountMock } from "./mock";

export interface AccountApi {
  listManagers(chainId: string): Promise<DemoAccount[]>;
  /** Owner chỉ XEM Cashier/Barista, không tạo/sửa. */
  listStaffAccounts(chainId: string): Promise<DemoAccount[]>;
  /** Danh sách nhân sự của chi nhánh (BM-01). */
  listStaff(chainId: string, branchId: string): Promise<StaffMember[]>;
  createManager(chainId: string, branchId: string, name: string, email: string): Promise<DemoAccount>;
  createStaff(
    chainId: string,
    branchId: string,
    name: string,
    email: string,
    role: "Cashier" | "Barista",
  ): Promise<StaffMember>;
  setActive(accountId: string, active: boolean): Promise<void>;
  resetPassword(accountId: string): Promise<void>;
  reassignBranch(accountId: string, branchId: string): Promise<void>;
  /** Số tài khoản đang hoạt động của doanh nghiệp (Owner + Manager + Cashier + Barista — mục 13.1). */
  countAccounts(chainId: string): Promise<number>;
}

// CHỜ BE: BE có /auth/managers, /auth/staff, /users/{id}/status nhưng thiếu quản lý Cashier/Barista cho Manager — giai đoạn 5.
export const accountApi = defineApi<AccountApi>("account", { mock: accountMock });
