import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RoleShell, { type NavItem } from "../layout/RoleShell";
import { page } from "../components/bits";
import DirtyWatcher from "../components/DirtyWatcher";
import RefreshBoundary from "../components/RefreshBoundary";
import { useAppStore } from "../store";
import { roleRoutes, type WebRole } from "./routeConfig";

const SEARCH_PLACEHOLDER: Record<WebRole, string> = {
  admin: "Tìm doanh nghiệp, mã tenant…",
  owner: "Tìm chi nhánh, món, tài khoản…",
  manager: "Tìm món, nhân viên, đơn…",
};

/**
 * Khung dùng chung cho /admin, /owner, /manager: sidebar dựng từ routeConfig,
 * nội dung là route con (Outlet). Mục sáng trên sidebar suy ra từ URL nên F5 và
 * nút Back của trình duyệt luôn khớp màn hình đang xem.
 */
export default function RoleLayout({ role }: { role: WebRole }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const logout = useAppStore((s) => s.logout);
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);

  const defs = roleRoutes[role];
  const nav: NavItem[] = defs
    .filter((d) => d.nav !== false)
    .map((d) => ({ key: d.path, label: d.label, icon: d.icon }));

  // Mục sidebar trùng dài nhất với URL: /manager/orders/needs-attention sáng
  // "orders/needs-attention", còn /manager/orders/123 sáng "orders".
  const relative = pathname.replace(new RegExp(`^/${role}/?`), "");
  const section =
    nav
      .filter((n) => relative === n.key || relative.startsWith(`${n.key}/`))
      .sort((a, b) => b.key.length - a.key.length)[0]?.key ?? "";

  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <RoleShell
      role={role}
      nav={nav}
      section={section}
      onSection={(key) => navigate(`/${role}/${key}`)}
      onLogout={handleLogout}
      branchChip={role === "manager" ? branchName : undefined}
      searchPlaceholder={SEARCH_PLACEHOLDER[role]}
    >
      <div style={page}>
        <DirtyWatcher />
        <RefreshBoundary>
          <Outlet />
        </RefreshBoundary>
      </div>
    </RoleShell>
  );
}
