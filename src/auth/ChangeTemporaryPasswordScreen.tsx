import { App, Button, Card, Input, Typography } from "antd";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { request } from "../api/http/client";
import { showApiError } from "../api";
import { useAppStore } from "../store";
import { homeRouteFor } from "../router/guards";

export default function ChangeTemporaryPasswordScreen() {
  const user = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to={homeRouteFor(user.role)} replace />;

  const submit = async () => {
    if (next !== confirm) { message.warning("Mật khẩu xác nhận chưa khớp"); return; }
    if (next.length < 8 || !/[a-z]/.test(next) || !/[A-Z]/.test(next) || !/[0-9]/.test(next)) { message.warning("Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"); return; }
    setBusy(true);
    try {
      await request("/auth/change-password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      await logout();
      navigate("/login", { replace: true, state: { notice: "Đã đổi mật khẩu. Vui lòng đăng nhập lại." } });
    } catch (err) { showApiError(message.error, err, "Không đổi được mật khẩu"); }
    finally { setBusy(false); }
  };

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f3f5f8", padding: 24 }}>
    <Card style={{ width: "min(100%, 440px)", borderRadius: 16 }}>
      <Typography.Title level={3}>Đổi mật khẩu tạm</Typography.Title>
      <Typography.Paragraph type="secondary">Bạn cần đổi mật khẩu trước khi dùng hệ thống. Mật khẩu tạm có hiệu lực 72 giờ.</Typography.Paragraph>
      <Input.Password placeholder="Mật khẩu tạm trong email" value={current} onChange={(e) => setCurrent(e.target.value)} style={{ marginBottom: 12 }} />
      <Input.Password placeholder="Mật khẩu mới" value={next} onChange={(e) => setNext(e.target.value)} style={{ marginBottom: 12 }} />
      <Input.Password placeholder="Nhập lại mật khẩu mới" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ marginBottom: 16 }} />
      <Button type="primary" block loading={busy} onClick={() => void submit()}>Đổi mật khẩu</Button>
    </Card>
  </main>;
}
