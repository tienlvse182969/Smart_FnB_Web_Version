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
export function StatCard({
  label,
  value,
  hint,
  icon,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
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
