import { useState, type ReactNode } from "react";
import { Avatar, Badge, Dropdown, Input, Layout, Menu } from "antd";
import { Bell, CalendarDays, LogOut, Search, Store, User, UtensilsCrossed } from "lucide-react";
import { roleMeta } from "../data";
import type { RoleKey } from "../types";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import { onBrandAlpha, useBrand, palette } from "../theme";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const brand = useBrand();

  // Nhận diện đã được giải quyết ở một chỗ (theme/resolveBrand): Admin và doanh nghiệp không
  // có/không được dùng nhận diện riêng nhận nhận diện nền tảng (BR-41, BR-44).
  const showTenantBrand = brand.custom;
  const brandName = brand.displayName;
  const brandLogo = brand.logo;

  // Chữ trên thanh bên đã được chọn trắng/đen theo tương phản với màu thương hiệu (BR-43).
  const siderFg = palette.onBrand;
  const siderFgDim = onBrandAlpha(55);
  const siderBtnBg = onBrandAlpha(10);

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sider
        width={244}
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          flex: "0 0 244px",
          ["--sider-fg" as string]: siderFg,
          ["--sider-fg-dim" as string]: siderFgDim,
          ["--sider-btn-bg" as string]: siderBtnBg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "22px 20px 18px",
            color: "var(--sider-fg)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: palette.surface,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {brandLogo ? (
              <img src={brandLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <UtensilsCrossed size={19} color={palette.brandPrimary} />
            )}
          </div>
          <div style={{ lineHeight: 1.15, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {brandName}
            </div>
            <div style={{ fontSize: 11, color: "var(--sider-fg-dim)" }}>
              {showTenantBrand ? "Smart F&B Chain Platform" : "Chain Platform"}
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
            <div style={{ fontSize: 12, color: palette.textMuted }}>{meta.scope}</div>
          </div>

          {branchChip && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: palette.brandPrimary,
                color: palette.onBrand,
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
            prefix={<Search size={16} color={palette.textSubtle} />}
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
                color: palette.textStrong,
                textTransform: "capitalize",
              }}
            >
              <CalendarDays size={16} color={palette.textSubtle} />
              {today}
            </div>
            <Badge dot color={palette.brandPrimary}>
              <Bell size={19} color={palette.textStrong} />
            </Badge>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "who", label: meta.label, disabled: true },
                  { type: "divider" },
                  {
                    key: "profile",
                    icon: <User size={15} />,
                    label: "Hồ sơ cá nhân",
                    onClick: () => setProfileOpen(true),
                  },
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
                style={{ background: palette.brandPrimary, fontWeight: 600, cursor: "pointer" }}
                size={36}
              >
                {meta.label[0]}
              </Avatar>
            </Dropdown>
          </div>
        </Header>

        <ChangePasswordModal open={profileOpen} onClose={() => setProfileOpen(false)} />

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
