import { createBrowserRouter, Navigate, useNavigate } from "react-router-dom";
import { App } from "antd";
import LandingPage from "../components/landing/LandingPage";
import LoginScreen from "../auth/LoginScreen";
import AdminApp from "../roles/admin/AdminApp";
import OwnerApp from "../roles/owner/OwnerApp";
import BranchApp from "../roles/branch/BranchApp";
import WaiterApp from "../roles/waiter/WaiterApp";
import KitchenApp from "../roles/kitchen/KitchenApp";
import { RoleGuard } from "./guards";
import { useAppStore } from "../store";
import type { RoleKey } from "../types";

function LandingWrapper() {
  const navigate = useNavigate();
  return <LandingPage onGoToLogin={() => navigate("/login")} />;
}

function LoginWrapper() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { login } = useAppStore();

  const handleLogin = async (accountId: string, password: string) => {
    try {
      const user = await login(accountId, password);

      const routes: Record<RoleKey, string> = {
        admin: "/admin",
        owner: "/owner",
        manager: "/manager",
        waiter: "/waiter",
        kitchen: "/kitchen",
      };
      navigate(routes[user.role] || "/login");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    }
  };

  return <LoginScreen onLogin={handleLogin} />;
}

function AdminWrapper() {
  const navigate = useNavigate();
  const { logout } = useAppStore();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return <AdminApp onLogout={handleLogout} />;
}

function OwnerWrapper() {
  const navigate = useNavigate();
  const { logout } = useAppStore();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return <OwnerApp onLogout={handleLogout} />;
}

function ManagerWrapper() {
  const navigate = useNavigate();
  const { logout } = useAppStore();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return <BranchApp onLogout={handleLogout} />;
}

function WaiterWrapper() {
  const navigate = useNavigate();
  const { logout } = useAppStore();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return <WaiterApp onLogout={handleLogout} />;
}

function KitchenWrapper() {
  const navigate = useNavigate();
  const { logout } = useAppStore();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return <KitchenApp onLogout={handleLogout} />;
}

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
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
