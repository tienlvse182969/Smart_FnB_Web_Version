import { useMemo, useState } from "react";
import { App, Button, Input } from "antd";
import {
  Building2,
  ChefHat,
  ConciergeBell,
  LayoutGrid,
  LogIn,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import type { DemoAccount, RoleKey } from "../types";
import { useAppStore } from "../store";

const roleMeta: Record<RoleKey, { label: string; icon: React.ReactNode }> = {
  admin: { label: "Platform Admin", icon: <Building2 size={20} /> },
  owner: { label: "Owner", icon: <LayoutGrid size={20} /> },
  manager: { label: "Branch Manager", icon: <Store size={20} /> },
  waiter: { label: "Waiter", icon: <ConciergeBell size={20} /> },
  kitchen: { label: "Kitchen Staff", icon: <ChefHat size={20} /> },
};

const roleOrder: RoleKey[] = ["admin", "owner", "manager", "waiter", "kitchen"];

/**
 * Màn chọn tài khoản đăng nhập demo. Một vai trò nay có thể có NHIỀU tài
 * khoản (Admin duyệt hồ sơ sinh Owner mới, Owner tạo nhiều Manager, Manager
 * tạo nhiều Waiter/Kitchen) — không còn "một tài khoản mỗi vai trò" như bản
 * demo ban đầu, nên bước 2 là chọn đúng tài khoản trong vai trò đã chọn.
 */
export default function LoginScreen({ onLogin }: { onLogin: (accountId: string, password: string) => void }) {
  const { message } = App.useApp();
  const accounts = useAppStore((s) => s.demoAccounts);
  const isLoading = useAppStore((s) => s.isLoading);
  const [role, setRole] = useState<RoleKey>("owner");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [password, setPassword] = useState("demo1234");

  const accountsByRole = useMemo(() => {
    const map = new Map<RoleKey, DemoAccount[]>();
    for (const r of roleOrder) map.set(r, []);
    for (const a of accounts) map.get(a.role)?.push(a);
    return map;
  }, [accounts]);

  const visibleAccounts = accountsByRole.get(role) ?? [];
  const selected = visibleAccounts.find((a) => a.id === accountId) ?? visibleAccounts[0] ?? null;

  const selectRole = (r: RoleKey) => {
    setRole(r);
    const first = accountsByRole.get(r)?.[0] ?? null;
    setAccountId(first?.id ?? null);
    setPassword("demo1234");
  };

  const handleLogin = () => {
    if (!selected) {
      message.error("Chưa có tài khoản nào cho vai trò này");
      return;
    }
    onLogin(selected.id, password);
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
            Mỗi vai trò đăng nhập vào không gian làm việc riêng — từ quản trị
            nền tảng, điều hành chi nhánh, trạm bếp đến quầy thu ngân.
          </p>
        </div>

        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
          Bản demo tablet · Waiter &amp; khách tại bàn dùng ứng dụng mobile
        </div>
      </div>

      {/* Right — role + account picker */}
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
          Chọn vai trò, rồi chọn đúng tài khoản để vào không gian làm việc tương ứng.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {roleOrder.map((r) => {
            const active = r === role;
            const count = accountsByRole.get(r)?.length ?? 0;
            return (
              <button
                key={r}
                onClick={() => selectRole(r)}
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
                  {roleMeta[r].icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{roleMeta[r].label}</div>
                  <div style={{ fontSize: 12.5, color: active ? "rgba(255,255,255,0.6)" : "#71717a" }}>
                    {count} tài khoản
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {visibleAccounts.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>Chọn tài khoản</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflow: "auto" }}>
              {visibleAccounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAccountId(a.id)}
                  disabled={!a.active}
                  style={{
                    textAlign: "left",
                    cursor: a.active ? "pointer" : "not-allowed",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${a.id === selected?.id ? "#0a0a0a" : "var(--ant-color-border)"}`,
                    background: a.id === selected?.id ? "#fafafa" : "#fff",
                    opacity: a.active ? 1 : 0.5,
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{a.name}{!a.active ? " · đã khoá" : ""}</div>
                  <div style={{ color: "#a1a1aa" }}>{a.scope}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <Input size="large" value={selected?.email ?? ""} readOnly variant="filled" />
          <Input.Password
            size="large"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="filled"
          />
          {selected?.mustChangePassword && (
            <div style={{ fontSize: 12, color: "#7a5b00" }}>
              Tài khoản này phải đổi mật khẩu ở lần đăng nhập này (mật khẩu tạm: demo1234).
            </div>
          )}
        </div>

        <Button
          type="primary"
          size="large"
          block
          loading={isLoading}
          disabled={!selected}
          icon={<LogIn size={18} />}
          onClick={handleLogin}
        >
          Đăng nhập {selected ? `— ${selected.name}` : ""}
        </Button>
      </div>
    </div>
  );
}
