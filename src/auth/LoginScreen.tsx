import { useState } from "react";
import { App, Button, Input } from "antd";
import { LogIn, UtensilsCrossed } from "lucide-react";
import { useAppStore } from "../store";

/**
 * Đăng nhập bằng email + mật khẩu qua backend thật. Không còn bước chọn vai
 * trò — vai trò do backend quyết định và web tự đưa về đúng không gian làm việc.
 */
export default function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => void }) {
  const { message } = App.useApp();
  const isLoading = useAppStore((s) => s.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email.trim()) {
      message.error("Nhập email");
      return;
    }
    if (!password) {
      message.error("Nhập mật khẩu");
      return;
    }
    onLogin(email, password);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
        background: "#fff",
      }}
    >
      {/* Left — brand panel */}
      <div
        style={{
          background: "#0a0a0a",
          color: "#fff",
          padding: "56px 60px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: "#fff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <UtensilsCrossed size={22} color="#0a0a0a" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Smart F&amp;B</div>
        </div>

        <div>
          <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.6 }}>
            Phần mềm vận hành
            <br />
            chuỗi nhà hàng.
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 15,
              lineHeight: 1.6,
              maxWidth: 420,
              marginTop: 18,
            }}
          >
            Quản trị nền tảng, điều hành chuỗi và quản lý chi nhánh trên một
            không gian làm việc duy nhất.
          </p>
        </div>

        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
          Nhân viên phục vụ &amp; bếp dùng ứng dụng tablet
        </div>
      </div>

      {/* Right — email + password */}
      <div
        style={{
          padding: "56px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 520,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700 }}>Đăng nhập</div>
        <div style={{ color: "#71717a", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
          Dùng email và mật khẩu được cấp cho tài khoản của bạn.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <Input
            size="large"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPressEnter={handleLogin}
            variant="filled"
          />
          <Input.Password
            size="large"
            placeholder="Mật khẩu"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handleLogin}
            variant="filled"
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
      </div>
    </div>
  );
}
