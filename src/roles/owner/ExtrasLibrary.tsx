import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Card, Input, Modal, Table } from "antd";
import { CirclePlus, Image as ImageIcon, Pencil, Plus } from "lucide-react";
import type { MenuExtra } from "../../types";
import { describeApiError, extrasApi, showApiError } from "../../api";
import { MAX_EXTRA_NAME, validateExtra } from "../../api/modules/extras/rules";
import MoneyInput from "../../components/MoneyInput";
import { EmptyState, PageHeader } from "../../components/bits";
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
      <PageHeader
        title="Topping"
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
          locale={{
            emptyText: error ? "—" : (
              <EmptyState
                icon={<CirclePlus size={24} />}
                title="Chưa có topping nào"
                description="Tạo topping rồi gắn vào món để khách chọn thêm."
                actionNode={<ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>Thêm topping</ActionButton>}
              />
            ),
          }}
          columns={[
            {
              title: "Topping",
              dataIndex: "name",
              render: (name: string, row) => <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 600, opacity: row.isActive ? 1 : 0.5 }}>
                {row.imageUrl ? <img src={row.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} /> : <span aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 8, background: palette.paperSubtle, display: "grid", placeItems: "center" }}><ImageIcon size={18} /></span>}
                {name}
              </span>,
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
        onClose={() => { setEditing(null); void load(); }}
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedDetails, setSavedDetails] = useState<{ id: string; name: string; price: number } | null>(null);
  const [uploadError, setUploadError] = useState(false);

  useEffect(() => {
    if (!target) return;
    setName(existing?.name ?? "");
    setPrice(existing?.price ?? null);
    setImageFile(null);
    setSavedDetails(null);
    setUploadError(false);
  }, [target, existing]);

  useEffect(() => {
    if (!imageFile) { setPreview(null); return; }
    const url = URL.createObjectURL(imageFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const dirty = !!target && (name !== (savedDetails?.name ?? existing?.name ?? "") || price !== (savedDetails?.price ?? existing?.price ?? null) || !!imageFile);
  useUnsavedGuard(dirty);

  const problem = price === null ? "Nhập giá mặc định" : validateExtra({ name, price });
  const duplicate = existingNames.some((x) => x.id !== (savedDetails?.id ?? existing?.id) && x.name.trim().toLowerCase() === name.trim().toLowerCase());

  const requestClose = () => {
    if (saving) return;
    if (!dirty) return onClose();
    modal.confirm({ title: "Bỏ thay đổi?", content: UNSAVED_PROMPT, okText: "Bỏ thay đổi", okButtonProps: { danger: true }, cancelText: "Ở lại", onOk: onClose });
  };

  const save = async () => {
    if (!chainId || saving || problem || price === null) return;
    setSaving(true);
    try {
      const trimmedName = name.trim();
      let id = savedDetails?.id ?? existing?.id;
      if (!savedDetails || savedDetails.name !== trimmedName || savedDetails.price !== price) {
        if (id) await extrasApi.updateExtra(chainId, id, { name: trimmedName, price, isActive: existing?.isActive ?? true });
        else {
          const created = await extrasApi.createExtra(chainId, { name: trimmedName, price });
          id = created.id;
        }
        setSavedDetails({ id: id!, name: trimmedName, price });
      }
      if (imageFile) {
        try {
          await extrasApi.uploadExtraImage(chainId, id!, imageFile);
        } catch (err) {
          setUploadError(true);
          showApiError(message.error, err, "Không tải được ảnh topping");
          return;
        }
      }
      setUploadError(false);
      await onSaved(existing ? "Đã cập nhật topping" : "Đã thêm topping");
    } catch (err) {
      showApiError(message.error, err, "Không lưu được thông tin topping");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!target}
      title={existing ? `Sửa topping · ${existing.name}` : "Thêm topping"}
      okText={uploadError ? "Thử lưu ảnh lại" : existing || savedDetails ? "Lưu topping" : "Thêm topping"}
      cancelText="Đóng"
      okButtonProps={{ disabled: !!problem, loading: saving }}
      onOk={() => void save()}
      onCancel={requestClose}
      maskClosable={false}
      destroyOnHidden
    >
      {uploadError && <Alert type="warning" showIcon data-testid="extra-upload-error" style={{ marginBottom: 16 }} message="Thông tin topping đã lưu, ảnh chưa tải lên" description="Bạn có thể bấm Thử lưu ảnh lại. Hệ thống sẽ dùng topping đã lưu, không tạo thêm topping mới." />}
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>Giá mặc định (₫, số nguyên)</div>
        <MoneyInput value={price} onChange={setPrice} data-testid="extra-price" />
      </div>
      <div>
        <label htmlFor="extra-image" style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>Ảnh topping</label>
        {(preview || existing?.imageUrl) && <img src={preview || existing?.imageUrl || undefined} alt="Ảnh xem trước topping" style={{ display: "block", width: 72, height: 72, objectFit: "cover", borderRadius: 8, marginBottom: 8 }} />}
        <input id="extra-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { message.error("Chỉ chọn ảnh JPEG, PNG hoặc WebP"); return; }
          if (file.size > 5 * 1024 * 1024) { message.error("Ảnh không được vượt quá 5 MB"); return; }
          setImageFile(file);
        }} />
        {imageFile && <ActionButton size="small" onClick={() => setImageFile(null)}>Bỏ chọn</ActionButton>}
        <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6 }}>JPEG, PNG hoặc WebP · tối đa 5 MB. Ảnh được tải lên khi lưu topping.</div>
      </div>
    </Modal>
  );
}
