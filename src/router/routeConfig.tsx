/**
 * Cấu hình route DUY NHẤT cho khu vực Admin / Brand Manager / Store Manager.
 * Sidebar (RoleLayout) và cây route (router/index.tsx) đều đọc từ đây — không
 * khai báo màn hình ở nơi nào khác. `code` là mã use case trong đặc tả v9 (mục 14).
 */
import type { ReactNode } from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  Images,
  LayoutDashboard,
  ListChecks,
  Package,
  Palette,
  Printer,
  Receipt,
  ReceiptText,
  ScanLine,
  ScrollText,
  Sliders,
  Layers,
  CirclePlus,
  Store,
  Tags,
  UserCog,
  UserPlus,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import AdminOverview from "../roles/admin/AdminOverview";
import TenantsTable from "../roles/admin/TenantsTable";
import SignupRequests from "../roles/admin/SignupRequests";
import PlansTable from "../roles/admin/PlansTable";
import Reports from "../roles/owner/Reports";
import Branches from "../roles/owner/Branches";
import MenuTable from "../roles/owner/MenuTable";
import CategoriesTable from "../roles/owner/CategoriesTable";
import BranchPrices from "../roles/owner/BranchPrices";
import BranchPriceList from "../roles/branch/BranchPriceList";
import CombosPage from "../roles/owner/CombosPage";
import ExtrasLibrary from "../roles/owner/ExtrasLibrary";
import OptionGroups from "../roles/owner/OptionGroups";
import ManagerAccounts from "../roles/owner/ManagerAccounts";
import Branding from "../roles/owner/Branding";
import Posters from "../roles/owner/Posters";
import PayosLink from "../roles/owner/PayosLink";
import MyPlan from "../roles/owner/MyPlan";
import MenuImport from "../roles/owner/MenuImport";
import ManagerDashboard from "../roles/branch/ManagerDashboard";
import BranchInfo from "../roles/branch/BranchInfo";
import BranchMenu from "../roles/branch/BranchMenu";
import StaffTable from "../roles/branch/StaffTable";
import Stations from "../roles/branch/Stations";
import OrderSearch from "../roles/branch/OrderSearch";
import OrderDetail from "../roles/branch/OrderDetail";
import AttentionOrders from "../roles/branch/AttentionOrders";
import RefundApprovals from "../roles/branch/RefundApprovals";
import TransactionLedger from "../roles/branch/TransactionLedger";
import PlatformBusinesses from "../roles/platform-staff/Businesses";
import PlatformStaffPlans from "../roles/platform-staff/PlatformStaffPlans";
import PlatformStaffAccounts from "../roles/admin/PlatformStaffAccounts";
import PlatformRevenue from "../roles/admin/PlatformRevenue";
import PlatformInvoices from "../roles/admin/PlatformInvoices";
import PasswordResetRequests from "../auth/PasswordResetRequests";

export type WebRole = "admin" | "platform-staff" | "owner" | "manager";

/** Mã role nội bộ giữ `owner`/`manager` để tương thích BE và dữ liệu cũ. */
export const roleBasePath = (role: WebRole) => {
  if (role === "owner") return "/brand-manager";
  if (role === "manager") return "/store-manager";
  return `/${role}`;
};

export interface RouteDef {
  /** Đường dẫn con, tương đối so với đường dẫn gốc của từng vai trò. */
  path: string;
  label: string;
  icon: ReactNode;
  element: ReactNode;
  /** Mã use case trong đặc tả v9 (nhiều mã nối bằng " · "). Bỏ trống nếu không phải use case. */
  code?: string;
  /** false = có route nhưng không hiện trên sidebar. */
  nav?: boolean;
}

export const adminRoutes: RouteDef[] = [
  { path: "overview", label: "Tổng quan", icon: <LayoutDashboard size={18} />, element: <AdminOverview /> },
  { path: "tenants", label: "Doanh nghiệp", icon: <Building2 size={18} />, code: "PA-05", element: <TenantsTable /> },
  {
    path: "signups",
    label: "Hồ sơ đăng ký",
    icon: <UserPlus size={18} />,
    code: "PA-01 · PA-02 · PA-03",
    element: <SignupRequests />,
  },
  { path: "plans", label: "Gói dịch vụ", icon: <Package size={18} />, code: "PA-04", element: <PlansTable /> },
  { path: "platform-revenue", label: "Doanh thu nền tảng", icon: <BarChart3 size={18} />, code: "PA-06", element: <PlatformRevenue /> },
  { path: "billing", label: "Hoá đơn thuê bao", icon: <ReceiptText size={18} />, code: "PA-05 · PA-06", element: <PlatformInvoices /> },
  { path: "staff", label: "Platform Staff", icon: <UsersRound size={18} />, code: "PA-07", element: <PlatformStaffAccounts /> },
  { path: "password-reset-requests", label: "Yêu cầu đặt lại mật khẩu", icon: <UserCog size={18} />, code: "PA-07", element: <PasswordResetRequests /> },
];

export const platformStaffRoutes: RouteDef[] = [
  { path: "signups", label: "Hồ sơ đăng ký", icon: <UserPlus size={18} />, code: "PA-01 · PA-02 · PA-03 · PS-01", element: <SignupRequests /> },
  { path: "businesses", label: "Doanh nghiệp", icon: <Building2 size={18} />, code: "PS-01", element: <PlatformBusinesses /> },
  { path: "plans", label: "Gói dịch vụ", icon: <Package size={18} />, code: "PA-04", element: <PlatformStaffPlans /> },
  { path: "password-reset-requests", label: "Yêu cầu đặt lại mật khẩu", icon: <UserCog size={18} />, code: "PS-01", element: <PasswordResetRequests /> },
];

export const ownerRoutes: RouteDef[] = [
  { path: "reports", label: "Tổng quan", icon: <LayoutDashboard size={18} />, code: "OW-08", element: <Reports /> },
  { path: "branches", label: "Chi nhánh", icon: <Store size={18} />, code: "OW-01", element: <Branches /> },
  { path: "menu", label: "Menu toàn chuỗi", icon: <UtensilsCrossed size={18} />, code: "OW-02 · OW-04", element: <MenuTable /> },
  { path: "menu/categories", label: "Danh mục món", icon: <Tags size={18} />, code: "OW-02", element: <CategoriesTable /> },
  {
    path: "menu/options",
    label: "Tuỳ chọn món",
    icon: <Sliders size={18} />,
    code: "OW-03",
    element: <OptionGroups />,
  },
  { path: "menu/extras", label: "Topping thêm", icon: <CirclePlus size={18} />, code: "OW-15", element: <ExtrasLibrary /> },
  { path: "menu/combos", label: "Combo", icon: <Layers size={18} />, code: "OW-14 · OW-04", element: <CombosPage /> },
  { path: "menu/prices", label: "Giá theo chi nhánh", icon: <Tags size={18} />, code: "OW-16", element: <BranchPrices /> },
  {
    path: "menu/import",
    label: "Nhập menu từ ảnh",
    icon: <ScanLine size={18} />,
    code: "OW-12",
    element: <MenuImport />,
  },
  { path: "accounts", label: "Tài khoản quản lý", icon: <UserCog size={18} />, code: "OW-05", element: <ManagerAccounts /> },
  { path: "password-reset-requests", label: "Yêu cầu đặt lại mật khẩu", icon: <UserCog size={18} />, code: "OW-05", element: <PasswordResetRequests /> },
  {
    path: "payos",
    label: "Liên kết PayOS",
    icon: <CreditCard size={18} />,
    code: "OW-06",
    element: <PayosLink />,
  },
  { path: "branding", label: "Nhận diện", icon: <Palette size={18} />, code: "OW-07", element: <Branding /> },
  { path: "posters", label: "Poster màn hình sau", icon: <Images size={18} />, code: "OW-11", element: <Posters /> },
  {
    path: "plan",
    label: "Gói của tôi",
    icon: <ScrollText size={18} />,
    code: "OW-10",
    element: <MyPlan />,
  },
];

export const managerRoutes: RouteDef[] = [
  { path: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={18} />, code: "BM-03", element: <ManagerDashboard /> },
  { path: "branch-info", label: "Thông tin chi nhánh", icon: <Building2 size={18} />, element: <BranchInfo /> },
  { path: "menu", label: "Món tại chi nhánh", icon: <UtensilsCrossed size={18} />, code: "BM-02", element: <BranchMenu /> },
  { path: "prices", label: "Bảng giá chi nhánh", icon: <Tags size={18} />, code: "OW-16", element: <BranchPriceList /> },
  { path: "staff", label: "Nhân viên", icon: <UsersRound size={18} />, code: "BM-01", element: <StaffTable /> },
  {
    path: "stations",
    label: "Quầy và máy in",
    icon: <Printer size={18} />,
    code: "BM-01",
    element: <Stations />,
  },
  {
    path: "orders",
    label: "Tra cứu đơn",
    icon: <ClipboardList size={18} />,
    code: "BM-04",
    element: <OrderSearch />,
  },
  {
    path: "orders/needs-attention",
    label: "Đơn cần xử lý",
    icon: <ListChecks size={18} />,
    code: "BM-05",
    element: <AttentionOrders />,
  },
  {
    path: "ledger",
    label: "Sổ giao dịch",
    icon: <ScrollText size={18} />,
    code: "BM-07",
    element: <TransactionLedger />,
  },
  {
    path: "refund-approvals",
    label: "Duyệt hoàn tiền",
    icon: <ListChecks size={18} />,
    code: "BM-06",
    element: <RefundApprovals />,
  },
  {
    path: "orders/:orderId",
    label: "Chi tiết đơn",
    icon: <Receipt size={18} />,
    code: "BM-04 · BM-06",
    nav: false,
    element: <OrderDetail />,
  },
];

export const roleRoutes: Record<WebRole, RouteDef[]> = {
  admin: adminRoutes,
  "platform-staff": platformStaffRoutes,
  owner: ownerRoutes,
  manager: managerRoutes,
};

/** Đường dẫn tuyệt đối trang đầu tiên của một vai trò. */
export function roleHomePath(role: WebRole): string {
  return `${roleBasePath(role)}/${roleRoutes[role][0].path}`;
}

/** Vai trò có khu vực trên web. */
export function isWebRole(role: string): role is WebRole {
  return role === "admin" || role === "platform-staff" || role === "owner" || role === "manager";
}

