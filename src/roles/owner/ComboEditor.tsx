import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, App, Drawer, Input, InputNumber, Radio, Segmented, Select, Switch, Tag } from "antd";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import type { Combo, ComboComponent, MenuCategory, MenuItem } from "../../types";
import { combosApi, optionsApi, showApiError } from "../../api";
import {
  MAX_COMBO_DESCRIPTION,
  MAX_COMBO_IMAGE_URL,
  MAX_COMBO_NAME,
  MAX_COMPONENTS,
  MAX_COMPONENT_NAME,
  MAX_QUANTITY,
  MAX_VARIANTS,
  MIN_COMPONENTS,
  MIN_QUANTITY,
  comboProblems,
  commonSizeCodes,
  disabledChoiceItems,
  retailTotal,
} from "../../api/modules/combos/rules";
import MoneyInput from "../../components/MoneyInput";
import { money } from "../../data";
import { UNSAVED_PROMPT, useUnsavedGuard } from "../../lib/useUnsavedGuard";
import ActionButton from "../../plan/ActionButton";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

/** Thành phần đang soạn: dòng món có thể chưa chọn (`menuItemId` rỗng). `key` chỉ để React phân biệt. */
interface Draft extends ComboComponent {
  key: string;
}

let seq = 0;
const newKey = () => `c${++seq}`;
const blankChoice = (isDefault: boolean) => ({ menuItemId: "", surcharge: 0, isDefault });
const blankFixed = (): Draft => ({ key: newKey(), type: "FIXED", name: "", quantity: 1, fixedSizeCode: null, choices: [blankChoice(true)] });
const blankChoiceComponent = (): Draft => ({
  key: newKey(),
  type: "CHOICE",
  name: "",
  quantity: 1,
  fixedSizeCode: null,
  choices: [blankChoice(true), blankChoice(false)],
});
const toDrafts = (combo: Combo | null): Draft[] => (combo ? combo.components.map((c) => ({ ...structuredClone(c), key: newKey() })) : [blankFixed(), blankFixed()]);

/** Chuẩn hoá thành thân gửi: thành phần cố định lấy tên của món. */
const toComponents = (drafts: Draft[], items: MenuItem[]): ComboComponent[] =>
  drafts.map(({ key: _key, ...c }) => ({
    ...c,
    name: c.type === "FIXED" ? (items.find((x) => x.id === c.choices[0]?.menuItemId)?.name ?? c.name).slice(0, MAX_COMPONENT_NAME) : c.name,
  }));

interface Props {
  /** `"new"` = tạo mới; `Combo` = sửa; `null` = đóng. */
  target: Combo | "new" | null;
  categories: MenuCategory[];
  items: MenuItem[];
  onClose: () => void;
  onSaved: (text: string) => Promise<void>;
}

/**
 * OW-14 (mục 26, BR-77): soạn combo — thông tin chung, 2–6 thành phần (món cố định hoặc nhóm biến thể 2–10 món, mỗi món một phụ thu và đúng
 * một món mặc định), size cố định chỉ trong size của món, không chọn combo làm thành phần. Hiện so sánh giá combo với mua lẻ (theo giá chuỗi)
 * và cảnh báo món thành phần đang tắt cấp chuỗi. Ảnh combo chỉ nhận địa chỉ ảnh vì BE chưa có tải ảnh lên.
 */
export default function ComboEditor({ target, categories, items, onClose, onSaved }: Props) {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const isNew = target === "new";
  const existing = target && target !== "new" ? target : null;

  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const [initialKey, setInitialKey] = useState("");
  /** Size của từng món (nhóm SIZE đang bật), nạp khi món được chọn. */
  const [sizes, setSizes] = useState<Map<string, { code: string; name: string }[]>>(new Map());
  const requested = useRef(new Set<string>());

  const snapshot = (parts: { categoryId?: string; name: string; description: string; imageUrl: string; price: number | null; isActive: boolean; drafts: Draft[] }) =>
    JSON.stringify([parts.categoryId, parts.name, parts.description, parts.imageUrl, parts.price, parts.isActive, parts.drafts.map(({ key: _k, ...c }) => c)]);

  useEffect(() => {
    if (!target) return;
    const start = {
      categoryId: existing?.categoryId ?? categories[0]?.id,
      name: existing?.name ?? "",
      description: existing?.description ?? "",
      imageUrl: existing?.imageUrl ?? "",
      price: existing?.price ?? null,
      isActive: existing?.isActive ?? true,
      drafts: toDrafts(existing),
    };
    setCategoryId(start.categoryId);
    setName(start.name);
    setDescription(start.description);
    setImageUrl(start.imageUrl);
    setPrice(start.price);
    setIsActive(start.isActive);
    setDrafts(start.drafts);
    setInitialKey(snapshot(start));
    // Chỉ khởi tạo lại khi mở một combo khác.
  }, [target]);

  const chosenIds = useMemo(() => [...new Set(drafts.flatMap((d) => d.choices.map((c) => c.menuItemId)).filter(Boolean))], [drafts]);

  // Nạp size của các món vừa được chọn (một lần cho mỗi món).
  useEffect(() => {
    if (!chainId) return;
    const missing = chosenIds.filter((id) => !requested.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => requested.current.add(id));
    void Promise.all(
      missing.map(async (id) => {
        try {
          const groups = await optionsApi.listItemGroups(chainId, id);
          const size = groups.find((g) => g.isActive && g.code.toUpperCase() === "SIZE");
          return [id, (size?.options ?? []).filter((o) => o.isActive).map((o) => ({ code: o.code, name: o.name }))] as const;
        } catch {
          requested.current.delete(id);
          return null;
        }
      }),
    ).then((rows) =>
      setSizes((cur) => {
        const next = new Map(cur);
        for (const row of rows) if (row) next.set(row[0], [...row[1]]);
        return next;
      }),
    );
  }, [chosenIds, chainId]);

  const components = useMemo(() => toComponents(drafts, items), [drafts, items]);
  const problems = comboProblems({ name, categoryId: categoryId ?? "", price: price ?? Number.NaN, components, description, imageUrl });
  const dirty = !!target && snapshot({ categoryId, name, description, imageUrl, price, isActive, drafts }) !== initialKey;
  useUnsavedGuard(dirty);

  const itemPrice = (id: string) => items.find((x) => x.id === id)?.price;
  const retail = retailTotal(components, itemPrice);
  const full = price !== null && retail > 0 ? { retail, diff: retail - price } : null;

  const patchDraft = (key: string, change: Partial<Draft>) => setDrafts((cur) => cur.map((d) => (d.key === key ? { ...d, ...change } : d)));
  const moveDraft = (index: number, delta: -1 | 1) =>
    setDrafts((cur) => {
      const to = index + delta;
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });

  const requestClose = () => {
    if (saving) return;
    if (!dirty) return onClose();
    modal.confirm({ title: "Bỏ thay đổi?", content: UNSAVED_PROMPT, okText: "Bỏ thay đổi", okButtonProps: { danger: true }, cancelText: "Ở lại", onOk: onClose });
  };

  const save = async () => {
    if (!chainId || saving || problems.length || price === null || !categoryId) return;
    setSaving(true);
    try {
      const common = { categoryId, name: name.trim(), description: description.trim() || null, imageUrl: imageUrl.trim() || null, price, isActive, components };
      if (existing) await combosApi.updateCombo(chainId, existing.id, common);
      else await combosApi.createCombo(chainId, common);
      await onSaved(existing ? "Đã cập nhật combo" : "Đã tạo combo — mặc định bán ở mọi chi nhánh đang hoạt động");
    } catch (err) {
      showApiError(message.error, err, "Không lưu được combo");
    } finally {
      setSaving(false);
    }
  };

  const itemOptions = (taken: string[]) =>
    items.map((x) => ({
      value: x.id,
      disabled: taken.includes(x.id),
      label: `${x.name} · ${money(x.price)}${x.isActive ? "" : " (đang tắt)"}`,
    }));

  return (
    <Drawer
      title={isNew ? "Thêm combo" : `Sửa combo · ${existing?.name ?? ""}`}
      open={!!target}
      onClose={requestClose}
      maskClosable={false}
      styles={{ wrapper: { width: 620 }, body: { padding: 24 } }}
      data-testid="combo-editor"
    >
      <Field label="Tên combo">
        <Input value={name} maxLength={MAX_COMBO_NAME} onChange={(e) => setName(e.target.value)} placeholder="VD: Combo Sáng" data-testid="combo-name" />
      </Field>
      <Field label="Danh mục hiển thị trên POS">
        <Select
          style={{ width: "100%" }}
          value={categoryId}
          onChange={setCategoryId}
          placeholder={categories.length ? "Chọn danh mục" : "Chưa có danh mục — tạo ở màn Danh mục món"}
          options={categories.map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (đang ẩn)` }))}
        />
      </Field>
      <Field label="Giá combo (₫, số nguyên) — giá chuỗi">
        <MoneyInput value={price} onChange={setPrice} data-testid="combo-price" />
      </Field>
      <Field label="Mô tả">
        <Input.TextArea value={description} maxLength={MAX_COMBO_DESCRIPTION} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Ảnh combo (địa chỉ ảnh)">
        <Input value={imageUrl} maxLength={MAX_COMBO_IMAGE_URL} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 4 }}>Máy chủ chưa có chức năng tải ảnh combo lên, nên chỉ dán được địa chỉ ảnh.</div>
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Switch size="small" checked={isActive} onChange={setIsActive} aria-label="Kinh doanh combo" />
        <span style={{ fontSize: 13 }}>{isActive ? "Đang kinh doanh (cấp chuỗi)" : "Đang tắt — mọi chi nhánh ngừng bán"}</span>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 8px" }}>
        Thành phần ({drafts.length}/{MAX_COMPONENTS}, tối thiểu {MIN_COMPONENTS})
      </div>
      <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        {drafts.map((draft, index) => {
          const taken = draft.choices.map((c) => c.menuItemId).filter(Boolean);
          const common = commonSizeCodes(sizes, taken);
          const offNames = disabledChoiceItems(draft, items);
          return (
            <div key={draft.key} data-testid={`combo-component-${index}`} style={{ border: `1px solid ${palette.line}`, borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b>Thành phần {index + 1}</b>
                <Segmented
                  size="small"
                  value={draft.type}
                  onChange={(type) =>
                    patchDraft(draft.key, type === "FIXED"
                      ? { type: "FIXED", choices: [{ ...(draft.choices[0] ?? blankChoice(true)), isDefault: true, surcharge: 0 }], fixedSizeCode: null }
                      : { type: "CHOICE", choices: draft.choices.length >= 2 ? draft.choices : [...draft.choices, blankChoice(false)] })
                  }
                  options={[
                    { label: "Món cố định", value: "FIXED" },
                    { label: "Nhóm biến thể", value: "CHOICE" },
                  ]}
                />
                <span style={{ flex: 1 }} />
                <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={13} />} disabled={index === 0} onClick={() => moveDraft(index, -1)} />
                <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={13} />} disabled={index === drafts.length - 1} onClick={() => moveDraft(index, 1)} />
                <ActionButton size="small" danger aria-label={`Xoá thành phần ${index + 1}`} icon={<Trash2 size={13} />} onClick={() => setDrafts((cur) => cur.filter((d) => d.key !== draft.key))} />
              </div>

              {offNames.length > 0 && (
                <Alert type="warning" showIcon data-testid={`combo-component-off-${index}`} message={`Món đang tắt cấp chuỗi: ${offNames.join(", ")}. Combo sẽ không bán được phần này.`} />
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 12.5, color: palette.textMuted, display: "flex", gap: 6, alignItems: "center" }}>
                  Số lượng
                  <InputNumber size="small" min={MIN_QUANTITY} max={MAX_QUANTITY} precision={0} value={draft.quantity} onChange={(v) => patchDraft(draft.key, { quantity: v ?? MIN_QUANTITY })} aria-label={`Số lượng thành phần ${index + 1}`} style={{ width: 60 }} />
                </label>
                {draft.type === "CHOICE" && (
                  <Input
                    size="small"
                    style={{ flex: 1, minWidth: 160 }}
                    maxLength={MAX_COMPONENT_NAME}
                    value={draft.name}
                    onChange={(e) => patchDraft(draft.key, { name: e.target.value })}
                    placeholder="Tên nhóm, VD: Đồ uống"
                    aria-label={`Tên nhóm thành phần ${index + 1}`}
                  />
                )}
              </div>

              {draft.choices.map((choice, ci) => (
                <div key={ci} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ flex: 1, minWidth: 200 }}
                    placeholder="Chọn món"
                    value={choice.menuItemId || undefined}
                    options={itemOptions(taken.filter((id) => id !== choice.menuItemId))}
                    onChange={(id: string) =>
                      patchDraft(draft.key, { choices: draft.choices.map((c, i) => (i === ci ? { ...c, menuItemId: id } : c)), fixedSizeCode: null })
                    }
                    aria-label={`Món ${ci + 1} của thành phần ${index + 1}`}
                  />
                  {draft.type === "CHOICE" && (
                    <>
                      <span style={{ width: 120 }}>
                        <MoneyInput
                          size="small"
                          value={choice.surcharge}
                          onChange={(v) => patchDraft(draft.key, { choices: draft.choices.map((c, i) => (i === ci ? { ...c, surcharge: v ?? 0 } : c)) })}
                          aria-label={`Phụ thu món ${ci + 1} của thành phần ${index + 1}`}
                        />
                      </span>
                      <Radio
                        checked={choice.isDefault}
                        onChange={() => patchDraft(draft.key, { choices: draft.choices.map((c, i) => ({ ...c, isDefault: i === ci })) })}
                        aria-label={`Món mặc định ${ci + 1} của thành phần ${index + 1}`}
                      >
                        Mặc định
                      </Radio>
                      <ActionButton
                        size="small"
                        aria-label={`Gỡ món ${ci + 1} của thành phần ${index + 1}`}
                        icon={<X size={13} />}
                        disabled={draft.choices.length <= 2}
                        onClick={() => {
                          const rest = draft.choices.filter((_, i) => i !== ci);
                          // Gỡ món mặc định thì chọn món đầu còn lại làm mặc định mới, để luôn có đúng 1 mặc định.
                          patchDraft(draft.key, { choices: rest.some((c) => c.isDefault) ? rest : rest.map((c, i) => ({ ...c, isDefault: i === 0 })), fixedSizeCode: null });
                        }}
                      />
                    </>
                  )}
                </div>
              ))}

              {draft.type === "CHOICE" && (
                <div>
                  <ActionButton
                    size="small"
                    icon={<Plus size={13} />}
                    disabled={draft.choices.length >= MAX_VARIANTS}
                    onClick={() => patchDraft(draft.key, { choices: [...draft.choices, blankChoice(false)] })}
                  >
                    Thêm món vào nhóm ({draft.choices.length}/{MAX_VARIANTS})
                  </ActionButton>
                </div>
              )}

              <label style={{ fontSize: 12.5, color: palette.textMuted, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                Size cố định
                <Select
                  size="small"
                  allowClear
                  style={{ minWidth: 150 }}
                  placeholder={common.length ? "Không cố định" : "Món chưa có size chung"}
                  disabled={common.length === 0}
                  value={draft.fixedSizeCode ?? undefined}
                  options={common.map((s) => ({ value: s.code, label: s.name }))}
                  onChange={(code?: string) => patchDraft(draft.key, { fixedSizeCode: code ?? null })}
                  aria-label={`Size cố định thành phần ${index + 1}`}
                />
                <span style={{ fontSize: 12, color: palette.textSubtle }}>Chỉ chọn trong size mà mọi món của thành phần đều có.</span>
              </label>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <ActionButton size="small" icon={<Plus size={13} />} disabled={drafts.length >= MAX_COMPONENTS} onClick={() => setDrafts((cur) => [...cur, blankFixed()])}>
          Thêm món cố định
        </ActionButton>
        <ActionButton size="small" icon={<Plus size={13} />} disabled={drafts.length >= MAX_COMPONENTS} onClick={() => setDrafts((cur) => [...cur, blankChoiceComponent()])}>
          Thêm nhóm biến thể
        </ActionButton>
      </div>
      <div style={{ fontSize: 12, color: palette.textSubtle, marginBottom: 12 }}>Combo không chứa combo khác: danh sách chỉ có món lẻ.</div>

      <div data-testid="combo-compare" style={{ background: palette.paperSubtle, borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13 }}>
        {full ? (
          <>
            Giá combo <b>{money(price ?? 0)}</b> · Mua lẻ theo giá chuỗi (món mặc định) <b>{money(full.retail)}</b> ·{" "}
            {full.diff > 0 ? (
              <Tag color="success" style={{ margin: 0 }}>Rẻ hơn mua lẻ {money(full.diff)}</Tag>
            ) : full.diff < 0 ? (
              <Tag color="warning" style={{ margin: 0 }}>Cao hơn mua lẻ {money(-full.diff)}</Tag>
            ) : (
              <Tag style={{ margin: 0 }}>Bằng giá mua lẻ</Tag>
            )}
          </>
        ) : (
          "Chọn món và nhập giá để so sánh với giá mua lẻ."
        )}
      </div>

      {problems.length > 0 && (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} data-testid="combo-problems" message="Cần hoàn thiện trước khi lưu" description={<ul style={{ margin: 0, paddingLeft: 18 }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul>} />
      )}
      <ActionButton type="primary" block loading={saving} disabled={problems.length > 0} onClick={() => void save()} data-testid="combo-save">
        {isNew ? "Thêm combo" : "Lưu combo"}
      </ActionButton>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
