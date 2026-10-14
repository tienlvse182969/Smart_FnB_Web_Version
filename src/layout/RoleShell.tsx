import { useState, type ReactNode } from "react";
import { Avatar, Badge, Button, Dropdown, Grid, Input, Layout, Menu } from "antd";
import { Bell, CalendarDays, LogOut, Menu as MenuIcon, Search, Store, User, UtensilsCrossed } from "lucide-react";
import { roleMeta } from "../data";
import type { RoleKey } from "../types";
import ChangePasswordModal from "../auth/ChangePasswordModal";
import ReadOnlyBanner from "../plan/ReadOnlyBanner";
import ExpiringBanner from "../plan/ExpiringBanner";
import { onBrandAlpha, useBrand, palette } from "../theme";

const { Sider, Header, Content } = Layout;

/** `badge` > 0 hiện số đếm cạnh nhãn (ví dụ "Đơn cần xử lý", lượt 7.5); 0/null/không có = không hiện. */
export type NavItem = { key: string; label: string; icon: ReactNode; badge?: number | null };

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
  // Điện thoại (7.9): dưới 768px thanh bên thu thành ngăn kéo, mở bằng nút ở đầu trang.
  const narrow = Grid.useBreakpoint().md === false;
  const [navOpen, setNavOpen] = useState(false);

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
      {narrow && navOpen && (
        <div
          data-testid="nav-backdrop"
          onClick={() => setNavOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 999, background: `color-mix(in srgb, ${palette.ink} 45%, transparent)` }}
        />
      )}
      <Sider
        width={244}
        collapsedWidth={0}
        collapsed={narrow && !navOpen}
        trigger={null}
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          ...(narrow
            ? { position: "fixed" as const, left: 0, top: 0, zIndex: 1000, visibility: navOpen ? ("visible" as const) : ("hidden" as const) }
            : { flex: "0 0 244px" }),
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
            onClick={(e) => {
              onSection(e.key);
              setNavOpen(false);
            }}
            style={{ border: "none", background: "transparent", padding: "0 12px" }}
            items={nav.map((n) => ({
              key: n.key,
              icon: n.icon,
              label:
                n.badge && n.badge > 0 ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {n.label}
                    <Badge count={n.badge} overflowCount={99} data-testid={`nav-badge-${n.key}`} style={{ boxShadow: "none" }} />
                  </span>
                ) : (
                  n.label
                ),
            }))}
          />
        </div>

        {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
      </Sider>

      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            height: 68,
            padding: narrow ? "0 12px" : "0 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            borderBottom: "1px solid var(--ant-color-border)",
            flexShrink: 0,
          }}
        >
          {narrow && (
            <Button
              type="text"
              aria-label="Mở menu"
              data-testid="nav-toggle"
              icon={<MenuIcon size={20} />}
              onClick={() => setNavOpen(true)}
            />
          )}
          <div style={{ lineHeight: 1.2, minWidth: 0, whiteSpace: "nowrap", display: narrow && branchChip ? "none" : undefined }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{meta.label}</div>
            {!narrow && <div style={{ fontSize: 12, color: palette.textMuted }}>{meta.scope}</div>}
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
                lineHeight: 1.3,
                minWidth: 0,
                maxWidth: narrow ? "58vw" : undefined,
                overflow: "hidden",
                textOverflow: "ellipsis",
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
            style={{ maxWidth: 340, marginLeft: 24, display: narrow ? "none" : undefined }}
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
              {!narrow && <CalendarDays size={16} color={palette.textSubtle} />}
              {!narrow && today}
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

        <ReadOnlyBanner />
        {(role === "owner" || role === "manager") && <ExpiringBanner />}

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
