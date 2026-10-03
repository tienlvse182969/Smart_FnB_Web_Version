import { useEffect } from "react";
import { createBrowserRouter, Navigate, useLocation, useNavigate, type RouteObject } from "react-router-dom";
import { App } from "antd";
import { showApiError } from "../api";
import LandingPage from "../components/landing/LandingPage";
import LoginScreen from "../auth/LoginScreen";
import SetupPasswordScreen from "../auth/SetupPasswordScreen";
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
  const location = useLocation();
  const { message } = App.useApp();
  const { login } = useAppStore();

  // Từ /setup-password sang: báo kết quả một lần rồi xoá khỏi state của lịch sử.
  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (!notice) return;
    message.success({ key: "setup-password-done", content: notice });
    navigate(".", { replace: true, state: null });
  }, [location.state, message, navigate]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await login(email, password);
      navigate(homeRouteFor(user.role));
    } catch (err) {
      showApiError(message.error, err, "Đăng nhập thất bại"); // luôn tiếng Việt; sai mật khẩu = "Email hoặc mật khẩu không đúng."
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
  {
    // Công khai: đặt mật khẩu từ link trong email (token một lần).
    path: "/setup-password",
    element: <SetupPasswordScreen />,
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
