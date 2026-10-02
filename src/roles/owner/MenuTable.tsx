import { App, Card, Checkbox, Drawer, Input, InputNumber, Select, Switch, Table } from "antd";
import { ArrowDown, ArrowUp, ImageOff, Pencil, Plus, Store, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { money } from "../../data";
import type { MenuCategory, MenuItem, MenuItemInput, MenuItemPatch, OptionGroup } from "../../types";
import { menuApi, optionsApi, showApiError, SKU_PATTERN, suggestSku } from "../../api";
import OptionPreview from "./OptionPreview";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

type StatusFilter = "all" | "active" | "off";

/**
 * OW-02, OW-04: Owner quản menu toàn chuỗi qua `menuApi` (real). Một giá toàn chuỗi (BR-13); tắt cấp chuỗi thì mọi chi nhánh
 * không bán được (BR-12). Danh mục quản ở màn "Danh mục món".
 */
export default function MenuTable() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const branches = useAppStore((s) => s.branches);
  const writeGuard = useWriteGuard();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<MenuItem | "new" | null>(null);
  const [assigning, setAssigning] = useState<MenuItem | null>(null);

  const loadCategories = useCallback(async () => {
    if (!chainId) return;
    try {
      setCategories(await menuApi.listCategories(chainId));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh mục");
    }
  }, [chainId, message]);

  const loadItems = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      setItems(await menuApi.listItems(chainId, { categoryId, search, isActive: status === "all" ? undefined : status === "active" }));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách món");
    } finally {
      setLoading(false);
    }
  }, [chainId, categoryId, search, status, message]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const toggleChain = async (item: MenuItem, isActive: boolean) => {
    if (!chainId) return;
    try {
      await menuApi.setItemActive(chainId, item.id, isActive);
      await loadItems();
      message.success(isActive ? "Đã bật món trên toàn chuỗi" : "Đã tắt món — mọi chi nhánh ngừng bán");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được");
    }
  };

  const confirmDelete = (item: MenuItem) => {
    modal.confirm({
      title: `Xoá món "${item.name}"?`,
      content: "Món bị xoá khỏi menu và mọi chi nhánh ngừng bán. Đơn cũ vẫn giữ giá lúc bán.",
      okText: "Xoá món",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!chainId) return;
        try {
          await menuApi.deleteItem(chainId, item.id);
          message.success("Đã xoá món");
          await Promise.all([loadItems(), loadCategories()]);
        } catch (err) {
          showApiError(message.error, err, "Không xoá được món");
        }
      },
    });
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Quản lý menu"
        sub="Bật/tắt kinh doanh ở cấp chuỗi — chi nhánh không bật lại được món đã tắt (BR-12)"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm món
          </ActionButton>
        }
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Select
          allowClear
          placeholder="Tất cả danh mục"
          style={{ width: 200 }}
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((c) => ({ value: c.id, label: `${c.name} (${c.itemCount})` }))}
        />
        <Select<StatusFilter>
          style={{ width: 150 }}
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Tất cả trạng thái" },
            { value: "active", label: "Đang bán" },
            { value: "off", label: "Đã tắt" },
          ]}
        />
        <Input.Search allowClear placeholder="Tìm theo tên hoặc SKU" style={{ maxWidth: 300 }} onSearch={setSearch} />
      </div>

      <Table<MenuItem>
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 860 }}
        locale={{ emptyText: "Chưa có món nào khớp bộ lọc" }}
        columns={[
          {
            title: "Món",
            dataIndex: "name",
            render: (v: string, r) => (
              <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: r.isActive ? 1 : 0.5 }}>
                <Thumb url={r.imageUrl} size={38} />
                <div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                  <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.sku}</div>
                </div>
              </div>
            ),
          },
          { title: "Danh mục", dataIndex: "categoryName" },
          { title: "Giá", dataIndex: "price", align: "right", render: (v: number) => money(v) },
          {
            title: "Có mặt tại",
            render: (_, r) => (
              <span data-testid="presence">
                {r.enabledBranchCount}/{branches.length} chi nhánh
              </span>
            ),
          },
          {
            title: "Bật",
            dataIndex: "isActive",
            align: "center",
            render: (a: boolean, r) => <Switch checked={a} size="small" disabled={writeGuard.disabled} onChange={(c) => toggleChain(r, c)} />,
          },
          {
            title: "",
            align: "right",
            render: (_, r) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <ActionButton size="small" icon={<Store size={14} />} onClick={() => setAssigning(r)}>
                  Gán chi nhánh
                </ActionButton>
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

      <ItemDrawer
        item={editing}
        categories={categories}
        branches={branches}
        onClose={() => setEditing(null)}
        onSaved={async (text) => {
          setEditing(null);
          message.success(text);
          await Promise.all([loadItems(), loadCategories()]);
        }}
      />
      <AssignDrawer
        item={assigning}
        branches={branches}
        onClose={() => setAssigning(null)}
        onSaved={async () => {
          setAssigning(null);
          message.success("Đã cập nhật chi nhánh bán món");
          await loadItems();
        }}
      />
    </Card>
  );
}

function Thumb({ url, size }: { url: string | null; size: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const box = { width: size, height: size, borderRadius: 8, background: palette.paper, display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 } as const;
  return (
    <div style={box} data-testid={failed || !url ? "thumb-fallback" : "thumb-image"}>
      {url && !failed ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setFailed(true)} />
      ) : (
        <ImageOff size={Math.round(size / 2.4)} color={palette.textSubtle} />
      )}
    </div>
  );
}

function AssignDrawer({
  item,
  branches,
  onClose,
  onSaved,
}: {
  item: MenuItem | null;
  branches: { id: string; name: string; address: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(item?.branches.filter((b) => b.isEnabled).map((b) => b.branchId) ?? []);
  }, [item]);

  const save = async () => {
    if (!chainId || !item) return;
    setSaving(true);
    try {
      await menuApi.setItemBranches(chainId, item.id, selected);
      await onSaved();
    } catch (err) {
      showApiError(message.error, err, "Không lưu được chi nhánh bán món");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={item ? `Gán chi nhánh · ${item.name}` : ""} open={!!item} onClose={onClose} styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}>
      <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 14 }}>
        Chọn các chi nhánh bán món này. Chi nhánh bỏ chọn sẽ ngừng bán; chi nhánh mới chọn do Manager bật "còn bán" mỗi ngày.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {branches.map((b) => (
          <Checkbox
            key={b.id}
            checked={selected.includes(b.id)}
            onChange={(e) => setSelected((cur) => (e.target.checked ? [...cur, b.id] : cur.filter((id) => id !== b.id)))}
          >
            {b.name}
            <div style={{ fontSize: 12, color: palette.textSubtle }}>{b.address}</div>
          </Checkbox>
        ))}
      </div>
      <ActionButton type="primary" block style={{ marginTop: 20 }} loading={saving} onClick={save}>
        Lưu chi nhánh bán món
      </ActionButton>
    </Drawer>
  );
}

function ItemDrawer({
  item,
  categories,
  branches,
  onClose,
  onSaved,
}: {
  item: MenuItem | "new" | null;
  categories: MenuCategory[];
  branches: { id: string; name: string; address: string }[];
  onClose: () => void;
  onSaved: (text: string) => Promise<void>;
}) {
  const { message } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const isNew = item === "new";
  const existing = item && item !== "new" ? item : null;

  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [skuTouched, setSkuTouched] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prep, setPrep] = useState<number | null>(null);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // Tuỳ chọn món (OW-03): CHỜ BE — lưu tạm trong mock theo ID món thật.
  const [allGroups, setAllGroups] = useState<OptionGroup[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [noBatch, setNoBatch] = useState(false);

  useEffect(() => {
    if (!item || !chainId) return;
    const id = item !== "new" ? item.id : null;
    Promise.all([optionsApi.listGroups(chainId), optionsApi.listItemConfigs(chainId)]).then(
      ([groups, configs]) => {
        const cfg = id ? configs.find((c) => c.menuItemId === id) : undefined;
        setAllGroups(groups);
        setGroupIds((cfg?.groupIds ?? []).filter((g) => groups.some((x) => x.id === g)));
        setNoBatch(cfg?.noBatch ?? false);
      },
      (err) => showApiError(message.error, err, "Không tải được tuỳ chọn món"),
    );
  }, [item, chainId]);

  useEffect(() => {
    if (!item) return;
    setCategoryId(existing?.categoryId ?? categories[0]?.id);
    setName(existing?.name ?? "");
    setSku(existing?.sku ?? "");
    setSkuTouched(!!existing);
    setPrice(existing?.price ?? null);
    setDescription(existing?.description ?? "");
    setImageUrl(existing?.imageUrl ?? "");
    setPrep(existing?.preparationMinutes ?? null);
    // Tạo mới: mặc định chọn sẵn mọi chi nhánh và gửi branchIds tường minh.
    setBranchIds(branches.map((b) => b.id));
  }, [item]);

  const onName = (value: string) => {
    setName(value);
    if (isNew && !skuTouched) setSku(suggestSku(value));
  };

  const valid =
    !!categoryId && !!name.trim() && price !== null && Number.isInteger(price) && price >= 0 && (!isNew || SKU_PATTERN.test(sku)) && (!isNew || branchIds.length > 0);

  const save = async () => {
    if (!chainId || !valid || !categoryId || price === null) return;
    setSaving(true);
    try {
      const common = {
        categoryId,
        name: name.trim(),
        price,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        preparationMinutes: prep ?? undefined,
      };
      if (isNew) {
        const input: MenuItemInput = { ...common, sku, branchIds };
        const created = await menuApi.createItem(chainId, input);
        await optionsApi.setItemConfig(chainId, { menuItemId: created.id, groupIds, noBatch });
        await onSaved("Đã thêm món vào menu chuỗi");
      } else if (existing) {
        const patch: MenuItemPatch = common;
        await menuApi.updateItem(chainId, existing.id, patch);
        await optionsApi.setItemConfig(chainId, { menuItemId: existing.id, groupIds, noBatch });
        await onSaved("Đã cập nhật món");
      }
    } catch (err) {
      showApiError(message.error, err, "Không lưu được món");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={isNew ? "Thêm món" : `Sửa món · ${existing?.name ?? ""}`}
      open={!!item}
      onClose={onClose}
      styles={{ wrapper: { width: 440 }, body: { padding: 24 } }}
    >
      <Field label="Danh mục">
        <Select
          style={{ width: "100%" }}
          value={categoryId}
          onChange={setCategoryId}
          placeholder={categories.length ? "Chọn danh mục" : "Chưa có danh mục — tạo ở màn Danh mục món"}
          options={categories.map((c) => ({ value: c.id, label: c.isActive ? c.name : `${c.name} (đang ẩn)` }))}
        />
      </Field>
      <Field label="Tên món">
        <Input value={name} maxLength={150} onChange={(e) => onName(e.target.value)} placeholder="VD: Trà sữa trân châu" />
      </Field>
      <Field label={isNew ? "SKU (A-Z, 0-9, _ -; tối đa 50 ký tự)" : "SKU (không đổi được sau khi tạo)"}>
        <Input
          value={sku}
          maxLength={50}
          disabled={!isNew}
          status={isNew && sku && !SKU_PATTERN.test(sku) ? "error" : undefined}
          onChange={(e) => {
            setSkuTouched(true);
            setSku(e.target.value.toUpperCase());
          }}
          placeholder="Tự gợi ý từ tên, có thể sửa"
        />
      </Field>
      <Field label="Giá (₫, số nguyên)">
        <InputNumber value={price} onChange={setPrice} style={{ width: "100%" }} min={0} precision={0} step={1000} />
      </Field>
      <Field label="Mô tả">
        <Input.TextArea value={description} maxLength={2000} rows={2} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Ảnh (URL) — TODO(BE): chưa có tải ảnh lên">
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Thumb url={imageUrl.trim() || null} size={56} />
          <Input value={imageUrl} maxLength={500} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
      </Field>
      <Field label="Thời gian pha (phút, tuỳ chọn)">
        <InputNumber value={prep} onChange={setPrep} style={{ width: "100%" }} min={0} max={1440} precision={0} />
      </Field>
      {isNew && (
        <Field label="Chi nhánh bán món">
          <div style={{ display: "grid", gap: 8 }}>
            {branches.map((b) => (
              <Checkbox
                key={b.id}
                checked={branchIds.includes(b.id)}
                onChange={(e) => setBranchIds((cur) => (e.target.checked ? [...cur, b.id] : cur.filter((id) => id !== b.id)))}
              >
                {b.name}
              </Checkbox>
            ))}
          </div>
        </Field>
      )}
      <Field label="Tuỳ chọn món — đang lưu tạm, chờ BE">
        <ItemOptions allGroups={allGroups} groupIds={groupIds} onGroups={setGroupIds} noBatch={noBatch} onNoBatch={setNoBatch} />
      </Field>
      <Field label="Xem trước tại POS">
        <OptionPreview itemName={name.trim()} itemPrice={price ?? 0} groups={groupIds.flatMap((id) => allGroups.find((g) => g.id === id) ?? [])} />
      </Field>
      <ActionButton type="primary" block style={{ marginTop: 8 }} loading={saving} disabled={!valid} onClick={save} data-testid="item-save">
        {isNew ? "Thêm món" : "Lưu món"}
      </ActionButton>
    </Drawer>
  );
}

function ItemOptions({
  allGroups,
  groupIds,
  onGroups,
  noBatch,
  onNoBatch,
}: {
  allGroups: OptionGroup[];
  groupIds: string[];
  onGroups: (ids: string[]) => void;
  noBatch: boolean;
  onNoBatch: (v: boolean) => void;
}) {
  const chosen = groupIds.flatMap((id) => allGroups.find((g) => g.id === id) ?? []);
  const move = (i: number, d: -1 | 1) => {
    const next = [...groupIds];
    const t = i + d;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    onGroups(next);
  };
  return (
    <div data-testid="item-options">
      <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
        {chosen.map((g, i) => (
          <div key={g.id} data-testid={`item-group-${g.code}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={13} />} disabled={i === 0} onClick={() => move(i, -1)} />
            <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={13} />} disabled={i === chosen.length - 1} onClick={() => move(i, 1)} />
            <span style={{ flex: 1 }}>{g.name}</span>
            <ActionButton size="small" aria-label="Gỡ nhóm" icon={<X size={13} />} onClick={() => onGroups(groupIds.filter((id) => id !== g.id))} />
          </div>
        ))}
      </div>
      <Select
        style={{ width: "100%" }}
        placeholder={allGroups.length ? "Thêm nhóm tuỳ chọn…" : "Chưa có nhóm — tạo ở màn Tuỳ chọn món"}
        value={null}
        onChange={(id: string) => onGroups([...groupIds, id])}
        options={allGroups.filter((g) => !groupIds.includes(g.id)).map((g) => ({ value: g.id, label: g.name }))}
        data-testid="item-group-add"
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <Switch size="small" checked={noBatch} onChange={onNoBatch} data-testid="item-nobatch" aria-label="Không gom món" />
        <span style={{ fontSize: 13 }}>Không gom món khi pha</span>
      </div>
      <div data-testid="item-options-note" style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6 }}>
        Tuỳ chọn đang lưu tạm trên trình duyệt, chờ BE (api-contract-plan #13, #17). Tải lại trang sẽ mất.
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
