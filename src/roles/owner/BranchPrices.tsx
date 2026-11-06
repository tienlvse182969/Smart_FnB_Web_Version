import { useBlocker } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Card, Input, Select, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { RotateCcw, TriangleAlert } from "lucide-react";
import type { PriceCell, PriceMatrix, PriceProductType, PriceUpdate } from "../../types";
import { branchPricesApi, combosApi, describeApiError, menuApi, showApiError } from "../../api";
import { MAX_CELLS_PER_REQUEST, WARNING_TEXT, cellKey, chunkUpdates, priceWarning, validateBranchPrice } from "../../api/modules/branchPrices/rules";
import MoneyInput from "../../components/MoneyInput";
import { SectionTitle } from "../../components/bits";
import { money } from "../../data";
import { UNSAVED_PROMPT, useUnsavedGuard } from "../../lib/useUnsavedGuard";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

interface ProductRow {
  kind: "product";
  rowKey: string;
  type: PriceProductType;
  productId: string;
  name: string;
  category: string;
  chainPrice: number;
}
interface GroupRow {
  kind: "group";
  rowKey: string;
  name: string;
}
type Row = ProductRow | GroupRow;

const STATUS_LABEL: Record<string, string> = { closed: "Đóng cửa", suspended: "Tạm ngưng" };

/**
 * OW-16 (mục 29, BR-84, BR-85): bảng giá theo chi nhánh — hàng là món và combo (nhóm theo danh mục), cột là chi nhánh. Ô chưa đặt giá riêng hiện mờ
 * giá chuỗi, ô có giá riêng tô đậm. Sửa nhanh từng ô, hoặc chọn nhiều dòng + nhiều chi nhánh để áp cùng một giá; "Về giá chuỗi" xoá giá riêng.
 * Cảnh báo (vẫn lưu được) khi giá thấp hơn 50% hoặc cao hơn 2 lần giá chuỗi. Lưu: gửi theo lô (BE lưu cả lô trong một giao dịch); lô lỗi thì thử
 * từng ô để tô đỏ đúng ô lỗi. Giá tuỳ chọn, topping và phụ thu biến thể chỉ có một giá toàn chuỗi (mục 29.2).
 */
export default function BranchPrices() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const storeBranches = useAppStore((s) => s.branches);
  const writeGuard = useWriteGuard();

  const [matrix, setMatrix] = useState<PriceMatrix | null>(null);
  const [categoryOf, setCategoryOf] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Map<string, PriceUpdate>>(new Map());
  const [failed, setFailed] = useState<Map<string, string>>(new Map());
  const [editing, setEditing] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkBranches, setBulkBranches] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      const data = await branchPricesApi.getMatrix(chainId);
      setMatrix(data);
      setError(null);
      // Danh mục chỉ để nhóm hàng: lỗi tải thì vẫn hiện bảng, không nhóm.
      try {
        const [items, combos, cats] = await Promise.all([menuApi.listItems(chainId), combosApi.listCombos(chainId), menuApi.listCategories(chainId)]);
        const names = new Map(cats.map((c) => [c.id, c.name]));
        const map = new Map<string, string>();
        for (const i of items) map.set(`ITEM:${i.id}`, i.categoryName || names.get(i.categoryId) || "Khác");
        for (const c of combos) map.set(`COMBO:${c.id}`, names.get(c.categoryId) ?? "Combo");
        setCategoryOf(map);
      } catch {
        setCategoryOf(new Map());
      }
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cells = useMemo(() => new Map((matrix?.cells ?? []).map((c) => [cellKey(c.type, c.productId, c.branchId), c])), [matrix]);

  const rows: Row[] = useMemo(() => {
    const products = new Map<string, ProductRow>();
    for (const c of matrix?.cells ?? []) {
      const k = `${c.type}:${c.productId}`;
      if (!products.has(k)) products.set(k, { kind: "product", rowKey: k, type: c.type, productId: c.productId, name: c.name, category: categoryOf.get(k) ?? (c.type === "COMBO" ? "Combo" : "Khác"), chainPrice: c.chainPrice });
    }
    const needle = search.trim().toLowerCase();
    const list = [...products.values()].filter((p) => !needle || p.name.toLowerCase().includes(needle));
    list.sort((a, b) => a.category.localeCompare(b.category) || a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    const out: Row[] = [];
    let current = "";
    for (const p of list) {
      if (p.category !== current) {
        current = p.category;
        out.push({ kind: "group", rowKey: `group:${current}`, name: current });
      }
      out.push(p);
    }
    return out;
  }, [matrix, categoryOf, search]);

  const dirty = drafts.size > 0;
  useUnsavedGuard(dirty);
  const blocker = useBlocker(dirty && !saving);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    modal.confirm({
      title: "Rời khỏi bảng giá?",
      content: UNSAVED_PROMPT,
      okText: "Rời đi",
      okButtonProps: { danger: true },
      cancelText: "Ở lại",
      onOk: () => blocker.proceed(),
      onCancel: () => blocker.reset(),
    });
  }, [blocker, modal]);

  /** Đặt/bỏ bản nháp của một ô so với giá đã lưu. `price` null = về giá chuỗi. */
  const setDraft = (cell: PriceCell, price: number | null) => {
    const key = cellKey(cell.type, cell.productId, cell.branchId);
    setFailed((cur) => {
      if (!cur.has(key)) return cur;
      const next = new Map(cur);
      next.delete(key);
      return next;
    });
    setDrafts((cur) => {
      const next = new Map(cur);
      // Trùng giá đã lưu (kể cả "vẫn dùng giá chuỗi") thì không còn là thay đổi.
      if (price === cell.priceOverride) next.delete(key);
      else next.set(key, { type: cell.type, productId: cell.productId, branchId: cell.branchId, priceOverride: price });
      return next;
    });
  };

  const valueOf = (cell: PriceCell): number | null => {
    const draft = drafts.get(cellKey(cell.type, cell.productId, cell.branchId));
    return draft ? draft.priceOverride : cell.priceOverride;
  };

  const applyBulk = (price: number | null) => {
    if (!selectedRows.length || !bulkBranches.length) return;
    let count = 0;
    for (const rowKey of selectedRows) {
      const [type, productId] = rowKey.split(/:(.+)/) as [PriceProductType, string];
      for (const branchId of bulkBranches) {
        const cell = cells.get(cellKey(type, productId, branchId));
        if (cell) {
          setDraft(cell, price);
          count++;
        }
      }
    }
    message.info(count ? `Đã áp cho ${count} ô — bấm Lưu thay đổi để ghi` : "Các chi nhánh đã chọn chưa được gán sản phẩm nào đã chọn");
  };

  const save = async () => {
    if (!chainId || saving || !drafts.size) return;
    setSaving(true);
    const updates = [...drafts.values()];
    const savedKeys: string[] = [];
    const errors = new Map<string, string>();
    let warned = 0;
    try {
      for (const batch of chunkUpdates(updates, MAX_CELLS_PER_REQUEST)) {
        try {
          const done = await branchPricesApi.savePrices(chainId, batch);
          warned += done.filter((c) => c.warnings.length).length;
          savedKeys.push(...batch.map((u) => cellKey(u.type, u.productId, u.branchId)));
        } catch (batchErr) {
          // BE lưu cả lô hoặc không gì cả: lô lỗi thì thử từng ô để biết ô nào lỗi.
          for (const u of batch) {
            const key = cellKey(u.type, u.productId, u.branchId);
            try {
              const [one] = await branchPricesApi.savePrices(chainId, [u]);
              warned += one.warnings.length ? 1 : 0;
              savedKeys.push(key);
            } catch (cellErr) {
              errors.set(key, describeApiError(cellErr ?? batchErr));
            }
          }
        }
      }
    } finally {
      setDrafts((cur) => {
        const next = new Map(cur);
        savedKeys.forEach((k) => next.delete(k));
        return next;
      });
      setFailed(errors);
      setSaving(false);
      await load();
    }
    const note = warned ? ` (${warned} ô có giá lệch xa giá chuỗi)` : "";
    if (errors.size) message.warning(`Đã lưu ${savedKeys.length} ô, ${errors.size} ô lỗi (tô đỏ)${note}`);
    else message.success(`Đã lưu ${savedKeys.length} ô${note} — POS và màn hình khách của chi nhánh tải lại menu`);
  };

  const discard = () => {
    setDrafts(new Map());
    setFailed(new Map());
    setEditing(null);
  };

  const readOnly = writeGuard.disabled;
  const branches = matrix?.branches ?? [];
  const statusOf = (branchId: string) => STATUS_LABEL[storeBranches.find((b) => b.id === branchId)?.status ?? ""];

  const renderCell = (row: ProductRow, branchId: string) => {
    const key = cellKey(row.type, row.productId, branchId);
    const cell = cells.get(key);
    if (!cell) return <span title="Chưa gán cho chi nhánh này" style={{ color: palette.textSubtle }}>—</span>;
    const value = valueOf(cell);
    const draft = drafts.has(key);
    const err = failed.get(key);
    const warn = priceWarning(value, cell.chainPrice);
    if (editing === key && !readOnly) {
      return (
        <CellEditor
          initial={value ?? cell.chainPrice}
          label={`Giá ${row.name} tại chi nhánh`}
          onCancel={() => setEditing(null)}
          onCommit={(typed) => {
            setEditing(null);
            if (typed === null || validateBranchPrice(typed)) return;
            // Nhập đúng giá chuỗi mà chưa có giá riêng: không tạo giá riêng thừa.
            setDraft(cell, typed === cell.chainPrice && cell.priceOverride === null ? null : typed);
          }}
        />
      );
    }
    return (
      <div
        data-testid={`price-cell-${key}`}
        data-state={err ? "error" : draft ? "edited" : value !== null ? "custom" : "chain"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 6px",
          borderRadius: 6,
          border: `1px solid ${err ? palette.error.text : "transparent"}`,
          background: draft ? palette.warning.bg : undefined,
        }}
      >
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setEditing(key)}
          aria-label={`Sửa giá ${row.name} tại chi nhánh`}
          style={{ all: "unset", cursor: readOnly ? "default" : "pointer", fontWeight: value !== null ? 700 : 400, color: value !== null ? palette.ink : palette.textSubtle, opacity: value !== null ? 1 : 0.6 }}
        >
          {money(value ?? cell.chainPrice)}
        </button>
        {warn && (
          <Tooltip title={WARNING_TEXT[warn]}>
            <TriangleAlert size={14} color={palette.warning.text} aria-label={WARNING_TEXT[warn]} />
          </Tooltip>
        )}
        {err && <span style={{ fontSize: 11, color: palette.error.text }}>{err}</span>}
        {value !== null && !readOnly && (
          <button type="button" aria-label={`Về giá chuỗi ${row.name}`} title="Về giá chuỗi" onClick={() => setDraft(cell, null)} style={{ all: "unset", cursor: "pointer", display: "inline-flex" }}>
            <RotateCcw size={13} color={palette.textSubtle} />
          </button>
        )}
      </div>
    );
  };

  const total = columnsCount(branches.length);
  const columns: ColumnsType<Row> = [
    {
      title: "Món / combo",
      key: "name",
      fixed: "left",
      width: 240,
      onCell: (row) => (row.kind === "group" ? { colSpan: total } : {}),
      render: (_, row) =>
        row.kind === "group" ? (
          <b style={{ color: palette.textMuted }}>{row.name}</b>
        ) : (
          <div>
            <div style={{ fontWeight: 600 }}>{row.name}</div>
            <div style={{ fontSize: 11.5, color: palette.textSubtle }}>{row.type === "COMBO" ? "Combo" : "Món"}</div>
          </div>
        ),
    },
    {
      title: "Giá chuỗi",
      key: "chain",
      width: 110,
      align: "right",
      onCell: (row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_, row) => (row.kind === "product" ? money(row.chainPrice) : null),
    },
    ...branches.map((b) => ({
      title: (
        <div>
          {b.name}
          {statusOf(b.id) && (
            <Tag style={{ marginLeft: 6 }} color="default">
              {statusOf(b.id)}
            </Tag>
          )}
        </div>
      ),
      key: b.id,
      width: 190,
      onCell: (row: Row) => (row.kind === "group" ? { colSpan: 0 } : {}),
      render: (_: unknown, row: Row) => (row.kind === "product" ? renderCell(row, b.id) : null),
    })),
  ];

  return (
    <div data-testid="branch-prices">
      <SectionTitle title="Giá theo chi nhánh" sub="Giá chuỗi là mặc định. Đặt giá riêng cho từng chi nhánh; đổi giá chuỗi không ghi đè giá chi nhánh đã đặt." />
      {readOnly && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={writeGuard.reason ?? "Doanh nghiệp đang ở chế độ chỉ đọc"} />}
      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Không tải được bảng giá" description={error} action={<ActionButton onClick={() => void load()}>Thử lại</ActionButton>} />}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <Input.Search allowClear placeholder="Tìm món hoặc combo" style={{ maxWidth: 260 }} onChange={(e) => setSearch(e.target.value)} />
          <Select
            mode="multiple"
            maxTagCount="responsive"
            placeholder="Chi nhánh áp giá"
            style={{ minWidth: 220 }}
            value={bulkBranches}
            onChange={setBulkBranches}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            disabled={readOnly}
          />
          <span style={{ width: 150 }}>
            <MoneyInput placeholder="Giá áp chung" value={bulkPrice} onChange={setBulkPrice} disabled={readOnly} aria-label="Giá áp chung" />
          </span>
          <ActionButton disabled={!selectedRows.length || !bulkBranches.length || bulkPrice === null} onClick={() => applyBulk(bulkPrice)} data-testid="bulk-apply">
            Áp giá cho {selectedRows.length} dòng đã chọn
          </ActionButton>
          <ActionButton disabled={!selectedRows.length || !bulkBranches.length} onClick={() => applyBulk(null)} data-testid="bulk-reset">
            Về giá chuỗi
          </ActionButton>
        </div>
        {dirty && (
          <div data-testid="price-savebar" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, padding: "8px 12px", borderRadius: 10, background: palette.warning.bg }}>
            <b>{drafts.size} ô chưa lưu</b>
            {failed.size > 0 && <span style={{ color: palette.error.text }}>{failed.size} ô lỗi</span>}
            <span style={{ flex: 1 }} />
            <ActionButton onClick={discard} disabled={saving}>
              Bỏ thay đổi
            </ActionButton>
            <ActionButton type="primary" loading={saving} onClick={() => void save()} data-testid="price-save">
              Lưu thay đổi
            </ActionButton>
          </div>
        )}
        <Table<Row>
          rowKey="rowKey"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 350 + branches.length * 190 }}
          rowSelection={{
            selectedRowKeys: selectedRows,
            onChange: (keys) => setSelectedRows(keys.map(String).filter((k) => !k.startsWith("group:"))),
            getCheckboxProps: (row) => ({ disabled: row.kind === "group" || readOnly, style: row.kind === "group" ? { display: "none" } : undefined }),
            columnWidth: 40,
            fixed: true,
          }}
          locale={{ emptyText: error ? "—" : "Chưa có món hoặc combo nào được gán cho chi nhánh" }}
        />
        <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 10 }}>
          Chỉ món và combo có giá riêng theo chi nhánh. Giá cộng thêm của tuỳ chọn, giá topping theo món và phụ thu biến thể là một giá toàn chuỗi. Chi nhánh bị tô nhãn
          (đóng cửa, tạm ngưng) vẫn có thể đặt giá. Ô "—" là sản phẩm chưa gán cho chi nhánh.
        </div>
      </Card>
    </div>
  );
}

/** 1 cột tên + 1 cột giá chuỗi + mỗi chi nhánh một cột + cột chọn dòng (để dòng nhóm trải hết bề ngang). */
const columnsCount = (branchCount: number): number => 2 + branchCount;

/** Ô sửa giá tại chỗ: giữ giá đang gõ ở local; Enter hoặc rời ô thì ghi, Esc thì bỏ. */
function CellEditor({ initial, label, onCommit, onCancel }: { initial: number; label: string; onCommit: (price: number | null) => void; onCancel: () => void }) {
  const [value, setValue] = useState<number | null>(initial);
  const [done, setDone] = useState(false);
  const finish = () => {
    if (done) return;
    setDone(true);
    onCommit(value);
  };
  return (
    <MoneyInput
      size="small"
      autoFocus
      value={value}
      onChange={setValue}
      onBlur={finish}
      onPressEnter={finish}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setDone(true);
          onCancel();
        }
      }}
      aria-label={label}
    />
  );
}
