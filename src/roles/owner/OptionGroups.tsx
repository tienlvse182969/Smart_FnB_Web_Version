import { App, Card, Checkbox, Input, InputNumber, Modal, Select, Switch, Table, Tag } from "antd";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BranchOptionState, OptionGroup, OptionGroupInput, OptionInput } from "../../types";
import { menuApi, optionsApi, showApiError, suggestSku } from "../../api";
import { validateGroupInput } from "../../api/modules/options/rules";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { SectionTitle } from "../../components/bits";
import { formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

const ruleText = (g: OptionGroup): string =>
  g.isRequired
    ? g.minSelections === g.maxSelections
      ? `Bắt buộc, chọn đúng ${g.maxSelections}`
      : `Bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`
    : `Không bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`;

/**
 * OW-03: nhóm tuỳ chọn của chuỗi (đặc tả 12.2) — thêm/sửa nhóm và tuỳ chọn, đổi thứ tự, bật/tắt tuỳ chọn cấp chuỗi (OW-04),
 * xoá nhóm. CHỜ BE: toàn bộ đang chạy mock (`optionsApi`), dữ liệu mất khi tải lại trang. Trạng thái tại chi nhánh chỉ xem.
 */
export default function OptionGroups() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const branches = useAppStore((s) => s.branches);
  const writeGuard = useWriteGuard();
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [usage, setUsage] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OptionGroup | "new" | null>(null);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      const [list, configs, items] = await Promise.all([optionsApi.listGroups(chainId), optionsApi.listItemConfigs(chainId), menuApi.listItems(chainId)]);
      setGroups(list);
      // Tên món lấy từ menuApi (món thật); cấu hình của món không còn trên menu thì bỏ qua.
      const names = new Map(items.map((i) => [i.id, i.name]));
      const used: Record<string, string[]> = {};
      for (const c of configs) {
        const itemName = names.get(c.menuItemId);
        if (itemName) for (const gid of c.groupIds) (used[gid] ??= []).push(itemName);
      }
      setUsage(used);
    } catch (err) {
      showApiError(message.error, err, "Không tải được nhóm tuỳ chọn");
    } finally {
      setLoading(false);
    }
  }, [chainId, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const move = async (index: number, delta: -1 | 1) => {
    if (!chainId) return;
    const next = [...groups];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await optionsApi.reorderGroups(chainId, next.map((g) => g.id));
    } catch (err) {
      showApiError(message.error, err, "Không đổi được thứ tự");
    }
    await load();
  };

  const toggleOption = async (g: OptionGroup, optionId: string, isActive: boolean) => {
    if (!chainId) return;
    const option = g.options.find((o) => o.id === optionId);
    const apply = async () => {
      try {
        if (!isActive && option?.isDefault) {
          // Owner đã đồng ý bỏ mặc định: gửi cả nhóm với tuỳ chọn này tắt và hết mặc định.
          const { id: _id, options, ...rest } = g;
          await optionsApi.updateGroup(chainId, g.id, {
            ...rest,
            options: options.map((o) => (o.id === optionId ? { ...o, isActive: false, isDefault: false } : o)),
          });
        } else {
          await optionsApi.setOptionActive(chainId, g.id, optionId, isActive);
        }
        await load();
        message.success(isActive ? "Đã bật tuỳ chọn" : "Đã tắt tuỳ chọn");
      } catch (err) {
        showApiError(message.error, err, "Không cập nhật được tuỳ chọn");
      }
    };
    if (!isActive && option?.isDefault) {
      modal.confirm({
        title: "Tắt tuỳ chọn mặc định?",
        content: <div data-testid="confirm-default-off">Tuỳ chọn này đang là mặc định. Tắt sẽ bỏ mặc định của nhóm {g.name}.</div>,
        okText: "Tắt và bỏ mặc định",
        cancelText: "Huỷ",
        onOk: apply,
      });
      return;
    }
    await apply();
  };

  const confirmDelete = (g: OptionGroup) => {
    const used = usage[g.id] ?? [];
    modal.confirm({
      title: `Xoá nhóm "${g.name}"?`,
      content: (
        <div data-testid="delete-usage">
          {used.length === 0 ? (
            "Nhóm chưa gắn cho món nào."
          ) : (
            <>
              Nhóm đang gắn cho {used.length} món và sẽ bị gỡ khỏi: <b>{used.slice(0, 8).join(", ")}</b>
              {used.length > 8 ? ` và ${used.length - 8} món khác` : ""}.
            </>
          )}{" "}
          Đơn cũ vẫn giữ nguyên tuỳ chọn đã bán (BR-15).
        </div>
      ),
      okText: "Xoá nhóm",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!chainId) return;
        try {
          await optionsApi.deleteGroup(chainId, g.id);
          message.success("Đã xoá nhóm tuỳ chọn");
          await load();
        } catch (err) {
          showApiError(message.error, err, "Không xoá được nhóm");
        }
      },
    });
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Tuỳ chọn món"
        sub="Nhóm dùng chung cho nhiều món: sửa một lần là đổi cho mọi món đã gắn (đặc tả 12.2)"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm nhóm
          </ActionButton>
        }
      />
      <div
        data-testid="options-pending-note"
        style={{ fontSize: 12.5, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}
      >
        Tuỳ chọn đang lưu tạm trên trình duyệt, chờ BE có endpoint (api-contract-plan #12–17). Tải lại trang sẽ mất thay đổi.
      </div>
      <Table<OptionGroup>
        dataSource={groups}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 760 }}
        locale={{ emptyText: "Chưa có nhóm tuỳ chọn nào" }}
        expandable={{ expandedRowRender: (g) => <GroupDetail group={g} branches={branches} disabled={writeGuard.disabled} onToggle={toggleOption} /> }}
        columns={[
          {
            title: "Thứ tự",
            width: 110,
            render: (_, r, i) => (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} />
                <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={14} />} disabled={i === groups.length - 1} onClick={() => move(i, 1)} />
              </div>
            ),
          },
          {
            title: "Nhóm",
            render: (_, g) => (
              <div>
                <div style={{ fontWeight: 600 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>{g.code}</div>
              </div>
            ),
          },
          { title: "Quy tắc chọn", render: (_, g) => ruleText(g) },
          {
            title: "Tuỳ chọn",
            render: (_, g) => (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {g.options.map((o) => (
                  <Tag key={o.id} style={{ opacity: o.isActive ? 1 : 0.45, margin: 0 }}>
                    {o.name}
                    {o.priceDelta > 0 ? ` +${formatVnd(o.priceDelta)}` : ""}
                    {o.isDefault ? " ★" : ""}
                  </Tag>
                ))}
              </div>
            ),
          },
          { title: "Số món", align: "right", render: (_, g) => usage[g.id]?.length ?? 0 },
          {
            title: "",
            align: "right",
            render: (_, g) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <ActionButton size="small" icon={<Pencil size={14} />} onClick={() => setEditing(g)}>
                  Sửa
                </ActionButton>
                <ActionButton size="small" danger icon={<Trash2 size={14} />} onClick={() => confirmDelete(g)}>
                  Xoá
                </ActionButton>
              </div>
            ),
          },
        ]}
      />
      <GroupModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (text) => {
          setEditing(null);
          message.success(text);
          await load();
        }}
      />
    </Card>
  );
}

/** Chi tiết nhóm: bật/tắt cấp chuỗi từng tuỳ chọn, và trạng thái "còn bán" tại một chi nhánh (chỉ xem — Manager bật/tắt ở giai đoạn 5). */
function GroupDetail({
  group,
  branches,
  disabled,
  onToggle,
}: {
  group: OptionGroup;
  branches: { id: string; name: string }[];
  disabled: boolean;
  onToggle: (g: OptionGroup, optionId: string, isActive: boolean) => void;
}) {
  const chainId = useAppStore((s) => s.chainId);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [states, setStates] = useState<BranchOptionState[]>([]);

  useEffect(() => {
    if (!chainId || !branchId) return setStates([]);
    void optionsApi.listBranchStates(chainId, branchId).then(setStates, () => setStates([]));
  }, [chainId, branchId]);

  return (
    <div data-testid={`group-detail-${group.code}`}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: palette.textMuted }}>Xem còn bán tại chi nhánh:</span>
        <Select allowClear placeholder="Chọn chi nhánh" size="small" style={{ width: 200 }} value={branchId} onChange={setBranchId} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
        <span style={{ fontSize: 12, color: palette.textSubtle }}>Chỉ xem — Manager bật/tắt tại chi nhánh (giai đoạn 5)</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {group.options.map((o) => {
          const state = states.find((s) => s.optionId === o.id);
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Switch size="small" checked={o.isActive} disabled={disabled} aria-label={`Bật ${o.name}`} data-testid={`option-active-${group.code}:${o.code}`} onChange={(c) => onToggle(group, o.id, c)} />
              <span style={{ minWidth: 150, opacity: o.isActive ? 1 : 0.5 }}>{o.name}</span>
              <span style={{ minWidth: 90, color: palette.textMuted }}>{o.priceDelta > 0 ? `+${formatVnd(o.priceDelta)}` : "+0"}</span>
              {o.isDefault && <Tag color="blue">Mặc định · chờ BE</Tag>}
              {branchId && state && <Tag color={state.isAvailable ? "green" : "default"}>{state.isAvailable ? "Còn bán" : "Tạm hết"}</Tag>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type FormOption = OptionInput & { key: string };
let keySeq = 0;
const newKey = () => `k${++keySeq}`;
const blankOption = (): FormOption => ({ key: newKey(), name: "", code: "", priceDelta: 0, isActive: true, isDefault: false });

function GroupModal({ target, onClose, onSaved }: { target: OptionGroup | "new" | null; onClose: () => void; onSaved: (text: string) => Promise<void> }) {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const existing = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [isRequired, setRequired] = useState(false);
  const [min, setMin] = useState<number | null>(0);
  const [max, setMax] = useState<number | null>(1);
  const [options, setOptions] = useState<FormOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setName(existing?.name ?? "");
    setCode(existing?.code ?? "");
    setCodeTouched(!!existing);
    setRequired(existing?.isRequired ?? false);
    setMin(existing?.minSelections ?? 0);
    setMax(existing?.maxSelections ?? 1);
    setOptions(existing ? existing.options.map((o) => ({ ...o, key: newKey() })) : [blankOption()]);
  }, [target]);

  const input: OptionGroupInput = useMemo(
    () => ({
      name,
      code,
      isRequired,
      minSelections: min ?? NaN,
      maxSelections: max ?? NaN,
      isActive: existing?.isActive ?? true,
      options: options.map(({ key: _key, ...o }) => o),
    }),
    [name, code, isRequired, min, max, options, existing],
  );
  const errors = useMemo(() => (target ? validateGroupInput(input) : []), [input, target]);

  const patch = (key: string, p: Partial<OptionInput>) => setOptions((cur) => cur.map((o) => (o.key === key ? { ...o, ...p } : o)));
  /** Tắt tuỳ chọn đang mặc định: hỏi trước, đồng ý mới bỏ cờ mặc định (đặc tả không quy định → không âm thầm bỏ). */
  const setActive = (o: FormOption, active: boolean) => {
    if (active || !o.isDefault) return patch(o.key, { isActive: active });
    modal.confirm({
      title: "Tắt tuỳ chọn mặc định?",
      content: <div data-testid="confirm-default-off">Tuỳ chọn này đang là mặc định. Tắt sẽ bỏ mặc định của nhóm {name.trim() || "này"}.</div>,
      okText: "Tắt và bỏ mặc định",
      cancelText: "Huỷ",
      onOk: () => patch(o.key, { isActive: false, isDefault: false }),
    });
  };
  const moveOption = (i: number, d: -1 | 1) =>
    setOptions((cur) => {
      const next = [...cur];
      const t = i + d;
      if (t < 0 || t >= next.length) return cur;
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });

  const save = async () => {
    if (!chainId || errors.length) return;
    setSaving(true);
    try {
      if (existing) {
        await optionsApi.updateGroup(chainId, existing.id, input);
        await onSaved("Đã cập nhật nhóm tuỳ chọn");
      } else {
        await optionsApi.createGroup(chainId, input);
        await onSaved("Đã thêm nhóm tuỳ chọn");
      }
    } catch (err) {
      showApiError(message.error, err, "Không lưu được nhóm tuỳ chọn");
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string) => <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "12px 0 6px" }}>{text}</div>;

  return (
    <Modal title={existing ? `Sửa nhóm · ${existing.name}` : "Thêm nhóm tuỳ chọn"} open={!!target} onCancel={onClose} footer={null} width={720} destroyOnHidden>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {label("Tên nhóm")}
          <Input
            data-testid="group-name"
            value={name}
            maxLength={100}
            onChange={(e) => {
              setName(e.target.value);
              if (!existing && !codeTouched) setCode(suggestSku(e.target.value));
            }}
            placeholder="VD: Size"
          />
        </div>
        <div>
          {label("Mã nhóm (duy nhất trong chuỗi)")}
          <Input
            data-testid="group-code"
            value={code}
            maxLength={50}
            onChange={(e) => {
              setCodeTouched(true);
              setCode(e.target.value.toUpperCase());
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          {label("Bắt buộc chọn")}
          <Switch data-testid="group-required" checked={isRequired} onChange={setRequired} />
        </div>
        <div>
          {label("Chọn tối thiểu")}
          <InputNumber data-testid="group-min" value={min} onChange={setMin} precision={0} min={0} style={{ width: 110 }} />
        </div>
        <div>
          {label("Chọn tối đa")}
          <InputNumber data-testid="group-max" value={max} onChange={setMax} precision={0} min={0} style={{ width: 110 }} />
        </div>
      </div>

      {label("Tuỳ chọn (thứ tự ở đây là thứ tự hiển thị)")}
      <div style={{ display: "grid", gap: 8 }}>
        {options.map((o, i) => (
          <div key={o.key} data-testid="option-row" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={13} />} disabled={i === 0} onClick={() => moveOption(i, -1)} />
            <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={13} />} disabled={i === options.length - 1} onClick={() => moveOption(i, 1)} />
            <Input
              data-testid="opt-name"
              style={{ flex: 2 }}
              value={o.name}
              maxLength={100}
              placeholder="Tên"
              onChange={(e) => {
                const auto = o.code === "" || o.code === suggestSku(o.name);
                patch(o.key, { name: e.target.value, ...(auto ? { code: suggestSku(e.target.value) } : {}) });
              }}
            />
            <Input data-testid="opt-code" style={{ flex: 1.2 }} value={o.code} maxLength={50} placeholder="Mã" onChange={(e) => patch(o.key, { code: e.target.value.toUpperCase() })} />
            <InputNumber data-testid="opt-price" style={{ width: 110 }} value={o.priceDelta} min={0} precision={0} step={1000} onChange={(v) => patch(o.key, { priceDelta: v ?? NaN })} />
            <Checkbox data-testid="opt-default" checked={o.isDefault} onChange={(e) => patch(o.key, { isDefault: e.target.checked })}>
              Mặc định
            </Checkbox>
            <Switch size="small" data-testid="opt-active" checked={o.isActive} onChange={(c) => setActive(o, c)} aria-label="Đang bán" />
            <ActionButton size="small" danger aria-label="Bỏ tuỳ chọn" icon={<X size={13} />} onClick={() => setOptions((cur) => cur.filter((x) => x.key !== o.key))} />
          </div>
        ))}
      </div>
      <ActionButton size="small" style={{ marginTop: 8 }} icon={<Plus size={13} />} onClick={() => setOptions((cur) => [...cur, blankOption()])}>
        Thêm tuỳ chọn
      </ActionButton>
      <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6 }}>
        Giá cộng thêm là số nguyên đồng. "Mặc định" chưa có ở BE (chờ BE, #15) nên chỉ lưu tạm.
      </div>

      {errors.length > 0 && (
        <ul data-testid="group-errors" style={{ margin: "12px 0 0", paddingLeft: 18, color: palette.error.text, fontSize: 12.5 }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <ActionButton type="primary" block style={{ marginTop: 16 }} loading={saving} disabled={errors.length > 0} onClick={save} data-testid="group-save">
        Lưu nhóm
      </ActionButton>
    </Modal>
  );
}
