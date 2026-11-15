import { useState } from "react";
import { App, Button, Input, Modal } from "antd";
import { Lock, LogIn, User } from "lucide-react";
import { ApiError, authApi, showApiError } from "../api";
import { useAppStore } from "../store";
import { palette } from "../theme";
import PlatformLogo from "../components/brand/PlatformLogo";
import loginBackground from "../assets/brand/login-background.jpg";

/**
 * Đăng nhập bằng email hoặc tên tài khoản + mật khẩu qua backend thật. Không còn bước chọn vai
 * trò — vai trò do backend quyết định và web tự đưa về đúng không gian làm việc.
 *
 * Bố cục giống màn đăng nhập của app thu ngân/pha chế: ảnh nền phủ kín, một thẻ kính mờ ở giữa
 * gồm logo, tiêu đề, ô nhập có nhãn + biểu tượng và nút đăng nhập.
 */
const FORGOT_EMAIL_PATTERN = /^[^s@]+@[^s@]+.[^s@]+$/;

export default function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const { message } = App.useApp();
  const isLoading = useAppStore((s) => s.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const sendReset = async () => {
    const value = forgotEmail.trim();
    if (!value || forgotBusy) return; // chống bấm đúp / Enter liên tiếp
    if (!FORGOT_EMAIL_PATTERN.test(value)) {
      message.error("Email không hợp lệ");
      return;
    }
    setForgotBusy(true);
    try {
      await authApi.requestPasswordReset(value);
      setForgotSent(true);
    } catch (error) {
      // 22.8: vượt 5 lần mỗi giờ theo IP trả 429 với câu chung, không cho biết email có tồn tại hay không.
      if (error instanceof ApiError && error.status === 429) message.error("Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.");
      else showApiError(message.error, error, "Không gửi được yêu cầu. Vui lòng thử lại.");
    } finally {
      setForgotBusy(false);
    }
  };

  const handleLogin = () => {
    if (!email.trim()) {
      message.error("Nhập email hoặc tên đăng nhập");
      return;
    }
    if (!password) {
      message.error("Nhập mật khẩu");
      return;
    }
    onLogin(email, password);
  };

  const label = (text: string) => (
    <div style={{ fontSize: 13, fontWeight: 600, color: palette.ink, marginBottom: 6 }}>{text}</div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: palette.ink,
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 24,
          borderRadius: 16,
          border: `1.5px solid color-mix(in srgb, ${palette.surface} 55%, transparent)`,
          background: `color-mix(in srgb, ${palette.surface} 45%, transparent)`,
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          boxShadow: `0 24px 60px color-mix(in srgb, ${palette.ink} 25%, transparent)`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <PlatformLogo variant="wordmark" tone="dark" height={78} style={{ alignSelf: "center" }} />

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: palette.ink }}>Đăng nhập</div>
          <div style={{ color: palette.textStrong, fontSize: 14, marginTop: 2 }}>
            Dành cho Brand Manager, Store Manager và Admin
          </div>
        </div>

        <div>
          {label("Email hoặc tên đăng nhập")}
          <Input
            size="large"
            placeholder="ten@congty.vn"
            autoComplete="username"
            prefix={<User size={17} color={palette.textMuted} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPressEnter={handleLogin}
          />
        </div>
        <div>
          {label("Mật khẩu")}
          <Input.Password
            size="large"
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            prefix={<Lock size={17} color={palette.textMuted} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleLogin}
          />
        </div>

        <Button
          type="primary"
          size="large"
          block
          loading={isLoading}
          icon={<LogIn size={18} />}
          onClick={handleLogin}
        >
          Đăng nhập
        </Button>
        <Button type="link" style={{ alignSelf: "flex-end", marginTop: 12 }} onClick={() => { setForgotEmail(email.includes("@") ? email : ""); setForgotSent(false); setForgotOpen(true); }}>
          Quên mật khẩu?
        </Button>

        <div style={{ textAlign: "center", fontSize: 12.5, color: palette.textStrong }}>
          Thu ngân &amp; pha chế đăng nhập trên ứng dụng tablet
        </div>
      </div>
      <Modal title="Quên mật khẩu" open={forgotOpen} onCancel={() => setForgotOpen(false)} onOk={forgotSent ? () => setForgotOpen(false) : sendReset} okText={forgotSent ? "Đóng" : "Gửi yêu cầu"} okButtonProps={{ disabled: !forgotSent && !forgotEmail.trim(), loading: forgotBusy }}>
        {forgotSent ? <p>Nếu email đúng, hướng dẫn đặt lại đã được gửi đi.</p> : <>
          <p>Nhập email của tài khoản. Nếu cần cấp trên xử lý, yêu cầu sẽ xuất hiện trong hệ thống của họ.</p>
          <Input type="email" placeholder="Email tài khoản" autoComplete="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} onPressEnter={sendReset} />
        </>}
      </Modal>
    </div>
  );
}
