import type { ReactNode } from "react";
import { Avatar, Badge, Dropdown, Input, Layout, Menu } from "antd";
import { Bell, CalendarDays, LogOut, Search, Store, UtensilsCrossed } from "lucide-react";
import { roleMeta, type RoleKey } from "../data";

const { Sider, Header, Content } = Layout;

export type NavItem = { key: string; label: string; icon: ReactNode };

const today = new Date().toLocaleDateString("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});

export default function RoleShell({
  role,
  nav,
  section,
  onSection,
  onLogout,
  searchPlaceholder = "Tìm kiếm…",
  branchChip,
  footer,
  children,
}: {
  role: RoleKey;
  nav: NavItem[];
  section: string;
  onSection: (key: string) => void;
  onLogout: () => void;
  searchPlaceholder?: string;
  branchChip?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const meta = roleMeta[role];

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        width={244}
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          flex: "0 0 244px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "22px 20px 18px",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: "#fff",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <UtensilsCrossed size={19} color="#0a0a0a" />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Smart F&amp;B</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              Chain Platform
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[section]}
            onClick={(e) => onSection(e.key)}
            style={{ border: "none", background: "transparent", padding: "0 12px" }}
            items={nav.map((n) => ({ key: n.key, icon: n.icon, label: n.label }))}
          />
        </div>

        {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
      </Sider>

      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            height: 68,
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            borderBottom: "1px solid var(--ant-color-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{meta.label}</div>
            <div style={{ fontSize: 12, color: "#71717a" }}>{meta.scope}</div>
          </div>

          {branchChip && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#0a0a0a",
                color: "#fff",
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <Store size={14} />
              {branchChip}
            </span>
          )}

          <Input
            prefix={<Search size={16} color="#a1a1aa" />}
            placeholder={searchPlaceholder}
            variant="filled"
            style={{ maxWidth: 340, marginLeft: 24 }}
          />

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                color: "#52525b",
                textTransform: "capitalize",
              }}
            >
              <CalendarDays size={16} color="#a1a1aa" />
              {today}
            </div>
            <Badge dot color="#0a0a0a">
              <Bell size={19} color="#3f3f46" />
            </Badge>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "who", label: meta.label, disabled: true },
                  { type: "divider" },
                  {
                    key: "logout",
                    icon: <LogOut size={15} />,
                    label: "Đăng xuất",
                    onClick: onLogout,
                  },
                ],
              }}
            >
              <Avatar
                style={{ background: "#0a0a0a", fontWeight: 600, cursor: "pointer" }}
                size={36}
              >
                {meta.label[0]}
              </Avatar>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            background: "var(--ant-layout-body-bg)",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
