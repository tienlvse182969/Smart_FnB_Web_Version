/**
 * Bảng điều khiển MOCK chỉ có khi chạy `vite dev` (không vào bản build): đổi doanh nghiệp mock, ghi đè gói và hết hạn,
 * giả lập lỗi — để thử khoá tính năng, chế độ chỉ đọc, đổi nhận diện mà không cần BE.
 */
import { useState, useSyncExternalStore } from "react";
import { PLAN_TIER_LABEL, PLAN_TIER_ORDER, type PlanTier } from "../types";
import {
  getScenario,
  mockControl,
  setMockFailure,
  setScenario,
  subscribeScenario,
  type MockFailureKind,
  type MockProfileId,
} from "../api";
import { useAppStore } from "../store";
import { palette } from "../theme";

const FAILURES: { value: MockFailureKind | "none"; label: string }[] = [
  { value: "none", label: "Không" },
  { value: "network", label: "Mạng" },
  { value: "forbidden", label: "403" },
  { value: "quota", label: "Hạn mức" },
  { value: "server", label: "5xx" },
  { value: "unauthorized", label: "401" },
];

export default function MockPanel() {
  const scenario = useSyncExternalStore(subscribeScenario, getScenario);
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<MockFailureKind | "none">(mockControl.failure?.kind ?? "none");

  const apply = (patch: Parameters<typeof setScenario>[0]) => {
    setScenario(patch);
    // Nạp lại gói/nhận diện/menu theo kịch bản mới, không nhấp nháy màn hình chờ.
    void useAppStore.getState().loadScope({ silent: true });
  };

  const field = { display: "grid", gap: 4, marginBottom: 8, fontSize: 11.5 } as const;
  const select = { width: "100%", fontSize: 12, padding: "3px 4px" } as const;

  return (
    <div
      data-testid="mock-panel"
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 2000,
        background: palette.surface,
        color: palette.ink,
        border: `1px solid ${palette.line}`,
        borderRadius: 10,
        boxShadow: `0 4px 16px ${palette.line}`,
        fontSize: 12,
        width: open ? 230 : "auto",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ all: "unset", cursor: "pointer", padding: "6px 10px", fontWeight: 600, display: "block" }}
      >
        Mock {scenario.profile} · {scenario.tier ?? "mặc định"}
        {scenario.expired ? " · hết hạn" : ""} {open ? "▾" : "▸"}
      </button>
      {open && (
        <div style={{ padding: "4px 10px 10px" }}>
          <label style={field}>
            Doanh nghiệp mock
            <select
              data-testid="mock-profile"
              style={select}
              value={scenario.profile}
              onChange={(e) => apply({ profile: e.target.value as MockProfileId })}
            >
              <option value="A">A · Cà Phê Mộc Nhà (Nâng cao)</option>
              <option value="B">B · Trà Sữa BoBa Lab (Cơ bản)</option>
            </select>
          </label>
          <label style={field}>
            Gói
            <select
              data-testid="mock-tier"
              style={select}
              value={scenario.tier ?? ""}
              onChange={(e) => apply({ tier: (e.target.value || null) as PlanTier | null })}
            >
              <option value="">Mặc định của doanh nghiệp</option>
              {PLAN_TIER_ORDER.map((t) => (
                <option key={t} value={t}>
                  {t} · {PLAN_TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label style={{ ...field, gridAutoFlow: "column", justifyContent: "start", alignItems: "center", gap: 6 }}>
            <input
              data-testid="mock-expired"
              type="checkbox"
              checked={scenario.expired}
              onChange={(e) => apply({ expired: e.target.checked })}
            />
            Hết hạn (chỉ đọc)
          </label>
          <label style={field}>
            Lỗi giả lập (mọi lời gọi mock)
            <select
              data-testid="mock-failure"
              style={select}
              value={failure}
              onChange={(e) => {
                const kind = e.target.value as MockFailureKind | "none";
                setFailure(kind);
                setMockFailure(kind === "none" ? null : { kind, rate: 1 });
              }}
            >
              {FAILURES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
