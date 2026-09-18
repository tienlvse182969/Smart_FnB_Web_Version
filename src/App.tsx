import { useEffect } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { monoTheme, buildTenantTheme } from "./theme";
import { AccentContext } from "./theme/accentContext";
import { useAppStore } from "./store";
import ForceChangePasswordModal from "./auth/ForceChangePasswordModal";

export default function App() {
  const { currentUser, tenantBranding, bootstrap, isBootstrapped } = useAppStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Platform Admin luôn giữ nhận diện nền tảng (BR-32), không tenant nào áp màu lên được.
  const theme = currentUser?.role === "admin" ? monoTheme : buildTenantTheme(tenantBranding);

  // Chưa custom (hoặc là Admin) → accent mặc định của nền tảng, không phải màu tenant.
  const accentColor =
    currentUser?.role !== "admin" && tenantBranding?.isCustom
      ? tenantBranding.accentColor
      : "#71717a";

  return (
    <ConfigProvider theme={theme}>
      <AccentContext.Provider value={accentColor}>
        <AntApp>
          <RouterProvider router={router} />
          <ForceChangePasswordModal />
        </AntApp>
      </AccentContext.Provider>
    </ConfigProvider>
  );
}
