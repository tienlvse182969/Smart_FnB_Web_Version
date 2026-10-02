import { App, Card, Input, Modal, Switch, Table } from "antd";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { MenuCategory } from "../../types";
import { menuApi, showApiError } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

/** OW-02: danh mục món của chuỗi — thêm, sửa tên/mô tả, ẩn/hiện, đổi thứ tự hiển thị (displayOrder), xoá danh mục rỗng. */
export default function CategoriesTable() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const writeGuard = useWriteGuard();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | "new" | null>(null);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      const list = await menuApi.listCategories(chainId);
      setCategories([...list].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh mục");
    } finally {
      setLoading(false);
    }
  }, [chainId, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (c: MenuCategory, isActive: boolean) => {
    if (!chainId) return;
    try {
      await menuApi.updateCategory(chainId, c.id, { isActive });
      await load();
      message.success(isActive ? "Đã hiện danh mục" : "Đã ẩn danh mục");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được danh mục");
    }
  };

  /** Đổi chỗ hai danh mục kề nhau, rồi ghi lại displayOrder = vị trí cho mọi danh mục lệch (tránh trùng giá trị 0). */
  const move = async (index: number, delta: -1 | 1) => {
    if (!chainId) return;
    const next = [...categories];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      for (const [position, c] of next.entries()) {
        if (c.displayOrder !== position) await menuApi.updateCategory(chainId, c.id, { displayOrder: position });
      }
      await load();
    } catch (err) {
      showApiError(message.error, err, "Không đổi được thứ tự");
      await load();
    }
  };

  const confirmDelete = (c: MenuCategory) => {
    modal.confirm({
      title: `Xoá danh mục "${c.name}"?`,
      content: "Chỉ xoá được danh mục không còn món nào.",
      okText: "Xoá danh mục",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!chainId) return;
        try {
          await menuApi.deleteCategory(chainId, c.id);
          message.success("Đã xoá danh mục");
          await load();
        } catch (err) {
          // 409 khi còn món: hiện nguyên thông báo của BE.
          showApiError(message.error, err, "Không xoá được danh mục");
        }
      },
    });
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Danh mục món"
        sub="Nhóm món trên menu toàn chuỗi; thứ tự ở đây là thứ tự hiển thị tại POS"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm danh mục
          </ActionButton>
        }
      />
      <Table<MenuCategory>
        dataSource={categories}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        locale={{ emptyText: "Chưa có danh mục nào" }}
        columns={[
          {
            title: "Thứ tự",
            width: 110,
            render: (_, r, i) => (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} />
                <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={14} />} disabled={i === categories.length - 1} onClick={() => move(i, 1)} />
                <span style={{ color: palette.textSubtle, fontSize: 12, marginLeft: 4 }}>{i + 1}</span>
              </div>
            ),
          },
          {
            title: "Danh mục",
            dataIndex: "name",
            render: (v: string, r) => (
              <div style={{ opacity: r.isActive ? 1 : 0.5 }}>
                <div style={{ fontWeight: 600 }}>{v}</div>
                {r.description && <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.description}</div>}
              </div>
            ),
          },
          { title: "Số món", dataIndex: "itemCount", align: "right" },
          {
            title: "Hiển thị",
            dataIndex: "isActive",
            align: "center",
            render: (a: boolean, r) => <Switch checked={a} size="small" disabled={writeGuard.disabled} onChange={(c) => toggleActive(r, c)} />,
          },
          {
            title: "",
            align: "right",
            render: (_, r) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <ActionButton size="small" icon={<Pencil size={14} />} onClick={() => setEditing(r)}>
                  Sửa
                </ActionButton>
                <ActionButton size="small" danger icon={<Trash2 size={14} />} onClick={() => confirmDelete(r)}>
                  Xoá
                </ActionButton>
              </div>
            ),
          },
        ]}
      />
      <CategoryModal
        target={editing}
        nextOrder={categories.length}
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

function CategoryModal({
  target,
  nextOrder,
  onClose,
  onSaved,
}: {
  target: MenuCategory | "new" | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: (text: string) => Promise<void>;
}) {
  const { message } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const existing = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
  }, [target]);

  const save = async () => {
    if (!chainId || !name.trim()) return;
    setSaving(true);
    try {
      if (existing) {
        await menuApi.updateCategory(chainId, existing.id, { name: name.trim(), description: description.trim() });
        await onSaved("Đã cập nhật danh mục");
      } else {
        await menuApi.createCategory(chainId, { name: name.trim(), description: description.trim() || undefined, displayOrder: nextOrder });
        await onSaved("Đã thêm danh mục");
      }
    } catch (err) {
      // 409 trùng tên: hiện thông báo của BE.
      showApiError(message.error, err, "Không lưu được danh mục");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={existing ? `Sửa danh mục · ${existing.name}` : "Thêm danh mục"} open={!!target} onCancel={onClose} footer={null} destroyOnHidden>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "8px 0 6px" }}>Tên danh mục</div>
      <Input value={name} maxLength={150} onChange={(e) => setName(e.target.value)} placeholder="VD: Trà sữa" />
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "14px 0 6px" }}>Mô tả (tuỳ chọn)</div>
      <Input.TextArea value={description} maxLength={500} rows={2} onChange={(e) => setDescription(e.target.value)} />
      <ActionButton type="primary" block style={{ marginTop: 16 }} loading={saving} disabled={!name.trim()} onClick={save}>
        Lưu danh mục
      </ActionButton>
    </Modal>
  );
}
