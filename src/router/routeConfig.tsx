/**
 * Cấu hình route DUY NHẤT cho khu vực Admin / Owner / Manager.
 * Sidebar (RoleLayout) và cây route (router/index.tsx) đều đọc từ đây — không
 * khai báo màn hình ở nơi nào khác. `code` là mã use case trong đặc tả v9 (mục 14).
 */
import type { ReactNode } from "react";
import {
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  Package,
  Palette,
  Printer,
  Receipt,
  ScrollText,
  Sliders,
  Store,
  Tags,
  UserCog,
  UserPlus,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import RoutePlaceholder from "./RoutePlaceholder";
import AdminOverview from "../roles/admin/AdminOverview";
import TenantsTable from "../roles/admin/TenantsTable";
import SignupRequests from "../roles/admin/SignupRequests";
import PlansTable from "../roles/admin/PlansTable";
import Reports from "../roles/owner/Reports";
import Branches from "../roles/owner/Branches";
import MenuTable from "../roles/owner/MenuTable";
import CategoriesTable from "../roles/owner/CategoriesTable";
import OptionGroups from "../roles/owner/OptionGroups";
import ManagerAccounts from "../roles/owner/ManagerAccounts";
import Branding from "../roles/owner/Branding";
import AiAssistant from "../roles/owner/AiAssistant";
import ManagerDashboard from "../roles/branch/ManagerDashboard";
import BranchInfo from "../roles/branch/BranchInfo";
import BranchMenu from "../roles/branch/BranchMenu";
import StaffTable from "../roles/branch/StaffTable";

export type WebRole = "admin" | "owner" | "manager";

export interface RouteDef {
  /** Đường dẫn con, tương đối so với `/admin`, `/owner`, `/manager`. */
  path: string;
  label: string;
  icon: ReactNode;
  element: ReactNode;
  /** Mã use case trong đặc tả v9 (nhiều mã nối bằng " · "). Bỏ trống nếu không phải use case. */
  code?: string;
  /** false = có route nhưng không hiện trên sidebar. */
  nav?: boolean;
}

const placeholder = (code: string, title: string) => <RoutePlaceholder code={code} title={title} />;

export const adminRoutes: RouteDef[] = [
  { path: "overview", label: "Tổng quan", icon: <LayoutDashboard size={18} />, element: <AdminOverview /> },
  { path: "tenants", label: "Doanh nghiệp", icon: <Building2 size={18} />, code: "PA-05", element: <TenantsTable /> },
  {
    path: "signups",
    label: "Hồ sơ đăng ký",
    icon: <UserPlus size={18} />,
    code: "PA-01 · PA-02 · PA-03",
    element: (
      <div style={{ maxWidth: 560 }}>
        <SignupRequests />
      </div>
    ),
  },
  { path: "plans", label: "Gói dịch vụ", icon: <Package size={18} />, code: "PA-04", element: <PlansTable /> },
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
  { path: "accounts", label: "Tài khoản quản lý", icon: <UserCog size={18} />, code: "OW-05", element: <ManagerAccounts /> },
  {
    path: "payos",
    label: "Liên kết PayOS",
    icon: <CreditCard size={18} />,
    code: "OW-06",
    element: placeholder("OW-06", "Liên kết PayOS"),
  },
  { path: "branding", label: "Nhận diện", icon: <Palette size={18} />, code: "OW-07", element: <Branding /> },
  { path: "ai", label: "Trợ lý số liệu", icon: <Bot size={18} />, code: "OW-09", element: <AiAssistant /> },
  {
    path: "plan",
    label: "Gói của tôi",
    icon: <ScrollText size={18} />,
    code: "OW-10",
    element: placeholder("OW-10", "Xem gói dịch vụ và hạn mức"),
  },
];

export const managerRoutes: RouteDef[] = [
  { path: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={18} />, code: "BM-03", element: <ManagerDashboard /> },
  { path: "branch-info", label: "Thông tin chi nhánh", icon: <Building2 size={18} />, element: <BranchInfo /> },
  { path: "menu", label: "Món tại chi nhánh", icon: <UtensilsCrossed size={18} />, code: "BM-02", element: <BranchMenu /> },
  { path: "staff", label: "Nhân viên", icon: <UsersRound size={18} />, code: "BM-01", element: <StaffTable /> },
  {
    path: "stations",
    label: "Quầy và máy in",
    icon: <Printer size={18} />,
    code: "BM-01",
    element: placeholder("BM-01", "Quản lý quầy, máy in và màn hình đã ghép"),
  },
  {
    path: "orders",
    label: "Tra cứu đơn",
    icon: <ClipboardList size={18} />,
    code: "BM-04",
    element: placeholder("BM-04", "Tra cứu đơn"),
  },
  {
    path: "orders/needs-attention",
    label: "Đơn cần xử lý",
    icon: <ListChecks size={18} />,
    code: "BM-05",
    element: placeholder("BM-05", "Xác nhận chuyển khoản thủ công"),
  },
  {
    path: "orders/:orderId",
    label: "Chi tiết đơn",
    icon: <Receipt size={18} />,
    code: "BM-04 · BM-06",
    nav: false,
    element: placeholder("BM-04 · BM-06", "Chi tiết đơn và huỷ đơn đã thanh toán"),
  },
];

export const roleRoutes: Record<WebRole, RouteDef[]> = {
  admin: adminRoutes,
  owner: ownerRoutes,
  manager: managerRoutes,
};

/** Đường dẫn tuyệt đối trang đầu tiên của một vai trò — nơi `/admin`, `/owner`, `/manager` chuyển tới. */
export function roleHomePath(role: WebRole): string {
  return `/${role}/${roleRoutes[role][0].path}`;
}

/** Vai trò có khu vực trên web. */
export function isWebRole(role: string): role is WebRole {
  return role === "admin" || role === "owner" || role === "manager";
}

