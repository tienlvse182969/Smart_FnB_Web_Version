import { useEffect, useLayoutEffect, useMemo } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { BrandContext, applyThemeVars, buildTheme, resolveBrand } from "./theme";
import { useAppStore } from "./store";
import ForceChangePasswordModal from "./auth/ForceChangePasswordModal";

export default function App() {
  const { currentUser, tenantBranding, bootstrap } = useAppStore();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Chưa đăng nhập (trang đăng nhập, landing) và Platform Admin luôn dùng nhận diện nền tảng
  // (CC-04, BR-44); không tenant nào áp màu lên được.
  const brand = useMemo(
    () =>
      resolveBrand({
        branding: tenantBranding,
        platformOnly: !currentUser || currentUser.role === "admin",
        brandingEnabled: true,
      }),
    [currentUser, tenantBranding],
  );
  const theme = useMemo(() => buildTheme(brand), [brand]);

  // Ghi CSS variables trước khi trình duyệt vẽ để không nhấp nháy màu.
  useLayoutEffect(() => applyThemeVars(brand), [brand]);

  return (
    <ConfigProvider theme={theme}>
      <BrandContext.Provider value={brand}>
        <AntApp>
          <RouterProvider router={router} />
          <ForceChangePasswordModal />
        </AntApp>
      </BrandContext.Provider>
    </ConfigProvider>
  );
}
