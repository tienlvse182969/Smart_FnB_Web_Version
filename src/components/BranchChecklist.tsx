import type { ReactNode } from "react";
import { Checkbox } from "antd";
import { palette } from "../theme";

export interface ChecklistBranch {
  id: string;
  name: string;
  address?: string;
}

/**
 * Danh sách chi nhánh để gán (món, combo…), có ô "Tất cả chi nhánh" ở đầu để chọn/bỏ chọn cả chuỗi một lần.
 * `extra` vẽ thêm dưới từng chi nhánh (vd. cảnh báo combo thiếu món ở chi nhánh đó).
 */
export default function BranchChecklist({
  branches,
  value,
  onChange,
  extra,
  gap = 10,
  testId = "branch-checklist",
}: {
  branches: ChecklistBranch[];
  value: string[];
  onChange: (ids: string[]) => void;
  extra?: (branch: ChecklistBranch, checked: boolean) => ReactNode;
  gap?: number;
  testId?: string;
}) {
  const ids = branches.map((b) => b.id);
  const chosen = ids.filter((id) => value.includes(id)).length;
  const all = ids.length > 0 && chosen === ids.length;
  const toggle = (id: string, checked: boolean) => onChange(checked ? [...value.filter((v) => v !== id), id] : value.filter((v) => v !== id));

  return (
    <div style={{ display: "grid", gap }} data-testid={testId}>
      {branches.length > 1 && (
        <div style={{ paddingBottom: gap, borderBottom: `1px solid ${palette.lineSubtle}` }}>
          <Checkbox
            data-testid={`${testId}-all`}
            checked={all}
            indeterminate={chosen > 0 && !all}
            // Giữ các id ngoài danh sách (nếu có) để không làm mất dữ liệu đang lưu.
            onChange={(e) => onChange(e.target.checked ? [...new Set([...value, ...ids])] : value.filter((v) => !ids.includes(v)))}
          >
            <b>Tất cả chi nhánh</b> <span style={{ color: palette.textSubtle }}>({chosen}/{ids.length})</span>
          </Checkbox>
        </div>
      )}
      {branches.map((b) => {
        const checked = value.includes(b.id);
        return (
          <div key={b.id}>
            <Checkbox data-testid={`${testId}-${b.id}`} checked={checked} onChange={(e) => toggle(b.id, e.target.checked)}>
              {b.name}
              {b.address && <div style={{ fontSize: 12, color: palette.textSubtle }}>{b.address}</div>}
            </Checkbox>
            {extra?.(b, checked)}
          </div>
        );
      })}
    </div>
  );
}
