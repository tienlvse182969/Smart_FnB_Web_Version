import { Button, Card } from "antd";
import { Hammer } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";
import { palette, onBrandAlpha } from "../theme";

export const page: React.CSSProperties = { padding: 24 };

/** Badge/nhãn nhỏ ngoài thanh bên: nền accent, chữ tự chọn trắng/đậm theo tương phản. */
export function AccentBadge({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <span
      data-testid={testId}
      style={{
        display: "inline-block",
        minWidth: 20,
        padding: "0 8px",
        borderRadius: 999,
        background: palette.brandAccent,
        color: palette.accentInk,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: "20px",
        textAlign: "center",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </span>
  );
}

/** Số tiền/số lượng căn phải, chữ số đều nhau để cột dễ so sánh. */
export const numericCell: React.CSSProperties = { textAlign: "right", fontVariantNumeric: "tabular-nums" };

/** Breadcrumb của trang hiện tại (vd ["Thực đơn", "Topping"]); RoleLayout cấp cho trang nằm trong một nhóm sidebar. */
export const PageCrumbContext = createContext<string[] | null>(null);

/**
 * Header thống nhất của trang con: breadcrumb nhỏ (nếu trang nằm trong nhóm), tiêu đề, mô tả ngắn,
 * nút hành động ở góc phải.
 */
export function PageHeader({ title, sub, extra }: { title: string; sub?: ReactNode; extra?: ReactNode }) {
  const crumbs = useContext(PageCrumbContext);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Vị trí trang" data-testid="page-breadcrumb" style={{ fontSize: 12.5, color: palette.textMuted, marginBottom: 2 }}>
            {crumbs.join(" / ")}
          </nav>
        )}
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.3, color: palette.ink }}>{title}</h1>
        {sub && <div style={{ fontSize: 13.5, color: palette.textMuted, marginTop: 4 }}>{sub}</div>}
      </div>
      {extra && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{extra}</div>}
    </div>
  );
}

/** Thanh công cụ của một tab nhúng trong trang (không có tiêu đề riêng): mô tả bên trái, nút bên phải. */
export function ToolbarRow({ sub, extra }: { sub?: ReactNode; extra?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, color: palette.textMuted, minWidth: 0 }}>{sub}</div>
      {extra}
    </div>
  );
}

/**
 * Trạng thái trống dùng chung: icon, một câu, và nút chính khi vai trò được phép tạo/làm bước tiếp theo.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  actionNode,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void; icon?: ReactNode } | null;
  /** Nút tự dựng (vd ActionButton đã gắn khoá theo gói/chế độ chỉ đọc), dùng thay cho `action`. */
  actionNode?: ReactNode;
}) {
  return (
    <div
      data-testid="empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 10,
        padding: "40px 16px",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 13,
          background: palette.paper,
          display: "grid",
          placeItems: "center",
          color: palette.textMuted,
        }}
      >
        {icon ?? <Hammer size={24} />}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: palette.ink }}>{title}</div>
      {description && <div style={{ fontSize: 13.5, color: palette.textMuted, maxWidth: 420 }}>{description}</div>}
      {actionNode ? <div style={{ marginTop: 4 }}>{actionNode}</div> : null}
      {!actionNode && action && (
        <Button type="primary" icon={action.icon} onClick={action.onClick} style={{ marginTop: 4 }}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/** Placeholder for screens that are not built yet. */
export function PlaceholderState({ title }: { title: string }) {
  return (
    <>
      <SectionTitle title={title} />
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div
          style={{
            minHeight: 320,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: palette.textSubtle,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 13,
              background: palette.paper,
              display: "grid",
              placeItems: "center",
              color: palette.textMuted,
            }}
          >
            <Hammer size={24} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: palette.textMuted }}>
            Đang xây dựng
          </div>
        </div>
      </Card>
    </>
  );
}

/** Section heading with optional trailing controls. */
export function SectionTitle({
  title,
  sub,
  extra,
}: {
  title: string;
  sub?: string;
  extra?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: palette.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
      {extra}
    </div>
  );
}

/** Compact KPI tile in the monochrome style. */
/** Thay đổi so với kỳ trước. `ratio` null = không so được (kỳ trước bằng 0). `higherIsBetter=false` cho số càng thấp càng tốt (vd. tiền hoàn). */
export interface StatDelta {
  ratio: number | null;
  higherIsBetter?: boolean;
  label?: string;
}

export function DeltaBadge({ delta, onBrand }: { delta: StatDelta; onBrand?: boolean }) {
  const label = delta.label ?? "so với kỳ trước";
  if (delta.ratio === null)
    return <span data-testid="stat-delta" style={{ color: onBrand ? onBrandAlpha(60) : palette.textSubtle }}>— {label}</span>;
  const up = delta.ratio > 0;
  const flat = Math.abs(delta.ratio) < 0.0005;
  const good = flat ? null : up === (delta.higherIsBetter ?? true);
  const color = onBrand ? palette.onBrand : good === null ? palette.textMuted : good ? palette.success.text : palette.error.text;
  const text = `${flat ? "±" : up ? "▲ +" : "▼ −"}${Math.abs(delta.ratio * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  return (
    <span data-testid="stat-delta" data-direction={flat ? "flat" : up ? "up" : "down"} style={{ color, fontWeight: 600 }}>
      {text} <span style={{ fontWeight: 400, color: onBrand ? onBrandAlpha(60) : palette.textSubtle }}>{label}</span>
    </span>
  );
}

/** Thanh ngang theo token theme, thay cho `<progress>`/`<meter>` của trình duyệt (màu và ý nghĩa không theo theme). */
export function ShareBar({ value, max, color, label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (100 * value) / max)) : 0;
  return (
    <div role="img" aria-label={label} data-testid="share-bar" style={{ height: 8, borderRadius: 4, background: palette.paperSubtle, marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color ?? palette.chartMain }} />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  emphasis,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
  /** Tuỳ chọn: so với kỳ trước, hiện dưới con số. */
  delta?: StatDelta;
}) {
  return (
    <Card
      styles={{ body: { padding: 18 } }}
      style={{
        borderRadius: 14,
        background: emphasis ? palette.brandPrimary : palette.surface,
        color: emphasis ? palette.onBrand : undefined,
        borderColor: emphasis ? palette.brandPrimary : undefined,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 12.5,
            color: emphasis ? onBrandAlpha(60) : palette.textMuted,
          }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: emphasis ? onBrandAlpha(75) : palette.textSubtle }}>{icon}</span>
        )}
      </div>
      <div style={{ fontSize: 27, fontWeight: 700, marginTop: 10, letterSpacing: -0.5 }}>
        {value}
      </div>
      {delta && (
        <div style={{ fontSize: 12, marginTop: 4 }}>
          <DeltaBadge delta={delta} onBrand={emphasis} />
        </div>
      )}
      {hint && (
        <div
          style={{
            fontSize: 12,
            marginTop: 6,
            color: emphasis ? onBrandAlpha(55) : palette.textSubtle,
          }}
        >
          {hint}
        </div>
      )}
    </Card>
  );
}
