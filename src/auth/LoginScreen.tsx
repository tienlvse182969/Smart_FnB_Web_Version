import { useState } from "react";
import { Button, Input } from "antd";
import {
  Building2,
  ChefHat,
  ConciergeBell,
  LayoutGrid,
  LogIn,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { roleMeta, type RoleKey } from "../data";

const accounts: {
  role: RoleKey;
  icon: React.ReactNode;
  email: string;
  desc: string;
}[] = [
  { role: "admin", icon: <Building2 size={20} />, email: "admin@platform.vn", desc: "Quản lý doanh nghiệp thuê bao & nền tảng" },
  { role: "owner", icon: <LayoutGrid size={20} />, email: "owner@comtam.vn", desc: "Cấu hình chuỗi: chi nhánh, menu, tài khoản quản lý" },
  { role: "branch", icon: <Store size={20} />, email: "manager@comtam.vn", desc: "Điều hành chi nhánh & quầy thu ngân" },
  { role: "waiter", icon: <ConciergeBell size={20} />, email: "waiter@comtam.vn", desc: "Mở bàn, ghi order, phục vụ tại bàn" },
  { role: "kitchen", icon: <ChefHat size={20} />, email: "kitchen@comtam.vn", desc: "Hàng đợi món của chi nhánh" },
];

export default function LoginScreen({ onLogin }: { onLogin: (role: RoleKey) => void }) {
  const [selected, setSelected] = useState<RoleKey>("owner");
  const account = accounts.find((a) => a.role === selected)!;

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
            Mỗi vai trò đăng nhập vào không gian làm việc riêng — từ quản trị
            nền tảng, điều hành chi nhánh, trạm bếp đến quầy thu ngân.
          </p>
        </div>

        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
          Bản demo tablet · Waiter &amp; khách tại bàn dùng ứng dụng mobile
        </div>
      </div>

      {/* Right — role picker */}
      <div
        style={{
          padding: "56px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: 520,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700 }}>Đăng nhập demo</div>
        <div style={{ color: "#71717a", fontSize: 14, marginTop: 4, marginBottom: 24 }}>
          Chọn vai trò để vào không gian làm việc tương ứng.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {accounts.map((a) => {
            const active = a.role === selected;
            return (
              <button
                key={a.role}
                onClick={() => setSelected(a.role)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: active ? "#0a0a0a" : "#fff",
                  color: active ? "#fff" : "#0a0a0a",
                  border: `1.5px solid ${active ? "#0a0a0a" : "var(--ant-color-border)"}`,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: active ? "rgba(255,255,255,0.14)" : "#f4f4f5",
                    flexShrink: 0,
                  }}
                >
                  {a.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{roleMeta[a.role].label}</div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: active ? "rgba(255,255,255,0.6)" : "#71717a",
                    }}
                  >
                    {a.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <Input size="large" value={account.email} readOnly variant="filled" />
          <Input.Password size="large" value="demo1234" readOnly variant="filled" />
        </div>

        <Button
          type="primary"
          size="large"
          block
          icon={<LogIn size={18} />}
          onClick={() => onLogin(selected)}
        >
          Đăng nhập với vai trò {roleMeta[selected].label}
        </Button>
      </div>
    </div>
  );
}
