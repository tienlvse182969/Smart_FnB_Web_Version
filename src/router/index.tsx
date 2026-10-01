import { createBrowserRouter, Navigate, useNavigate, type RouteObject } from "react-router-dom";
import { App } from "antd";
import LandingPage from "../components/landing/LandingPage";
import LoginScreen from "../auth/LoginScreen";
import DisplayLayout from "../display/DisplayLayout";
import CallScreen from "../display/CallScreen";
import RoleLayout from "./RoleLayout";
import { roleHomePath, roleRoutes, type WebRole } from "./routeConfig";
import { RoleGuard, homeRouteFor } from "./guards";
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

/**
 * Khu vực của một vai trò: /{role} chuyển tới màn đầu tiên, các màn con lấy từ
 * routeConfig (cùng nguồn với sidebar), đường dẫn lạ về màn đầu tiên.
 */
function roleArea(role: WebRole): RouteObject {
  const home = roleHomePath(role);
  return {
    path: `/${role}`,
    element: (
      <RoleGuard allowedRoles={[role]}>
        <RoleLayout role={role} />
      </RoleGuard>
    ),
    children: [
      { index: true, element: <Navigate to={home} replace /> },
      ...roleRoutes[role].map((def) => ({ path: def.path, element: def.element })),
      { path: "*", element: <Navigate to={home} replace /> },
    ],
  };
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
  roleArea("admin"),
  roleArea("owner"),
  roleArea("manager"),
  {
    // Màn hình đặt ở quầy: công khai, không sidebar, không đăng nhập người dùng.
    path: "/display",
    element: <DisplayLayout />,
    children: [
      { index: true, element: <Navigate to="call" replace /> },
      { path: "call", element: <CallScreen /> },
      { path: "*", element: <Navigate to="/display/call" replace /> },
    ],
  },
  {
    path: "/branch/*",
    element: <Navigate to="/manager" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
