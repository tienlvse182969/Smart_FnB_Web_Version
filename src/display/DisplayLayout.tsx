import { Outlet } from "react-router-dom"
import { useLocation } from "react-router-dom"

/**
 * Layout công khai cho các màn hình đặt ở quầy (TV/tablet): không sidebar,
 * không header, không cần đăng nhập người dùng. Thiết bị sẽ xác thực bằng token
 * thiết bị sau khi ghép bằng mã (đặc tả 11.10, BR-45) — chưa có API.
 */
export default function DisplayLayout() {
  const pathname = useLocation().pathname
  const fullScreen =
    pathname.endsWith("/customer") || pathname.endsWith("/call")
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ant-color-bg-layout)",
        color: "var(--ant-color-text)",
        display: fullScreen ? "block" : "grid",
        placeItems: fullScreen ? undefined : "center",
        padding: fullScreen ? 0 : 24,
      }}
    >
      <Outlet />
    </div>
  )
}
