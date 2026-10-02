import { useEffect, useMemo, useState } from "react";
import type { OptionGroup } from "../../types";
import { defaultSelection, toggleOption, unitPrice, validateSelection } from "../../api/modules/options/rules";
import { formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";

const ruleText = (g: OptionGroup): string =>
  g.isRequired
    ? g.minSelections === g.maxSelections
      ? `Bắt buộc, chọn đúng ${g.maxSelections}`
      : `Bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`
    : `Không bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`;

/**
 * Xem trước kiểu POS (đặc tả 12.4): mở bảng tuỳ chọn với mặc định chọn sẵn, nhóm bắt buộc chưa đủ thì khoá nút thêm,
 * giá một ly = giá món + Σ giá cộng thêm (12.3). Chỉ để Owner thử cấu hình — không tạo đơn.
 */
export default function OptionPreview({ itemName, itemPrice, groups }: { itemName: string; itemPrice: number; groups: OptionGroup[] }) {
  // Cấu trúc nhóm đổi (thêm/bớt nhóm, đổi quy tắc, bật/tắt tuỳ chọn) thì chọn lại từ mặc định.
  const shape = JSON.stringify(groups);
  const initial = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, defaultSelection(g)])), [shape]);
  const [selected, setSelected] = useState<Record<string, string[]>>(initial);
  useEffect(() => setSelected(initial), [initial]);

  const errors = groups.flatMap((g) => validateSelection(g, selected[g.id] ?? []));
  const price = unitPrice(itemPrice, groups, groups.map((g) => ({ groupId: g.id, optionIds: selected[g.id] ?? [] })));

  return (
    <div data-testid="option-preview" style={{ border: `1px solid ${palette.line}`, borderRadius: 12, padding: 14, background: palette.paperSubtle }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{itemName || "Món mới"}</div>
      <div style={{ fontSize: 12, color: palette.textSubtle, marginBottom: 10 }}>Xem trước bảng tuỳ chọn tại POS (không tạo đơn)</div>
      {groups.length === 0 && <div style={{ fontSize: 13, color: palette.textMuted }}>Món chưa gắn nhóm tuỳ chọn.</div>}
      {groups.map((g) => (
        <div key={g.id} data-testid={`preview-group-${g.code}`} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {g.name} <span style={{ fontWeight: 400, color: palette.textSubtle }}>· {ruleText(g)}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {g.options.map((o) => {
              const on = (selected[g.id] ?? []).includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  data-testid={`preview-option-${g.code}:${o.code}`}
                  data-selected={on}
                  disabled={!o.isActive}
                  onClick={() => setSelected((cur) => ({ ...cur, [g.id]: toggleOption(g, cur[g.id] ?? [], o.id) }))}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 999,
                    fontSize: 13,
                    cursor: o.isActive ? "pointer" : "not-allowed",
                    border: `1px solid ${on ? palette.brandPrimary : palette.line}`,
                    background: on ? palette.brandPrimary : palette.surface,
                    color: on ? palette.onBrand : palette.textStrong,
                    opacity: o.isActive ? 1 : 0.45,
                    textDecoration: o.isActive ? "none" : "line-through",
                  }}
                >
                  {o.name}
                  {o.priceDelta > 0 ? ` +${formatVnd(o.priceDelta)}` : ""}
                  {!o.isActive ? " (ngừng bán)" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {errors.length > 0 && (
        <div data-testid="preview-errors" style={{ fontSize: 12.5, color: palette.error.text, marginBottom: 8 }}>
          {errors.join(" · ")}
        </div>
      )}
      <button
        type="button"
        data-testid="preview-add"
        disabled={errors.length > 0}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 10,
          border: "none",
          fontWeight: 600,
          cursor: errors.length ? "not-allowed" : "default",
          background: errors.length ? palette.line : palette.brandPrimary,
          color: errors.length ? palette.textSubtle : palette.onBrand,
        }}
      >
        Thêm vào giỏ · <span data-testid="preview-price">{formatVnd(price)}</span>
      </button>
    </div>
  );
}
