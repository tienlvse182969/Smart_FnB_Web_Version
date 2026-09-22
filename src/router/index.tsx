import { createBrowserRouter, Navigate, type RouteObject, useNavigate } from "react-router-dom";
import { App } from "antd";
import LandingPage from "../components/landing/LandingPage";
import LoginScreen from "../auth/LoginScreen";
import AdminApp from "../roles/admin/AdminApp";
import OwnerApp from "../roles/owner/OwnerApp";
import BranchApp from "../roles/branch/BranchApp";
import WaiterApp from "../roles/waiter/WaiterApp";
import KitchenApp from "../roles/kitchen/KitchenApp";
import { RoleGuard, homeRouteFor } from "./guards";
import { ENABLE_STAFF_APPS } from "../config";
import { useAppStore } from "../store";

function LandingWrapper() {
  const navigate = useNavigate();
  return <LandingPage onGoToLogin={() => navigate("/login")} />;
}

function LoginWrapper() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { login } = useAppStore();

  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await login(email, password);
      navigate(homeRouteFor(user.role));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  };

  return <LoginScreen onLogin={handleLogin} />;
}

/** Mọi không gian làm việc đều dùng chung một nút Đăng xuất. */
function useLogoutHandler() {
  const navigate = useNavigate();
  const { logout } = useAppStore();
  return async () => {
    await logout();
    navigate("/login");
  };
}

function AdminWrapper() {
  return <AdminApp onLogout={useLogoutHandler()} />;
}

function OwnerWrapper() {
  return <OwnerApp onLogout={useLogoutHandler()} />;
}

function ManagerWrapper() {
  return <BranchApp onLogout={useLogoutHandler()} />;
}

function WaiterWrapper() {
  return <WaiterApp onLogout={useLogoutHandler()} />;
}

function KitchenWrapper() {
  return <KitchenApp onLogout={useLogoutHandler()} />;
}

/**
 * Waiter/Kitchen đã chuyển sang ứng dụng tablet. Giữ nguyên màn hình, chỉ
 * không đăng ký route khi cờ tắt — mọi đường dẫn /waiter, /kitchen rơi về "*".
 */
const staffRoutes: RouteObject[] = ENABLE_STAFF_APPS
  ? [
      {
        path: "/waiter/*",
        element: (
          <RoleGuard allowedRoles={["waiter"]}>
            <WaiterWrapper />
          </RoleGuard>
        ),
      },
      {
        path: "/kitchen/*",
        element: (
          <RoleGuard allowedRoles={["kitchen"]}>
            <KitchenWrapper />
          </RoleGuard>
        ),
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingWrapper />,
  },
  {
    path: "/login",
    element: <LoginWrapper />,
  },
  {
    path: "/admin/*",
    element: (
      <RoleGuard allowedRoles={["admin"]}>
        <AdminWrapper />
      </RoleGuard>
    ),
  },
  {
    path: "/owner/*",
    element: (
      <RoleGuard allowedRoles={["owner"]}>
        <OwnerWrapper />
      </RoleGuard>
    ),
  },
  {
    path: "/manager/*",
    element: (
      <RoleGuard allowedRoles={["manager"]}>
        <ManagerWrapper />
      </RoleGuard>
    ),
  },
  {
    path: "/branch/*",
    element: <Navigate to="/manager" replace />,
  },
  ...staffRoutes,
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
