import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Card, Checkbox, Drawer, Select, Table } from "antd";
import { Pencil, Plus, Store, Trash2 } from "lucide-react";
import type { Combo, MenuCategory, MenuItem } from "../../types";
import { combosApi, describeApiError, menuApi, showApiError } from "../../api";
import { branchGapReasons } from "../../api/modules/combos/rules";
import { SectionTitle } from "../../components/bits";
import { money } from "../../data";
import { UNSAVED_PROMPT, useUnsavedGuard } from "../../lib/useUnsavedGuard";
import ActionButton, { ActionSwitch } from "../../plan/ActionButton";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import ComboEditor from "./ComboEditor";

type StatusFilter = "all" | "active" | "off";

/**
 * OW-14 + OW-04 (mục 26): danh sách combo của chuỗi — tên, giá, số thành phần, trạng thái, số chi nhánh bán; lọc theo danh mục và trạng thái;
 * thêm/sửa/ngừng bán; gán chi nhánh. Giá riêng theo chi nhánh ở màn Giá theo chi nhánh (OW-16).
 */
export default function CombosPage() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const branches = useAppStore((s) => s.branches);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Combo | "new" | null>(null);
  const [assigning, setAssigning] = useState<Combo | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      const [list, cats, menu] = await Promise.all([combosApi.listCombos(chainId), menuApi.listCategories(chainId), menuApi.listItems(chainId)]);
      setCombos(list);
      setCategories(cats);
      setItems(menu);
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(
    () => combos.filter((c) => (!categoryId || c.categoryId === categoryId) && (status === "all" || (status === "active" ? c.isActive : !c.isActive))),
    [combos, categoryId, status],
  );

  const toggle = async (combo: Combo, isActive: boolean) => {
    if (!chainId || busyId) return;
    setBusyId(combo.id);
    try {
      await combosApi.updateCombo(chainId, combo.id, { isActive });
      message.success(isActive ? "Đã bật combo trên toàn chuỗi" : "Đã tắt combo — mọi chi nhánh ngừng bán");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được combo");
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const confirmDelete = (combo: Combo) => {
    modal.confirm({
      title: `Ngừng bán combo "${combo.name}"?`,
      content: "Combo biến mất khỏi menu và mọi chi nhánh ngừng bán. Đơn cũ vẫn giữ tên và giá lúc bán. Không khôi phục được từ màn này.",
      okText: "Ngừng bán combo",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!chainId) return;
        try {
          await combosApi.deleteCombo(chainId, combo.id);
          message.success("Đã ngừng bán combo");
        } catch (err) {
          showApiError(message.error, err, "Không xoá được combo");
        } finally {
          await load();
        }
      },
    });
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div data-testid="combos-page">
      <SectionTitle
        title="Combo"
        sub="Bộ món bán theo giá riêng. Mỗi thành phần là món cố định hoặc nhóm biến thể để khách chọn đúng một món."
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")} data-testid="combo-add">
            Thêm combo
          </ActionButton>
        }
      />
      {error && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message="Không tải được danh sách combo" description={error} action={<ActionButton onClick={() => void load()}>Thử lại</ActionButton>} />
      )}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          <Select allowClear placeholder="Tất cả danh mục" style={{ width: 200 }} value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          <Select<StatusFilter>
            style={{ width: 160 }}
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "active", label: "Đang bán" },
              { value: "off", label: "Đã tắt" },
            ]}
          />
        </div>
        <Table<Combo>
          rowKey="id"
          loading={loading}
          dataSource={shown}
          pagination={false}
          scroll={{ x: 820 }}
          locale={{ emptyText: error ? "—" : combos.length ? "Không có combo khớp bộ lọc" : "Chưa có combo nào. Bấm Thêm combo để tạo." }}
          columns={[
            {
              title: "Combo",
              dataIndex: "name",
              render: (name: string, row) => (
                <div style={{ opacity: row.isActive ? 1 : 0.5 }}>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 12, color: palette.textSubtle }}>{categoryName(row.categoryId)}</div>
                </div>
              ),
            },
            { title: "Giá chuỗi", dataIndex: "price", align: "right", render: (price: number) => money(price) },
            { title: "Thành phần", align: "center", render: (_, row) => row.components.length },
            {
              title: "Bán tại",
              align: "center",
              render: (_, row) => (
                <span data-testid="combo-branches">
                  {row.branchIds.length}/{branches.length} chi nhánh
                </span>
              ),
            },
            {
              title: "Bật",
              dataIndex: "isActive",
              align: "center",
              render: (active: boolean, row) => (
                <ActionSwitch size="small" checked={active} loading={busyId === row.id} disabled={busyId !== null} aria-label={`Kinh doanh combo ${row.name}`} onChange={(c) => void toggle(row, c)} />
              ),
            },
            {
              title: "",
              align: "right",
              render: (_, row) => (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <ActionButton size="small" icon={<Store size={14} />} onClick={() => setAssigning(row)}>
                    Gán chi nhánh
                  </ActionButton>
                  <ActionButton size="small" icon={<Pencil size={14} />} onClick={() => setEditing(row)}>
                    Sửa
                  </ActionButton>
                  <ActionButton size="small" danger icon={<Trash2 size={14} />} onClick={() => confirmDelete(row)}>
                    Xoá
                  </ActionButton>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <ComboEditor
        target={editing}
        categories={categories}
        items={items}
        onClose={() => setEditing(null)}
        onSaved={async (text) => {
          setEditing(null);
          message.success(text);
          await load();
        }}
      />
      <BranchesDrawer
        combo={assigning}
        items={items}
        branches={branches}
        onClose={() => setAssigning(null)}
        onSaved={async () => {
          setAssigning(null);
          message.success("Đã cập nhật chi nhánh bán combo");
          await load();
        }}
      />
    </div>
  );
}

/** OW-04: chọn chi nhánh bán combo (`PUT …/branches`). Cảnh báo chi nhánh thiếu món thành phần vì combo sẽ không hiện trên POS ở đó (BR-78). */
function BranchesDrawer({
  combo,
  items,
  branches,
  onClose,
  onSaved,
}: {
  combo: Combo | null;
  items: MenuItem[];
  branches: { id: string; name: string; address: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const [selected, setSelected] = useState<string[]>([]);
  const [initial, setInitial] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ids = combo?.branchIds ?? [];
    setSelected(ids);
    setInitial(ids);
  }, [combo]);

  const dirty = !!combo && [...selected].sort().join(",") !== [...initial].sort().join(",");
  useUnsavedGuard(dirty);

  const requestClose = () => {
    if (saving) return;
    if (!dirty) return onClose();
    modal.confirm({ title: "Bỏ thay đổi?", content: UNSAVED_PROMPT, okText: "Bỏ thay đổi", okButtonProps: { danger: true }, cancelText: "Ở lại", onOk: onClose });
  };

  const save = async () => {
    if (!chainId || !combo || saving) return;
    setSaving(true);
    try {
      await combosApi.setComboBranches(chainId, combo.id, selected);
      await onSaved();
    } catch (err) {
      showApiError(message.error, err, "Không lưu được chi nhánh bán combo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={combo ? `Gán chi nhánh · ${combo.name}` : ""} open={!!combo} onClose={requestClose} styles={{ wrapper: { width: 460 }, body: { padding: 24 } }} data-testid="combo-branches-drawer">
      <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 14 }}>
        Chọn các chi nhánh bán combo này. Chi nhánh bỏ chọn ngừng bán; giá riêng đã đặt cho chi nhánh được giữ.
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {branches.map((b) => {
          const checked = selected.includes(b.id);
          const gaps = combo ? branchGapReasons(combo.components, items, b.id) : [];
          return (
            <div key={b.id}>
              <Checkbox checked={checked} onChange={(e) => setSelected((cur) => (e.target.checked ? [...cur, b.id] : cur.filter((id) => id !== b.id)))}>
                {b.name}
                <div style={{ fontSize: 12, color: palette.textSubtle }}>{b.address}</div>
              </Checkbox>
              {checked && gaps.length > 0 && (
                <div data-testid={`combo-gap-${b.id}`} style={{ marginTop: 4, marginLeft: 24, fontSize: 12.5, color: palette.warning.text }}>
                  Combo sẽ không hiện trên POS ở chi nhánh này: {gaps.join("; ")}. Gán món cho chi nhánh ở màn Menu toàn chuỗi.
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ActionButton type="primary" block style={{ marginTop: 20 }} loading={saving} onClick={() => void save()} data-testid="combo-branches-save">
        Lưu chi nhánh bán combo
      </ActionButton>
    </Drawer>
  );
}
