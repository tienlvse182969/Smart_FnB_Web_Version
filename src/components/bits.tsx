import { Button, Card } from "antd";
import { Hammer } from "lucide-react";
import type { ReactNode } from "react";
import { palette, onBrandAlpha } from "../theme";

export const page: React.CSSProperties = { padding: 24 };

/** Placeholder for screens that are not built yet. */
export function EmptyState({ title }: { title: string }) {
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
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color ?? palette.brandPrimary }} />
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
