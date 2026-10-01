/** Kiểu dữ liệu xác thực và phân quyền. */

/**
 * Vai trò người dùng (đặc tả v9 mục 4). Chỉ admin/owner/manager vào được web;
 * cashier/barista dùng ứng dụng tablet.
 */
export type RoleKey = "admin" | "owner" | "manager" | "cashier" | "barista";

/** Mật khẩu mặc định cấp cho tài khoản mới/reset — demo, plaintext. */
export const DEFAULT_PASSWORD = "demo1234";

/**
 * Một tài khoản đăng nhập được — seed sẵn (demo ban đầu) hoặc tạo qua
 * onboarding/cấp tài khoản (Admin duyệt hồ sơ, Owner tạo Manager, Manager
 * tạo Cashier/Barista). Không còn giới hạn "một tài khoản mỗi vai trò".
 */
export type DemoAccount = {
  id: string;
  role: RoleKey;
  name: string;
  email: string;
  /** Mật khẩu — plaintext vì đây là mock demo, không phải hệ thống xác thực thật. */
  password: string;
  /** true = bắt đổi mật khẩu ở lần đăng nhập kế tiếp (CM-01). */
  mustChangePassword: boolean;
  /** false = đã bị khoá, không đăng nhập được. */
  active: boolean;
  label: string;
  scope: string;
  /** tenantId nếu không phải admin */
  tenantId?: string;
  /** branchId nếu là manager/cashier/barista */
  branchId?: string;
};

/** Người dùng đã đăng nhập — gắn tenant/branch context. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  tenantId: string | null; // null chỉ cho admin nền tảng
  branchId: string | null; // null cho admin + owner
  /** true = phải đổi mật khẩu trước khi dùng hệ thống (CM-01). */
  mustChangePassword: boolean;
};

/** Tên vai trò do backend trả về (còn WAITER/KITCHEN vì JSON BE hiện tại — web chặn không cho vào). */
export type BackendRole = "ADMIN" | "OWNER" | "MANAGER" | "WAITER" | "KITCHEN" | "CASHIER" | "BARISTA";

/**
 * Ngữ cảnh của phiên đang đăng nhập (`GET /auth/me`), gồm phạm vi chuỗi và chi nhánh.
 * Nguồn chuẩn cho phạm vi: `chainId` cho nhân viên, `chainIds` cho OWNER (có thể giữ nhiều chuỗi).
 */
export interface AuthContext {
  id: string;
  email: string;
  phone: string | null;
  role: BackendRole;
  sessionId: string;
  employeeId: string | null;
  ownerId: string | null;
  /** Chi nhánh được gán — chỉ nhân viên mới có. */
  branchId: string | null;
  /** Chuỗi của chi nhánh được gán — chỉ nhân viên mới có. */
  chainId: string | null;
  /** Mọi chuỗi OWNER đang quản lý. Rỗng với nhân viên và ADMIN. */
  chainIds: string[];
}

/** Một dòng trong danh sách nhân sự của chi nhánh (BM-01). `tenantId` chính là chainId. */
export type StaffMember = {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  email: string;
  role: "Manager" | "Cashier" | "Barista";
  active: boolean;
};
