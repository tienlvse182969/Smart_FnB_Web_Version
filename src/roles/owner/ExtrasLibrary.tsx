import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Card, Input, Modal, Table } from "antd";
import { Pencil, Plus } from "lucide-react";
import type { MenuExtra } from "../../types";
import { describeApiError, extrasApi, showApiError } from "../../api";
import { MAX_EXTRA_NAME, validateExtra } from "../../api/modules/extras/rules";
import MoneyInput from "../../components/MoneyInput";
import { SectionTitle } from "../../components/bits";
import { money } from "../../data";
import { UNSAVED_PROMPT, useUnsavedGuard } from "../../lib/useUnsavedGuard";
import ActionButton, { ActionSwitch } from "../../plan/ActionButton";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

/**
 * OW-15 (mục 27, BR-80): thư viện topping của chuỗi — tên, giá mặc định, cờ kinh doanh cấp chuỗi. Gắn topping vào món ở khung "Sửa món"
 * (Menu toàn chuỗi). BE không xoá thật: "Tắt" giữ liên kết với món và ảnh chụp trong đơn; đổi giá ở đây không đổi giá đã gắn theo món.
 */
export default function ExtrasLibrary() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const [rows, setRows] = useState<MenuExtra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MenuExtra | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      setRows(await extrasApi.listExtras(chainId));
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

  const turnOn = async (extra: MenuExtra) => {
    if (!chainId || busyId) return;
    setBusyId(extra.id);
    try {
      await extrasApi.updateExtra(chainId, extra.id, { name: extra.name, price: extra.price, isActive: true });
      message.success(`Đã bật topping "${extra.name}"`);
    } catch (err) {
      showApiError(message.error, err, "Không bật được topping");
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const confirmTurnOff = (extra: MenuExtra) => {
    modal.confirm({
      title: `Tắt topping "${extra.name}"?`,
      content:
        "Mọi món đang gắn topping này sẽ không bán được nó ở mọi chi nhánh. Liên kết với món và giá đã gắn được giữ nguyên, đơn cũ không đổi; bật lại là bán tiếp. Máy chủ chưa trả số món đang gắn nên không hiện được số này.",
      okText: "Tắt topping",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!chainId) return;
        setBusyId(extra.id);
        try {
          await extrasApi.disableExtra(chainId, extra.id);
          message.success(`Đã tắt topping "${extra.name}"`);
        } catch (err) {
          showApiError(message.error, err, "Không tắt được topping");
        } finally {
          setBusyId(null);
          await load();
        }
      },
    });
  };

  const names = useMemo(() => rows.map((r) => ({ id: r.id, name: r.name })), [rows]);

  return (
    <div data-testid="extras-library">
      <SectionTitle
        title="Topping thêm"
        sub="Thư viện topping của chuỗi. Gắn vào từng món ở khung Sửa món để đặt giá cộng thêm và số phần tối đa."
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")} data-testid="extra-add">
            Thêm topping
          </ActionButton>
        }
      />
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Không tải được thư viện topping"
          description={error}
          action={<ActionButton onClick={() => void load()}>Thử lại</ActionButton>}
        />
      )}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <Table<MenuExtra>
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: error ? "—" : "Chưa có topping nào. Bấm Thêm topping để tạo." }}
          columns={[
            {
              title: "Topping",
              dataIndex: "name",
              render: (name: string, row) => <span style={{ fontWeight: 600, opacity: row.isActive ? 1 : 0.5 }}>{name}</span>,
            },
            { title: "Giá mặc định", dataIndex: "price", align: "right", render: (price: number) => money(price) },
            {
              title: "Kinh doanh",
              dataIndex: "isActive",
              align: "center",
              render: (active: boolean, row) => (
                <ActionSwitch
                  size="small"
                  checked={active}
                  loading={busyId === row.id}
                  disabled={busyId !== null}
                  aria-label={`Kinh doanh topping ${row.name}`}
                  onChange={(checked) => (checked ? void turnOn(row) : confirmTurnOff(row))}
                />
              ),
            },
            {
              title: "",
              align: "right",
              render: (_, row) => (
                <ActionButton size="small" icon={<Pencil size={14} />} onClick={() => setEditing(row)}>
                  Sửa
                </ActionButton>
              ),
            },
          ]}
        />
        <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 12 }}>
          Máy chủ không xoá topping: Tắt để ngừng bán. Đổi giá mặc định chỉ áp cho lần gắn sau, giá đã gắn theo từng món giữ nguyên.
        </div>
      </Card>
      <ExtraModal
        target={editing}
        existingNames={names}
        onClose={() => setEditing(null)}
        onSaved={async (text) => {
          setEditing(null);
          message.success(text);
          await load();
        }}
      />
    </div>
  );
}

function ExtraModal({
  target,
  existingNames,
  onClose,
  onSaved,
}: {
  target: MenuExtra | "new" | null;
  existingNames: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (text: string) => Promise<void>;
}) {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const existing = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setName(existing?.name ?? "");
    setPrice(existing?.price ?? null);
  }, [target, existing]);

  const dirty = !!target && (name !== (existing?.name ?? "") || price !== (existing?.price ?? null));
  useUnsavedGuard(dirty);

  const problem = price === null ? "Nhập giá mặc định" : validateExtra({ name, price });
  const duplicate = existingNames.some((x) => x.id !== existing?.id && x.name.trim().toLowerCase() === name.trim().toLowerCase());

  const requestClose = () => {
    if (saving) return;
    if (!dirty) return onClose();
    modal.confirm({ title: "Bỏ thay đổi?", content: UNSAVED_PROMPT, okText: "Bỏ thay đổi", okButtonProps: { danger: true }, cancelText: "Ở lại", onOk: onClose });
  };

  const save = async () => {
    if (!chainId || saving || problem || price === null) return;
    setSaving(true);
    try {
      if (existing) {
        await extrasApi.updateExtra(chainId, existing.id, { name: name.trim(), price, isActive: existing.isActive });
        await onSaved("Đã cập nhật topping");
      } else {
        await extrasApi.createExtra(chainId, { name: name.trim(), price });
        await onSaved("Đã thêm topping");
      }
    } catch (err) {
      showApiError(message.error, err, "Không lưu được topping");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!target}
      title={existing ? `Sửa topping · ${existing.name}` : "Thêm topping"}
      okText={existing ? "Lưu topping" : "Thêm topping"}
      cancelText="Đóng"
      okButtonProps={{ disabled: !!problem, loading: saving }}
      onOk={() => void save()}
      onCancel={requestClose}
      maskClosable={false}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>Tên topping</div>
        <Input
          value={name}
          maxLength={MAX_EXTRA_NAME}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Trân châu đen"
          status={duplicate ? "error" : undefined}
          data-testid="extra-name"
        />
        {duplicate && <div style={{ fontSize: 12, color: palette.error.text, marginTop: 4 }}>Đã có topping trùng tên trong chuỗi.</div>}
      </div>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>Giá mặc định (₫, số nguyên)</div>
        <MoneyInput value={price} onChange={setPrice} data-testid="extra-price" />
      </div>
    </Modal>
  );
}
