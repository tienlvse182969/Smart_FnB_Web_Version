/** Thành phần dùng chung của các màn Platform Admin. */
import type { ReactNode } from "react";
import { REGISTRATION_STATUS_COLOR, TENANT_STATUS_COLOR, palette, type StatusColorKey } from "../../theme";
import type { RegistrationStatus, SubscriptionState } from "../../types";
import { formatDate } from "../../lib/reportFormat";

export function Chip({ tone, children }: { tone: StatusColorKey; children: ReactNode }) {
  return (
    <span
      style={{
        background: palette[tone].bg,
        color: palette[tone].text,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const REGISTRATION_LABEL: Record<RegistrationStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

export function RegistrationChip({ status }: { status: RegistrationStatus }) {
  const key = status.toLowerCase() as keyof typeof REGISTRATION_STATUS_COLOR;
  return <Chip tone={REGISTRATION_STATUS_COLOR[key]}>{REGISTRATION_LABEL[status]}</Chip>;
}

const SUBSCRIPTION_LABEL: Record<SubscriptionState, string> = {
  active: "Hoạt động",
  suspended: "Tạm ngưng · chỉ đọc",
  expired: "Hết hạn · chỉ đọc",
};

export function SubscriptionChip({ state }: { state: SubscriptionState }) {
  return <Chip tone={TENANT_STATUS_COLOR[state]}>{SUBSCRIPTION_LABEL[state]}</Chip>;
}

export const dash = (value: string | number | null | undefined) => (value === null || value === undefined || value === "" ? "—" : value);

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "7px 0", fontSize: 13.5 }}>
      <span style={{ color: palette.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: "right", overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

/** Ngày hết hạn dự kiến khi cộng `months` tháng vào mốc `from` (giống cách BE tính `addMonths`). */
export function addMonthsISO(from: Date, months: number): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export const dateLabel = (iso: string | null | undefined) => (iso ? formatDate(iso) : "—");
