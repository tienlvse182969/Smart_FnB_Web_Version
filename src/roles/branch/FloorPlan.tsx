import { useMemo, useState } from "react";
import { App, Button, Card, Checkbox, Input, InputNumber, Modal, Segmented, Select } from "antd";
import { Clock, Info, Link2, Lock, Plus, Unlock, Users } from "lucide-react";
import { money } from "../../data";
import type { FloorTable, TableSession, TableStatus } from "../../types";
import { TABLE_STATUS_COLOR, STATUS_COLORS } from "../../theme/semantic";
import { minutesSinceISO } from "../../services/_utils";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

const TABLE_LABEL: Record<TableStatus, string> = {
  available: "Trống",
  reserved: "Đã đặt trước",
  occupied: "Đang phục vụ",
  locked: "Tạm khoá",
};

function sessionTotal(sessionId: string, lines: { sessionId?: string; unitPrice: number; qty: number; status: string }[]) {
  return lines
    .filter((l) => l.sessionId === sessionId && l.status !== "cancelled" && l.status !== "sold_out")
    .reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

/** Sơ đồ bàn (mục 4.5.F) — chỉ Branch Manager thiết kế; Waiter/Kitchen chỉ xem. */
export default function FloorPlan() {
  const branches = useAppStore((s) => s.branches);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [mode, setMode] = useState<"view" | "design">("view");
  const branchName = branches.find((b) => b.id === currentBranchId)?.name ?? "";

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title={`Sơ đồ bàn · ${branchName}`}
        sub={mode === "view" ? "Trạng thái cập nhật theo Waiter/Kitchen đang thao tác" : "Chế độ thiết kế — thao tác ngoài ca"}
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
      {mode === "view" ? <ViewMode /> : <DesignMode />}
    </Card>
  );
}

/* ============================ CHẾ ĐỘ XEM ============================ */

function ViewMode() {
  const tables = useAppStore((s) => s.tables);
  const sessions = useAppStore((s) => s.sessions);
  const orderLines = useAppStore((s) => s.orderLines);
  const areas = [...new Set(tables.map((t) => t.area))];
  const count = (st: TableStatus) => tables.filter((t) => t.status === st).length;
  const legend: TableStatus[] = ["occupied", "reserved", "available", "locked"];

  const sessionByTable = (tableId: string): TableSession | null =>
    sessions.find((s) => s.tableIds.includes(tableId) && s.status !== "closed" && s.status !== "cancelled") ?? null;

  return (
    <>
      <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "#52525b", flexWrap: "wrap", marginBottom: 18 }}>
        {legend.map((st) => {
          const c = STATUS_COLORS[TABLE_STATUS_COLOR[st]];
          return (
            <span key={st} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: c.text, display: "inline-block" }} />
              {TABLE_LABEL[st]} ({count(st)})
            </span>
          );
        })}
      </div>
      {areas.map((area) => (
        <div key={area} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 10 }}>{area}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {tables
              .filter((t) => t.area === area)
              .map((t) => (
                <ViewCell key={t.id} t={t} session={t.status === "occupied" ? sessionByTable(t.id) : null} orderLines={orderLines} />
              ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ViewCell({
  t,
  session,
  orderLines,
}: {
  t: FloorTable;
  session: TableSession | null;
  orderLines: { sessionId?: string; unitPrice: number; qty: number; status: string }[];
}) {
  const c = STATUS_COLORS[TABLE_STATUS_COLOR[t.status]];
  const merged = session && session.tableIds.length > 1;
  return (
    <div
      style={{
        background: t.status === "occupied" ? "#0a0a0a" : c.bg,
        color: t.status === "occupied" ? "#fff" : "#0a0a0a",
        border: `1.5px solid ${t.status === "occupied" ? "#0a0a0a" : c.border}`,
        borderRadius: 14,
        padding: 14,
        minHeight: 108,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{t.id.split("-").pop()}</span>
        <span style={{ fontSize: 11.5, opacity: 0.7 }}>{t.seats} chỗ</span>
      </div>
      <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 2 }}>{TABLE_LABEL[t.status]}</div>
      {merged && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginTop: 6,
            alignSelf: "flex-start",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 999,
            padding: "1px 8px",
            background: "rgba(255,255,255,0.14)",
            color: "#fff",
          }}
        >
          <Link2 size={12} /> {session!.tableIds.map((id) => id.split("-").pop()).join(" + ")}
        </div>
      )}
      {session && (
        <div style={{ marginTop: "auto", fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, opacity: 0.85 }}>
            <Users size={13} /> {session.guests} khách · <Clock size={13} /> {minutesSinceISO(session.openedAt)}’
          </span>
          <span style={{ fontWeight: 600 }}>{money(sessionTotal(session.id, orderLines))}</span>
        </div>
      )}
    </div>
  );
}

/* ============================ CHẾ ĐỘ THIẾT KẾ ============================ */

const COLS = 4;
const CELL_H = 116;
const GAP = 14;

function DesignMode() {
  const { message } = App.useApp();
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const tables = useAppStore((s) => s.tables);
  const createFloorTable = useAppStore((s) => s.createFloorTable);
  const toggleTableLock = useAppStore((s) => s.toggleTableLock);
  const toggleAdjacentTables = useAppStore((s) => s.toggleAdjacentTables);

  const areas = [...new Set(tables.map((t) => t.area))];
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const selTable = tables.find((t) => t.id === selected) ?? null;

  const addTable = async (shortId: string, seats: number, area: string) => {
    if (!currentBranchId) return;
    const id = `${currentBranchId}-${shortId}`;
    if (tables.some((t) => t.id === id)) {
      message.error(`Bàn ${shortId} đã tồn tại`);
      return;
    }
    try {
      await createFloorTable(id, area, seats);
      setAdding(false);
      message.success(`Đã thêm bàn ${shortId}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thêm được bàn");
    }
  };

  const handleToggleLock = async (t: FloorTable) => {
    try {
      await toggleTableLock(t.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không khoá được bàn");
    }
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fafafa", border: "1px solid var(--ant-color-border)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
        <Info size={17} color="#71717a" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.5 }}>
          Quan hệ <b>liền kề phải khai báo tay</b> — hệ thống không tự suy từ vị trí trên sơ đồ, vì hai bàn nhìn
          gần nhau nhưng cách một lối đi thì thực tế không ghép được. Đây là dữ liệu bắt buộc cho tính năng gợi
          ý ghép bàn (BR-25). Chỉ ghép được bàn <b>cùng khu vực</b>.
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <Button icon={<Plus size={16} />} onClick={() => setAdding(true)}>
          Thêm bàn
        </Button>
        {selTable && (
          <Button
            icon={selTable.status === "locked" ? <Unlock size={16} /> : <Lock size={16} />}
            onClick={() => handleToggleLock(selTable)}
          >
            {selTable.status === "locked" ? `Mở lại bàn ${selTable.id.split("-").pop()}` : `Ngưng sử dụng ${selTable.id.split("-").pop()}`}
          </Button>
        )}
      </div>

      {selected && (
        <div style={{ fontSize: 12.5, color: "#71717a", marginBottom: 14 }}>
          Đang chọn <b style={{ color: "#0a0a0a" }}>bàn {selected.split("-").pop()}</b> — tick các bàn cùng khu vực để khai báo liền kề.
          Bàn khác khu vực bị mờ (không ghép được).
        </div>
      )}

      {areas.map((area) => {
        const areaTables = tables.filter((t) => t.area === area);
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
                  const sameArea = selTable && selTable.area === t.area && selTable.id !== t.id;
                  const otherArea = selTable && selTable.area !== t.area;
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
                        background: t.status === "locked" ? "#f4f4f5" : "#fff",
                        border: isSel ? "2px solid #0a0a0a" : "1.5px solid var(--ant-color-border)",
                        opacity: otherArea ? 0.4 : 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 19, fontWeight: 700 }}>{t.id.split("-").pop()}</span>
                        <span style={{ fontSize: 11.5, color: "#a1a1aa" }}>{t.seats} chỗ</span>
                      </div>
                      {t.status === "locked" && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#71717a", marginTop: 4 }}>
                          <Lock size={12} /> Ngưng sử dụng
                        </div>
                      )}
                      {sameArea && (
                        <label onClick={(e) => e.stopPropagation()} style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                          <Checkbox checked={adjacent} onChange={() => toggleAdjacentTables(selTable!.id, t.id)} />
                          liền kề {selTable!.id.split("-").pop()}
                        </label>
                      )}
                      {otherArea && <div style={{ marginTop: "auto", fontSize: 11, color: "#a1a1aa" }}>Khác khu vực · không ghép</div>}
                      {!selTable && t.adjacentTableIds.length > 0 && (
                        <div style={{ marginTop: "auto", fontSize: 11, color: "#a1a1aa" }}>
                          Liền kề: {t.adjacentTableIds.map((id) => id.split("-").pop()).join(", ")}
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

      <AddTableModal open={adding} areas={areas} onClose={() => setAdding(false)} onAdd={addTable} />
    </>
  );
}

function AddTableModal({
  open,
  areas,
  onClose,
  onAdd,
}: {
  open: boolean;
  areas: string[];
  onClose: () => void;
  onAdd: (id: string, seats: number, area: string) => void;
}) {
  const [id, setId] = useState("");
  const [seats, setSeats] = useState(4);
  const [area, setArea] = useState(areas[0] ?? "Trong nhà");

  const areaOptions = useMemo(() => [...new Set([...areas, "Trong nhà", "Sân vườn"])].map((a) => ({ value: a, label: a })), [areas]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<span style={{ fontSize: 17, fontWeight: 700 }}>Thêm bàn</span>}
      okText="Thêm bàn"
      cancelText="Huỷ"
      onOk={() => id.trim() && onAdd(id.trim().toUpperCase(), seats, area)}
      okButtonProps={{ disabled: !id.trim() }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>Số bàn</div>
          <Input size="large" placeholder="ví dụ C4" value={id} onChange={(e) => setId(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>Số ghế</div>
          <InputNumber size="large" min={1} max={20} value={seats} onChange={(v) => setSeats(v ?? 1)} style={{ width: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>Khu vực</div>
          <Select size="large" value={area} onChange={setArea} options={areaOptions} style={{ width: "100%" }} />
        </div>
      </div>
    </Modal>
  );
}
