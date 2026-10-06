import { useEffect, useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { BrandContext, applyThemeVars, buildTheme, resolveBrand } from "./theme";
import { useAppStore } from "./store";
import ApiErrorBridge from "./components/ApiErrorBridge";
import MockPanel from "./dev/MockPanel";
import { describePlan } from "./plan/usePlan";

/** Trang công khai luôn dùng nhận diện nền tảng, kể cả khi trình duyệt đang có phiên tenant (không đụng tới phiên đó). */
const PLATFORM_BRAND_PATHS = ["/setup-password"];

export default function App() {
  const { currentUser, tenantBranding, plan, bootstrap } = useAppStore();
  const pathname = useSyncExternalStore(
    (onChange) => router.subscribe(() => onChange()),
    () => router.state.location.pathname,
  );

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Điều hướng sang route khác: nạp lại nhận diện (tối đa 1 lần mỗi 60 giây, lỗi im lặng, Admin và trang công khai không nạp) để Manager và
  // các tài khoản khác thấy nhận diện Owner vừa đổi mà không cần đăng nhập lại (quyết định 29).
  const refreshBrandingOnNavigate = useAppStore((s) => s.refreshBrandingOnNavigate);
  useEffect(() => {
    void refreshBrandingOnNavigate(pathname);
  }, [pathname, refreshBrandingOnNavigate]);

  // Chưa đăng nhập (trang đăng nhập, landing), Platform Admin và các trang công khai (/setup-password) luôn dùng nhận diện
  // nền tảng (CC-04, BR-44); không tenant nào áp màu lên được.
  const brand = useMemo(
    () =>
      resolveBrand({
        branding: tenantBranding,
        platformOnly: !currentUser || currentUser.role === "admin" || PLATFORM_BRAND_PATHS.includes(pathname),
        // Nhận diện chỉ áp từ gói Tiêu chuẩn (BR-41); gói thấp hơn dùng nhận diện nền tảng, cấu hình vẫn được giữ.
        brandingEnabled: describePlan(plan).hasFeature("branding"),
      }),
    [currentUser, tenantBranding, plan, pathname],
  );
  const theme = useMemo(() => buildTheme(brand), [brand]);

  // Ghi CSS variables trước khi trình duyệt vẽ để không nhấp nháy màu.
  useLayoutEffect(() => applyThemeVars(brand), [brand]);

  return (
    <ConfigProvider theme={theme}>
      <BrandContext.Provider value={brand}>
        <AntApp>
          <RouterProvider router={router} />
          <ApiErrorBridge />
          {import.meta.env.DEV && <MockPanel />}
        </AntApp>
      </BrandContext.Provider>
    </ConfigProvider>
  );
}
