import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RoleShell, { type NavItem } from "../layout/RoleShell";
import { page } from "../components/bits";
import DirtyWatcher from "../components/DirtyWatcher";
import RefreshBoundary from "../components/RefreshBoundary";
import { useAppStore } from "../store";
import AttentionWatcher from "../roles/branch/AttentionWatcher";
import { useAttentionCount } from "../roles/branch/attentionStore";
import { roleBasePath, roleRoutes, type WebRole } from "./routeConfig";
import { modeOf } from "../api/flags";
import { request } from "../api/http/client";
import { subscribeOperations } from "../api/realtime/operations";

const SEARCH_PLACEHOLDER: Record<WebRole, string> = {
  admin: "Tìm doanh nghiệp, mã tenant…",
  "platform-staff": "Tìm hồ sơ, doanh nghiệp…",
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
  const [resetCount, setResetCount] = useState<number | null>(null);

  useEffect(() => {
    if (role === "manager" || modeOf("auth") === "mock") return;
    let alive = true;
    const load = async () => {
      try {
        const result = await request<{ count: number }>("/password-reset-requests/count");
        if (alive) setResetCount(result.count);
      } catch { if (alive) setResetCount(null); }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    const unsubscribe = subscribeOperations({ onEvent: (event) => { if (event.type.startsWith("password-reset.")) void load(); }, onStatus: (status, info) => { if (status === "connected" && info.reconnected) void load(); } });
    return () => { alive = false; window.clearInterval(timer); unsubscribe(); };
  }, [role]);

  // Số đơn "Cần xử lý" (BM-05, lượt 7.5): chỉ Manager; `null` khi chưa biết thì không hiện số.
  const attentionCount = useAttentionCount();

  const defs = roleRoutes[role];
  const nav: NavItem[] = defs
    .filter((d) => d.nav !== false)
    .map((d) => ({
      key: d.path,
      label: d.label,
      icon: d.icon,
      badge: d.path === "password-reset-requests" ? resetCount : role === "manager" && d.path === "orders/needs-attention" ? attentionCount : undefined,
    }));

  // Mục sidebar trùng dài nhất với URL: /manager/orders/needs-attention sáng
  // "orders/needs-attention", còn /manager/orders/123 sáng "orders".
  const basePath = roleBasePath(role);
  const relative = pathname.startsWith(basePath) ? pathname.slice(basePath.length).replace(/^\//, "") : "";
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
      onSection={(key) => navigate(`${basePath}/${key}`)}
      onLogout={handleLogout}
      branchChip={role === "manager" ? branchName : undefined}
      searchPlaceholder={SEARCH_PLACEHOLDER[role]}
    >
      <div style={page}>
        <DirtyWatcher />
        {role === "manager" && <AttentionWatcher />}
        <RefreshBoundary>
          <Outlet />
        </RefreshBoundary>
      </div>
    </RoleShell>
  );
}
