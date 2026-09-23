import { useState } from "react";
import { Alert, App, Button, Card, Checkbox, Input, InputNumber, Modal, Segmented, Skeleton } from "antd";
import { Info, Lock, Plus, Unlock } from "lucide-react";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";
import { tablePosition, type ApiTable, type ApiTableStatus } from "../../services/tablesApi";

const STATUS_LABEL: Record<ApiTableStatus, string> = {
  AVAILABLE: "Trống",
  RESERVED: "Đã đặt trước",
  OCCUPIED: "Đang phục vụ",
  OUT_OF_SERVICE: "Ngưng sử dụng",
};

const STATUS_STYLE: Record<ApiTableStatus, { bg: string; fg: string; border: string }> = {
  AVAILABLE: { bg: "#fff", fg: "#0a0a0a", border: "var(--ant-color-border)" },
  RESERVED: { bg: "#fff8e6", fg: "#0a0a0a", border: "#f0d9a0" },
  OCCUPIED: { bg: "#0a0a0a", fg: "#fff", border: "#0a0a0a" },
  OUT_OF_SERVICE: { bg: "#f4f4f5", fg: "#71717a", border: "var(--ant-color-border)" },
};

const ORDERED_STATUSES: ApiTableStatus[] = ["OCCUPIED", "RESERVED", "AVAILABLE", "OUT_OF_SERVICE"];

/** Sơ đồ bàn (mục 4.5.F) — dữ liệu thật từ `/branches/{id}/tables`. */
export default function FloorPlan() {
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const status = useAppStore((s) => s.tablesStatus);
  const error = useAppStore((s) => s.tablesError);
  const loadTables = useAppStore((s) => s.loadTables);
  const [mode, setMode] = useState<"view" | "design">("view");
  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "";

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title={`Sơ đồ bàn · ${branchName}`}
        sub={mode === "view" ? "Trạng thái bàn lấy trực tiếp từ hệ thống" : "Chế độ thiết kế — thao tác ngoài ca"}
        extra={
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as "view" | "design")}
            options={[
              { label: "Xem", value: "view" },
              { label: "Thiết kế", value: "design" },
            ]}
          />
        }
      />

      {status === "error" ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được sơ đồ bàn"
          description={error}
          action={
            <Button size="small" onClick={() => loadTables()}>
              Thử lại
            </Button>
          }
        />
      ) : status === "loading" || status === "idle" ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : mode === "view" ? (
        <ViewMode />
      ) : (
        <DesignMode />
      )}
    </Card>
  );
}

function groupByArea(tables: ApiTable[]): [string, ApiTable[]][] {
  const groups = new Map<string, ApiTable[]>();
  for (const table of tables) {
    const area = table.area?.trim() || "Chưa phân khu";
    groups.set(area, [...(groups.get(area) ?? []), table]);
  }
  return [...groups.entries()];
}

function EmptyTables() {
  return (
    <div style={{ padding: "40px 0", textAlign: "center", color: "#71717a", fontSize: 13.5 }}>
      Chi nhánh này chưa có bàn nào. Chuyển sang chế độ Thiết kế để thêm bàn.
    </div>
  );
}

/* ============================ CHẾ ĐỘ XEM ============================ */

function ViewMode() {
  const tables = useAppStore((s) => s.apiTables);
  if (tables.length === 0) return <EmptyTables />;

  const count = (st: ApiTableStatus) => tables.filter((t) => t.status === st).length;

  return (
    <>
      <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "#52525b", flexWrap: "wrap", marginBottom: 18 }}>
        {ORDERED_STATUSES.map((st) => (
          <span key={st} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                display: "inline-block",
                background: st === "AVAILABLE" ? "#d4d4d8" : STATUS_STYLE[st].bg,
                border: `1px solid ${STATUS_STYLE[st].border}`,
              }}
            />
            {STATUS_LABEL[st]} ({count(st)})
          </span>
        ))}
      </div>

      {/* Backend chưa có endpoint liệt kê phiên bàn cho Quản lý chi nhánh, nên
          không hiển thị được khách/hoá đơn đang ngồi bàn nào. */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fafafa", border: "1px solid var(--ant-color-border)", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
        <Info size={16} color="#71717a" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.5 }}>
          Chi tiết phiên bàn (khách đang ngồi, tạm tính) chưa hiển thị được — hệ thống chưa mở API
          phiên bàn cho Quản lý chi nhánh.
        </div>
      </div>

      {groupByArea(tables).map(([area, areaTables]) => (
        <div key={area} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 10 }}>{area}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {areaTables.map((t) => (
              <ViewCell key={t.id} t={t} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ViewCell({ t }: { t: ApiTable }) {
  const style = STATUS_STYLE[t.status];
  const x = tablePosition(t.positionX);
  const y = tablePosition(t.positionY);

  return (
    <div
      style={{
        background: style.bg,
        color: style.fg,
        border: `1.5px solid ${style.border}`,
        borderRadius: 14,
        padding: 14,
        minHeight: 108,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{t.code}</span>
        <span style={{ fontSize: 11.5, opacity: 0.7 }}>{t.capacity} chỗ</span>
      </div>
      {t.name && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{t.name}</div>}
      <div style={{ marginTop: "auto", fontSize: 11.5, opacity: 0.75 }}>
        {STATUS_LABEL[t.status]}
        {x !== null && y !== null ? ` · vị trí ${x}, ${y}` : ""}
      </div>
      {t.adjacentTableIds.length > 0 && (
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
          {t.adjacentTableIds.length} bàn liền kề
        </div>
      )}
    </div>
  );
}

/* ========================== CHẾ ĐỘ THIẾT KẾ ========================== */

const COLS = 4;
const CELL_H = 116;
const GAP = 14;

function DesignMode() {
  const { message } = App.useApp();
  const tables = useAppStore((s) => s.apiTables);
  const createBranchTable = useAppStore((s) => s.createBranchTable);
  const setTableStatus = useAppStore((s) => s.setTableStatus);
  const setTableAdjacency = useAppStore((s) => s.setTableAdjacency);

  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const selTable = tables.find((t) => t.id === selected) ?? null;
  const codeOf = (id: string) => tables.find((t) => t.id === id)?.code ?? "?";

  const addTable = async (code: string, capacity: number, area: string) => {
    if (tables.some((t) => t.code.toLowerCase() === code.toLowerCase())) {
      message.error(`Bàn ${code} đã tồn tại`);
      return;
    }
    setBusy(true);
    try {
      await createBranchTable({ code, capacity, area: area || undefined });
      setAdding(false);
      message.success(`Đã thêm bàn ${code}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thêm được bàn");
    } finally {
      setBusy(false);
    }
  };

  const toggleOutOfService = async (t: ApiTable) => {
    const next: ApiTableStatus = t.status === "OUT_OF_SERVICE" ? "AVAILABLE" : "OUT_OF_SERVICE";
    try {
      await setTableStatus(t.id, next);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không đổi được trạng thái bàn");
    }
  };

  // Backend nhận cả TẬP bàn liền kề và tự đồng bộ chiều ngược lại, nên bật/tắt
  // một ô là gửi lại toàn bộ tập của bàn đang chọn.
  const toggleAdjacency = async (neighbourId: string) => {
    if (!selTable) return;
    const current = selTable.adjacentTableIds;
    const next = current.includes(neighbourId)
      ? current.filter((id) => id !== neighbourId)
      : [...current, neighbourId];
    try {
      await setTableAdjacency(selTable.id, next);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không lưu được quan hệ liền kề");
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fafafa", border: "1px solid var(--ant-color-border)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
        <Info size={17} color="#71717a" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.5 }}>
          Quan hệ <b>liền kề phải khai báo tay</b> — hệ thống không tự suy từ vị trí trên sơ đồ, vì hai bàn nhìn
          gần nhau nhưng cách một lối đi thì thực tế không ghép được. Chỉ ghép được bàn <b>cùng khu vực</b>.
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <Button icon={<Plus size={16} />} onClick={() => setAdding(true)}>
          Thêm bàn
        </Button>
        {selTable && (
          <Button
            icon={selTable.status === "OUT_OF_SERVICE" ? <Unlock size={16} /> : <Lock size={16} />}
            onClick={() => toggleOutOfService(selTable)}
          >
            {selTable.status === "OUT_OF_SERVICE"
              ? `Mở lại bàn ${selTable.code}`
              : `Ngưng sử dụng ${selTable.code}`}
          </Button>
        )}
      </div>

      {selTable && (
        <div style={{ fontSize: 12.5, color: "#71717a", marginBottom: 14 }}>
          Đang chọn <b style={{ color: "#0a0a0a" }}>bàn {selTable.code}</b> — tick các bàn cùng khu vực để khai báo
          liền kề. Bàn khác khu vực bị mờ (không ghép được).
        </div>
      )}

      {tables.length === 0 && <EmptyTables />}

      {groupByArea(tables).map(([area, areaTables]) => {
        const rows = Math.ceil(areaTables.length / COLS);
        const idx = new Map(areaTables.map((t, i) => [t.id, i]));
        const center = (i: number) => ({
          x: `${((i % COLS) + 0.5) * (100 / COLS)}%`,
          y: Math.floor(i / COLS) * (CELL_H + GAP) + CELL_H / 2,
        });

        const edges: [number, number][] = [];
        for (const t of areaTables) {
          for (const n of t.adjacentTableIds) {
            const i = idx.get(t.id)!;
            const j = idx.get(n);
            if (j !== undefined && i < j) edges.push([i, j]);
          }
        }

        return (
          <div key={area} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 10 }}>{area}</div>
            <div style={{ position: "relative" }}>
              <svg width="100%" height={rows * (CELL_H + GAP) - GAP} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
                {edges.map(([i, j], k) => {
                  const a = center(i);
                  const b = center(j);
                  return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0a0a0a" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.4} />;
                })}
              </svg>
              <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: GAP }}>
                {areaTables.map((t) => {
                  const isSel = t.id === selected;
                  const sameArea = selTable && (selTable.area ?? "") === (t.area ?? "") && selTable.id !== t.id;
                  const otherArea = selTable && (selTable.area ?? "") !== (t.area ?? "");
                  const adjacent = selTable ? selTable.adjacentTableIds.includes(t.id) : false;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelected(t.id)}
                      style={{
                        minHeight: CELL_H,
                        borderRadius: 14,
                        padding: 14,
                        cursor: "pointer",
                        background: t.status === "OUT_OF_SERVICE" ? "#f4f4f5" : "#fff",
                        border: isSel ? "2px solid #0a0a0a" : "1.5px solid var(--ant-color-border)",
                        opacity: otherArea ? 0.4 : 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 19, fontWeight: 700 }}>{t.code}</span>
                        <span style={{ fontSize: 11.5, color: "#a1a1aa" }}>{t.capacity} chỗ</span>
                      </div>
                      {t.status === "OUT_OF_SERVICE" && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#71717a", marginTop: 4 }}>
                          <Lock size={12} /> Ngưng sử dụng
                        </div>
                      )}
                      {sameArea && (
                        <label onClick={(e) => e.stopPropagation()} style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                          <Checkbox checked={adjacent} onChange={() => toggleAdjacency(t.id)} />
                          liền kề {selTable!.code}
                        </label>
                      )}
                      {otherArea && <div style={{ marginTop: "auto", fontSize: 11, color: "#a1a1aa" }}>Khác khu vực · không ghép</div>}
                      {!selTable && t.adjacentTableIds.length > 0 && (
                        <div style={{ marginTop: "auto", fontSize: 11, color: "#a1a1aa" }}>
                          Liền kề: {t.adjacentTableIds.map(codeOf).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <AddTableModal open={adding} busy={busy} onClose={() => setAdding(false)} onAdd={addTable} />
    </>
  );
}

function AddTableModal({
  open,
  busy,
  onClose,
  onAdd,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onAdd: (code: string, capacity: number, area: string) => void;
}) {
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [area, setArea] = useState("");

  return (
    <Modal
      title="Thêm bàn"
      open={open}
      onCancel={onClose}
      okText="Thêm bàn"
      cancelText="Huỷ"
      confirmLoading={busy}
      okButtonProps={{ disabled: !code.trim() || !capacity }}
      onOk={() => onAdd(code.trim(), capacity, area.trim())}
      afterClose={() => {
        setCode("");
        setCapacity(4);
        setArea("");
      }}
    >
      <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>Mã bàn</div>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: T05" />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>Số chỗ</div>
          <InputNumber min={1} max={50} value={capacity} onChange={(v) => setCapacity(v ?? 1)} style={{ width: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>Khu vực</div>
          <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="VD: Khu phục vụ tầng 1" />
        </div>
      </div>
    </Modal>
  );
}
