import { Navigate } from "react-router-dom";
import { Button } from "antd";
import { useAppStore } from "../store";
import { ENABLE_STAFF_APPS } from "../config";
import type { RoleKey } from "../types";

const ROLE_HOME: Record<RoleKey, string> = {
  admin: "/admin",
  owner: "/owner",
  manager: "/manager",
  waiter: "/waiter",
  kitchen: "/kitchen",
};

/** Trang chủ của một vai trò. Waiter/Kitchen về /login khi phân hệ bị tắt. */
export function homeRouteFor(role: RoleKey): string {
  if (!ENABLE_STAFF_APPS && (role === "waiter" || role === "kitchen")) return "/login";
  return ROLE_HOME[role] ?? "/login";
}

interface RoleGuardProps {
  allowedRoles: RoleKey[];
  children: React.ReactNode;
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", background: "#fff", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>{children}</div>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <FullScreen>
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #e4e4e7",
          borderTopColor: "#0a0a0a",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 16px",
        }}
      />
      <div style={{ color: "#71717a", fontSize: 14 }}>{label}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </FullScreen>
  );
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { currentUser, isBootstrapped, scopeStatus, scopeError, loadScope, logout } = useAppStore();

  if (!isBootstrapped) return <Spinner label="Đang tải hệ thống..." />;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to={homeRouteFor(currentUser.role)} replace />;
  }

  // Không thả người dùng vào màn hình rỗng khi chưa biết họ thuộc chuỗi/chi
  // nhánh nào — mọi dữ liệu bên trong đều phụ thuộc phạm vi này.
  if (scopeStatus === "loading" || scopeStatus === "idle") {
    return <Spinner label="Đang tải phạm vi làm việc..." />;
  }

  if (scopeStatus === "error") {
    return (
      <FullScreen>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Không tải được phạm vi làm việc</div>
        <div style={{ color: "#71717a", fontSize: 14, marginBottom: 20 }}>{scopeError}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Button type="primary" onClick={() => loadScope()}>
            Thử lại
          </Button>
          <Button onClick={() => logout()}>Đăng xuất</Button>
        </div>
      </FullScreen>
    );
  }

  return <>{children}</>;
}
