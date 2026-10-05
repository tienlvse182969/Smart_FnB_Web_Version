import { App, Card, Checkbox, Input, InputNumber, Modal, Select, Switch, Table, Tag } from "antd";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { BranchOptionState, OptionGroup, OptionItem } from "../../types";
import { optionsApi, showApiError, suggestSku } from "../../api";
import { applyReorder, planReorder } from "../../api/modules/options/ordering";
import { modeOf } from "../../api/flags";
import { syncSelectionRule, validateGroupFields, validateOptionFields, type SelectionRuleField } from "../../api/modules/options/rules";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { SectionTitle } from "../../components/bits";
import { useDirtyGuard } from "../../lib/dirtyGuard";
import { formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

const ruleText = (g: OptionGroup): string =>
  g.isRequired
    ? g.minSelections === g.maxSelections
      ? `Bắt buộc, chọn đúng ${g.maxSelections}`
      : `Bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`
    : `Không bắt buộc, chọn ${g.minSelections}–${g.maxSelections}`;

const activeCount = (g: OptionGroup) => g.options.filter((o) => o.isActive).length;

/**
 * OW-03: nhóm tuỳ chọn của chuỗi (đặc tả 12.2) — mỗi thao tác là MỘT lệnh lưu ngay (giống BE): form nhóm lưu riêng; mỗi dòng tuỳ chọn
 * thêm/sửa/xoá/bật tắt/đổi thứ tự lưu ngay. Lỗi giữa chừng → báo qua `showApiError` rồi nạp lại từ nguồn.
 */
export default function OptionGroups() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const branches = useAppStore((s) => s.branches);
  const writeGuard = useWriteGuard();
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OptionGroup | "new" | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  /** Nhóm vừa tạo: mở sẵn ô thêm tuỳ chọn đầu tiên (quyết định 12). */
  const [startAdding, setStartAdding] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      // Số món dùng từng nhóm lấy từ `menuItemCount` (BE `_count.menuItems`, quyết định 18): không đọc cấu hình từng món chỉ để đếm.
      setGroups(await optionsApi.listGroups(chainId));
    } catch (err) {
      showApiError(message.error, err, "Không tải được nhóm tuỳ chọn");
    } finally {
      setLoading(false);
    }
  }, [chainId, message]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Một thao tác ghi: lỗi → `showApiError` (không thử lại), thành công hay không đều nạp lại từ nguồn. */
  const run = useCallback(
    async (action: () => Promise<unknown>, success: string | null, failure: string): Promise<boolean> => {
      try {
        await action();
        if (success) message.success(success);
        return true;
      } catch (err) {
        showApiError(message.error, err, failure);
        return false;
      } finally {
        await load();
      }
    },
    [load, message],
  );

  const moveGroup = async (index: number, delta: -1 | 1) => {
    if (!chainId) return;
    const changes = planReorder(groups, index, delta);
    if (!changes?.length) return;
    try {
      await applyReorder(changes, (c) => optionsApi.patchGroup(chainId, c.id, { displayOrder: c.displayOrder }), load);
    } catch (err) {
      showApiError(message.error, err, "Không đổi được thứ tự");
    }
  };

  const confirmDelete = (g: OptionGroup) => {
    const used = g.menuItemCount ?? 0;
    modal.confirm({
      title: `Xoá nhóm "${g.name}"?`,
      content: (
        <div data-testid="delete-usage">
          {used === 0 ? "Nhóm chưa gắn cho món nào." : <>Nhóm đang gắn cho {used} món và sẽ bị gỡ khỏi các món đó.</>}{" "}
          Đơn cũ vẫn giữ nguyên tuỳ chọn đã bán (BR-15).
        </div>
      ),
      okText: "Xoá nhóm",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (chainId) await run(() => optionsApi.removeGroup(chainId, g.id), "Đã xoá nhóm tuỳ chọn", "Không xoá được nhóm");
      },
    });
  };

  const nextGroupOrder = Math.max(0, ...groups.map((g) => g.displayOrder)) + 1;
  const pendingNote = modeOf("options") === "mock";

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
      {pendingNote && (
        <div
          data-testid="options-pending-note"
          style={{ fontSize: 12.5, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}
        >
          Tuỳ chọn đang lưu tạm trên trình duyệt, chờ BE có endpoint (api-contract-plan #12–17). Thay đổi được lưu lại khi tải lại trang; nút xoá dữ liệu mock ở panel mock.
        </div>
      )}
      <Table<OptionGroup>
        dataSource={groups}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 760 }}
        locale={{ emptyText: "Chưa có nhóm tuỳ chọn nào" }}
        expandable={{
          expandedRowKeys: expanded,
          onExpandedRowsChange: (keys) => setExpanded(keys.map(String)),
          expandedRowRender: (g) => (
            <GroupDetail
              group={g}
              usageCount={g.menuItemCount ?? 0}
              branches={branches}
              disabled={writeGuard.disabled}
              startAdding={startAdding === g.id}
              run={run}
            />
          ),
        }}
        columns={[
          {
            title: "Thứ tự",
            width: 110,
            render: (_, r, i) => (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => moveGroup(i, -1)} />
                <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={14} />} disabled={i === groups.length - 1} onClick={() => moveGroup(i, 1)} />
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
          {
            title: "Quy tắc chọn",
            render: (_, g) => (
              <div>
                <div>{ruleText(g)}</div>
                {g.minSelections > 0 && activeCount(g) < g.minSelections && (
                  <Tag color="error" data-testid={`group-short-${g.code}`} style={{ marginTop: 4 }}>
                    Không đủ tuỳ chọn để chọn tối thiểu {g.minSelections}
                  </Tag>
                )}
              </div>
            ),
          },
          {
            title: "Tuỳ chọn",
            render: (_, g) =>
              g.options.length === 0 ? (
                <Tag color="warning" data-testid={`group-empty-${g.code}`}>
                  Chưa có tuỳ chọn
                </Tag>
              ) : (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {g.options.map((o) => (
                    <Tag key={o.id} style={{ opacity: o.isActive ? 1 : 0.45, margin: 0 }}>
                      {o.name}
                      {o.priceDelta > 0 ? ` +${formatVnd(o.priceDelta)}` : ""}
                      {optionsApi.capabilities.isDefault && o.isDefault ? " ★" : ""}
                    </Tag>
                  ))}
                </div>
              ),
          },
          { title: "Số món", align: "right", render: (_, g) => g.menuItemCount ?? 0 },
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
      <GroupFormModal
        target={editing}
        nextOrder={nextGroupOrder}
        onClose={() => setEditing(null)}
        run={run}
        onCreated={(id) => {
          setEditing(null);
          setStartAdding(id);
          setExpanded((cur) => [...cur.filter((k) => k !== id), id]);
        }}
        onUpdated={() => setEditing(null)}
      />
    </Card>
  );
}

type Run = (action: () => Promise<unknown>, success: string | null, failure: string) => Promise<boolean>;

/** Chi tiết nhóm: từng tuỳ chọn (sửa, bật/tắt cấp chuỗi, xoá, đổi thứ tự — mỗi thao tác lưu ngay) và trạng thái "còn bán" tại chi nhánh (nếu có). */
function GroupDetail({
  group,
  usageCount,
  branches,
  disabled,
  startAdding,
  run,
}: {
  group: OptionGroup;
  usageCount: number;
  branches: { id: string; name: string }[];
  disabled: boolean;
  startAdding: boolean;
  run: Run;
}) {
  const { modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const [branchId, setBranchId] = useState<string | undefined>();
  const [states, setStates] = useState<BranchOptionState[]>([]);
  const [adding, setAdding] = useState(startAdding);
  const caps = optionsApi.capabilities;

  useEffect(() => {
    if (!caps.branchStates || !chainId || !branchId) return setStates([]);
    void optionsApi.listBranchStates(chainId, branchId).then(setStates, () => setStates([]));
  }, [chainId, branchId, caps.branchStates]);

  const options = [...group.options].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  const moveOption = (index: number, delta: -1 | 1) => {
    if (!chainId) return;
    const changes = planReorder(options, index, delta);
    if (!changes?.length) return;
    // `run` đã nạp lại từ nguồn (dù lỗi giữa chừng) và báo lỗi qua `showApiError`.
    void run(() => applyReorder(changes, (c) => optionsApi.patchOption(chainId, group.id, c.id, { displayOrder: c.displayOrder }), async () => {}), null, "Không đổi được thứ tự");
  };

  const setActive = (o: OptionItem, isActive: boolean) => {
    if (!chainId) return;
    const apply = async () => {
      await run(async () => {
        // Tuỳ chọn đang mặc định: Owner đã đồng ý bỏ mặc định → bỏ cờ trước, rồi mới tắt (đặc tả không quy định → không âm thầm bỏ).
        if (!isActive && o.isDefault) await optionsApi.patchOption(chainId, group.id, o.id, { isDefault: false });
        await optionsApi.patchOption(chainId, group.id, o.id, { isActive });
      }, isActive ? "Đã bật tuỳ chọn" : "Đã tắt tuỳ chọn", "Không cập nhật được tuỳ chọn");
    };
    if (!isActive && o.isDefault) {
      modal.confirm({
        title: "Tắt tuỳ chọn mặc định?",
        content: <div data-testid="confirm-default-off">Tuỳ chọn này đang là mặc định. Tắt sẽ bỏ mặc định của nhóm {group.name}.</div>,
        okText: "Tắt và bỏ mặc định",
        cancelText: "Huỷ",
        onOk: apply,
      });
      return;
    }
    void apply();
  };

  const confirmRemove = (o: OptionItem) => {
    if (!chainId) return;
    const lastOne = group.options.length === 1;
    modal.confirm({
      title: `Xoá tuỳ chọn "${o.name}"?`,
      content: (
        <div data-testid="delete-option-confirm">
          Tuỳ chọn bị xoá khỏi nhóm {group.name}. Đơn cũ vẫn giữ nguyên tuỳ chọn đã bán (BR-15).
          {lastOne && usageCount > 0 && (
            <div data-testid="delete-option-usage" style={{ marginTop: 6, color: palette.error.text }}>
              Đây là tuỳ chọn cuối cùng của nhóm: {usageCount} món đang dùng nhóm này sẽ không còn tuỳ chọn để chọn.
            </div>
          )}
        </div>
      ),
      okText: "Xoá tuỳ chọn",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        await run(() => optionsApi.removeOption(chainId, group.id, o.id), "Đã xoá tuỳ chọn", "Không xoá được tuỳ chọn");
      },
    });
  };

  return (
    <div data-testid={`group-detail-${group.code}`}>
      {caps.branchStates ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: palette.textMuted }}>Xem còn bán tại chi nhánh:</span>
          <Select allowClear placeholder="Chọn chi nhánh" size="small" style={{ width: 200 }} value={branchId} onChange={setBranchId} options={branches.map((b) => ({ value: b.id, label: b.name }))} />
          <span style={{ fontSize: 12, color: palette.textSubtle }}>Chỉ xem — Manager bật/tắt tại chi nhánh (giai đoạn 5)</span>
        </div>
      ) : (
        <div data-testid="branch-states-note" style={{ fontSize: 12, color: palette.textSubtle, marginBottom: 10 }}>
          Trạng thái "còn bán" theo chi nhánh chưa xem được ở chế độ này; Manager bật/tắt tại chi nhánh.
        </div>
      )}
      {group.options.length === 0 && !adding && (
        <div data-testid="group-empty-hint" style={{ color: palette.warning.text, fontSize: 13, marginBottom: 8 }}>
          Chưa có tuỳ chọn — nhóm này chưa gắn được cho món nào.
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {options.map((o, i) => (
          <OptionRow
            key={o.id}
            group={group}
            option={o}
            index={i}
            count={options.length}
            disabled={disabled}
            state={branchId ? states.find((s) => s.optionId === o.id) : undefined}
            onMove={moveOption}
            onActive={setActive}
            onRemove={confirmRemove}
            run={run}
          />
        ))}
        {adding && <OptionRow group={group} option={null} index={options.length} count={options.length} disabled={disabled} onDone={() => setAdding(false)} run={run} />}
      </div>
      {!adding && (
        <ActionButton size="small" style={{ marginTop: 8 }} icon={<Plus size={13} />} data-testid="opt-add" onClick={() => setAdding(true)}>
          Thêm tuỳ chọn
        </ActionButton>
      )}
      <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6 }}>
        Mỗi thay đổi được lưu ngay. Giá cộng thêm là số nguyên đồng.
        {!caps.isDefault && ' Tuỳ chọn "Mặc định" chờ BE (#15).'}
      </div>
    </div>
  );
}

/** Một dòng tuỳ chọn: sửa tên/mã/giá rồi bấm Lưu (một lệnh); bật/tắt, mặc định, đổi thứ tự, xoá lưu ngay. `option = null` = dòng thêm mới. */
function OptionRow({
  group,
  option,
  index,
  count,
  disabled,
  state,
  onMove,
  onActive,
  onRemove,
  onDone,
  run,
}: {
  group: OptionGroup;
  option: OptionItem | null;
  index: number;
  count: number;
  disabled: boolean;
  state?: BranchOptionState;
  onMove?: (index: number, delta: -1 | 1) => void;
  onActive?: (o: OptionItem, isActive: boolean) => void;
  onRemove?: (o: OptionItem) => void;
  onDone?: () => void;
  run: Run;
}) {
  const chainId = useAppStore((s) => s.chainId);
  const caps = optionsApi.capabilities;
  const [name, setName] = useState(option?.name ?? "");
  const [code, setCode] = useState(option?.code ?? "");
  const [price, setPrice] = useState<number | null>(option?.priceDelta ?? 0);

  // Dữ liệu nạp lại từ nguồn (sau khi lưu hay lỗi) thì dòng theo giá trị mới.
  useEffect(() => {
    if (!option) return;
    setName(option.name);
    setCode(option.code);
    setPrice(option.priceDelta);
  }, [option?.name, option?.code, option?.priceDelta]);

  const draft = { name, code, priceDelta: price ?? NaN };
  const errors = useMemo(() => validateOptionFields({ name, code, priceDelta: price ?? NaN }), [name, code, price]);
  const codeTaken = group.options.some((o) => o.id !== option?.id && o.code === code);
  const dirty = option ? name !== option.name || code !== option.code || price !== option.priceDelta : name !== "" || code !== "" || (price ?? 0) !== 0;
  // Form nằm ngay trong trang (không phải hộp thoại) nên tự đăng ký "đang nhập dở".
  useDirtyGuard(dirty);
  const valid = errors.length === 0 && name.trim() !== "" && code !== "" && !codeTaken;

  const save = async () => {
    if (!chainId || !valid) return;
    const ok = option
      ? await run(() => optionsApi.patchOption(chainId, group.id, option.id, draft), "Đã lưu tuỳ chọn", "Không lưu được tuỳ chọn")
      : await run(
          () => optionsApi.addOption(chainId, group.id, { ...draft, displayOrder: Math.max(0, ...group.options.map((o) => o.displayOrder)) + 1 }),
          "Đã thêm tuỳ chọn",
          "Không thêm được tuỳ chọn",
        );
    if (ok && !option) onDone?.();
  };

  return (
    <div data-testid={option ? "option-row" : "option-row-new"} data-code={option?.code} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {option ? (
        <>
          <ActionButton size="small" aria-label="Lên" data-testid="opt-up" icon={<ArrowUp size={13} />} disabled={index === 0} onClick={() => onMove?.(index, -1)} />
          <ActionButton size="small" aria-label="Xuống" data-testid="opt-down" icon={<ArrowDown size={13} />} disabled={index === count - 1} onClick={() => onMove?.(index, 1)} />
        </>
      ) : null}
      <Input
        data-testid="opt-name"
        style={{ flex: 2, minWidth: 140, opacity: option && !option.isActive ? 0.5 : 1 }}
        value={name}
        maxLength={100}
        placeholder="Tên"
        onChange={(e) => {
          const auto = !option && (code === "" || code === suggestSku(name));
          setName(e.target.value);
          if (auto) setCode(suggestSku(e.target.value));
        }}
      />
      <Input data-testid="opt-code" style={{ flex: 1.2, minWidth: 100 }} value={code} maxLength={50} placeholder="Mã" onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <InputNumber data-testid="opt-price" style={{ width: 110 }} value={price} min={0} precision={0} step={1000} onChange={(v) => setPrice(v)} />
      {option && (
        <>
          {caps.isDefault ? (
            <Checkbox
              data-testid="opt-default"
              checked={!!option.isDefault}
              disabled={disabled}
              onChange={(e) => chainId && void run(() => optionsApi.patchOption(chainId, group.id, option.id, { isDefault: e.target.checked }), null, "Không cập nhật được tuỳ chọn mặc định")}
            >
              Mặc định
            </Checkbox>
          ) : (
            <Checkbox data-testid="opt-default" checked={false} disabled>
              Mặc định (chờ BE #15)
            </Checkbox>
          )}
          <Switch
            size="small"
            data-testid={`option-active-${group.code}:${option.code}`}
            checked={option.isActive}
            disabled={disabled}
            aria-label={`Bật ${option.name}`}
            onChange={(c) => onActive?.(option, c)}
          />
          {state && <Tag color={state.isAvailable ? "green" : "default"}>{state.isAvailable ? "Còn bán" : "Tạm hết"}</Tag>}
        </>
      )}
      <ActionButton size="small" type="primary" data-testid="opt-save" disabled={!valid || (!!option && !dirty)} onClick={save}>
        Lưu
      </ActionButton>
      {option ? (
        <ActionButton size="small" danger aria-label="Xoá tuỳ chọn" data-testid="opt-delete" icon={<Trash2 size={13} />} onClick={() => onRemove?.(option)} />
      ) : (
        <ActionButton size="small" aria-label="Huỷ thêm" data-testid="opt-cancel" icon={<X size={13} />} onClick={() => onDone?.()} />
      )}
      {dirty && (errors.length > 0 || codeTaken) && (
        <div data-testid="opt-errors" style={{ flexBasis: "100%", color: palette.error.text, fontSize: 12 }}>
          {codeTaken ? `Mã "${code}" bị trùng trong nhóm` : errors[0]}
        </div>
      )}
    </div>
  );
}

/** Form nhóm (tên, mã, bắt buộc, tối thiểu, tối đa) — lưu riêng, KHÔNG gồm tuỳ chọn. Luật chọn tự đồng bộ (`syncSelectionRule`). */
function GroupFormModal({
  target,
  nextOrder,
  onClose,
  run,
  onCreated,
  onUpdated,
}: {
  target: OptionGroup | "new" | null;
  nextOrder: number;
  onClose: () => void;
  run: Run;
  onCreated: (id: string) => void;
  onUpdated: () => void;
}) {
  const chainId = useAppStore((s) => s.chainId);
  const existing = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [rule, setRule] = useState({ isRequired: false, minSelections: 0, maxSelections: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setName(existing?.name ?? "");
    setCode(existing?.code ?? "");
    setCodeTouched(!!existing);
    setRule({ isRequired: existing?.isRequired ?? false, minSelections: existing?.minSelections ?? 0, maxSelections: existing?.maxSelections ?? 1 });
  }, [target]);

  const changeRule = (field: SelectionRuleField, patch: Partial<typeof rule>) => setRule((cur) => syncSelectionRule({ ...cur, ...patch }, field));
  const errors = useMemo(() => (target ? validateGroupFields({ name, code, ...rule }) : []), [name, code, rule, target]);

  const save = async () => {
    if (!chainId || errors.length) return;
    setSaving(true);
    try {
      if (existing) {
        const ruleChanged = rule.isRequired !== existing.isRequired || rule.minSelections !== existing.minSelections || rule.maxSelections !== existing.maxSelections;
        const patch = {
          ...(name.trim() !== existing.name && { name: name.trim() }),
          ...(code !== existing.code && { code }),
          ...(ruleChanged && rule),
        };
        if (Object.keys(patch).length === 0) return onUpdated();
        if (await run(() => optionsApi.patchGroup(chainId, existing.id, patch), "Đã cập nhật nhóm tuỳ chọn", "Không lưu được nhóm tuỳ chọn")) onUpdated();
      } else {
        let createdId = "";
        const ok = await run(
          async () => {
            createdId = (await optionsApi.addGroup(chainId, { name: name.trim(), code, ...rule, displayOrder: nextOrder })).id;
          },
          "Đã thêm nhóm tuỳ chọn — thêm tuỳ chọn đầu tiên bên dưới",
          "Không lưu được nhóm tuỳ chọn",
        );
        if (ok) onCreated(createdId);
      }
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string) => <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "12px 0 6px" }}>{text}</div>;

  return (
    <Modal title={existing ? `Sửa nhóm · ${existing.name}` : "Thêm nhóm tuỳ chọn"} open={!!target} onCancel={onClose} footer={null} width={560} destroyOnHidden>
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
          <Switch data-testid="group-required" checked={rule.isRequired} onChange={(v) => changeRule("isRequired", { isRequired: v })} />
        </div>
        <div>
          {label("Chọn tối thiểu")}
          <InputNumber data-testid="group-min" value={rule.minSelections} onChange={(v) => changeRule("minSelections", { minSelections: v ?? 0 })} precision={0} min={0} max={100} style={{ width: 110 }} />
        </div>
        <div>
          {label("Chọn tối đa")}
          <InputNumber data-testid="group-max" value={rule.maxSelections} onChange={(v) => changeRule("maxSelections", { maxSelections: v ?? 1 })} precision={0} min={1} max={100} style={{ width: 110 }} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 8 }}>
        Bắt buộc và tối thiểu đi cùng nhau: bật bắt buộc thì tối thiểu ít nhất 1; tối thiểu 0 thì không bắt buộc. Tối đa không nhỏ hơn tối thiểu.
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
