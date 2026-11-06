import { InputNumber, Select, Tag } from "antd";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { ItemExtraLink, MenuExtra } from "../../types";
import { DEFAULT_MAX_EXTRAS, MAX_ITEM_EXTRAS_TOTAL, MAX_PORTIONS, MIN_PORTIONS } from "../../api/modules/extras/rules";
import MoneyInput from "../../components/MoneyInput";
import ActionButton from "../../plan/ActionButton";
import { palette } from "../../theme";

export interface ItemExtrasValue {
  maxExtras: number | null;
  links: ItemExtraLink[];
}

/** Lỗi đầu tiên của cấu hình đang nhập (cùng ngưỡng BE), hoặc null. Dùng để khoá nút Lưu món. */
export function itemExtrasProblem(value: ItemExtrasValue): string | null {
  if (value.maxExtras === null || !Number.isInteger(value.maxExtras) || value.maxExtras < 0 || value.maxExtras > MAX_ITEM_EXTRAS_TOTAL) {
    return `Tổng số phần topping tối đa phải từ 0 đến ${MAX_ITEM_EXTRAS_TOTAL}`;
  }
  for (const link of value.links) {
    if (!Number.isInteger(link.price) || link.price < 0) return `Giá cộng thêm của "${link.name}" phải là số nguyên đồng, từ 0 trở lên`;
    if (!Number.isInteger(link.maxQuantity) || link.maxQuantity < MIN_PORTIONS || link.maxQuantity > MAX_PORTIONS) {
      return `Số phần tối đa của "${link.name}" phải từ ${MIN_PORTIONS} đến ${MAX_PORTIONS}`;
    }
  }
  return null;
}

/** Dạng so sánh để biết cấu hình có đổi không (thứ tự có nghĩa). */
export const itemExtrasKey = (value: ItemExtrasValue): string =>
  JSON.stringify([value.maxExtras, value.links.map((l) => [l.extraId, l.price, l.maxQuantity])]);

/**
 * OW-15 (mục 27.2): topping gắn vào món — chọn từ thư viện, giá cộng thêm (mặc định lấy giá thư viện, sửa được), số phần tối đa mỗi ly
 * 1–5, thứ tự hiển thị, và tổng số phần topping tối đa của món (mặc định 5). Topping đang tắt cấp chuỗi vẫn hiện, kèm nhãn "Đang tắt".
 */
export default function ItemExtrasEditor({
  library,
  value,
  onChange,
}: {
  library: MenuExtra[];
  value: ItemExtrasValue;
  onChange: (next: ItemExtrasValue) => void;
}) {
  const { links } = value;
  const set = (next: ItemExtraLink[]) => onChange({ ...value, links: next });
  const patch = (index: number, change: Partial<ItemExtraLink>) => set(links.map((l, i) => (i === index ? { ...l, ...change } : l)));
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target], next[index]];
    set(next);
  };
  const available = library.filter((x) => !links.some((l) => l.extraId === x.id));
  const problem = itemExtrasProblem(value);

  return (
    <div data-testid="item-extras">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13 }}>Tổng số phần topping tối đa mỗi ly</span>
        <InputNumber
          size="small"
          min={0}
          max={MAX_ITEM_EXTRAS_TOTAL}
          precision={0}
          value={value.maxExtras}
          onChange={(v) => onChange({ ...value, maxExtras: v })}
          aria-label="Tổng số phần topping tối đa"
          data-testid="item-extras-max"
          style={{ width: 70 }}
        />
        <span style={{ fontSize: 12, color: palette.textSubtle }}>(mặc định {DEFAULT_MAX_EXTRAS})</span>
      </div>

      {links.length === 0 && <div style={{ fontSize: 12.5, color: palette.textSubtle, marginBottom: 8 }}>Món này chưa gắn topping nào.</div>}
      <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
        {links.map((link, i) => (
          <div
            key={link.extraId}
            data-testid={`item-extra-${link.extraId}`}
            style={{ border: `1px solid ${palette.line}`, borderRadius: 10, padding: 8, display: "grid", gap: 6, opacity: link.libraryActive ? 1 : 0.8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={13} />} disabled={i === 0} onClick={() => move(i, -1)} />
              <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={13} />} disabled={i === links.length - 1} onClick={() => move(i, 1)} />
              <span style={{ flex: 1, fontWeight: 600 }}>
                {link.name}
                {!link.libraryActive && (
                  <Tag color="warning" style={{ marginLeft: 8 }}>
                    Đang tắt
                  </Tag>
                )}
              </span>
              <ActionButton size="small" aria-label={`Gỡ topping ${link.name}`} icon={<X size={13} />} onClick={() => set(links.filter((_, idx) => idx !== i))} />
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontSize: 12, color: palette.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                Giá cộng thêm (₫)
                <span style={{ width: 120 }}>
                  <MoneyInput size="small" value={link.price} onChange={(v) => patch(i, { price: v ?? 0 })} aria-label={`Giá cộng thêm ${link.name}`} />
                </span>
              </label>
              <label style={{ fontSize: 12, color: palette.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                Tối đa
                <InputNumber
                  size="small"
                  min={MIN_PORTIONS}
                  max={MAX_PORTIONS}
                  precision={0}
                  value={link.maxQuantity}
                  onChange={(v) => patch(i, { maxQuantity: v ?? MIN_PORTIONS })}
                  aria-label={`Số phần tối đa ${link.name}`}
                  style={{ width: 60 }}
                />
                phần/ly
              </label>
            </div>
          </div>
        ))}
      </div>

      <Select
        style={{ width: "100%" }}
        placeholder={library.length ? "Thêm topping từ thư viện…" : "Chưa có topping — tạo ở màn Topping thêm"}
        value={null}
        onChange={(id: string) => {
          const extra = library.find((x) => x.id === id);
          if (extra) set([...links, { extraId: extra.id, name: extra.name, libraryActive: extra.isActive, price: extra.price, maxQuantity: MIN_PORTIONS }]);
        }}
        options={available.map((x) => ({ value: x.id, label: x.isActive ? x.name : `${x.name} (đang tắt)` }))}
        data-testid="item-extra-add"
      />
      {problem && (
        <div data-testid="item-extras-problem" style={{ fontSize: 12, color: palette.error.text, marginTop: 6 }}>
          {problem}
        </div>
      )}
      <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6 }}>
        Giá mặc định lấy từ thư viện lúc gắn và sửa được riêng cho món này. Lưu cùng nút Lưu món.
      </div>
    </div>
  );
}
