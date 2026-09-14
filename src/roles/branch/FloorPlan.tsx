import { useMemo, useState } from "react";
import { App, Button, Card, Checkbox, Input, InputNumber, Modal, Segmented, Select } from "antd";
import { Clock, Info, Link2, Lock, Plus, Unlock, Users } from "lucide-react";
import {
  currentBranchId,
  floorTables as floorSeed,
  getTableInfo,
  getTableState,
  money,
  tableSessions,
  type FloorTable,
  type TableDisplayState,
} from "../../data";
import { SectionTitle } from "../../components/bits";

const stateStyle: Record<TableDisplayState, { label: string; box: React.CSSProperties; sub: string }> = {
  serving: { label: "Đang phục vụ", sub: "rgba(255,255,255,0.65)", box: { background: "#0a0a0a", color: "#fff", border: "1.5px solid #0a0a0a" } },
  paid: { label: "Đã thanh toán · chờ đóng bàn", sub: "#52525b", box: { background: "#f4f4f5", color: "#0a0a0a", border: "1.5px solid #a1a1aa" } },
  available: { label: "Trống", sub: "#a1a1aa", box: { background: "#fff", color: "#0a0a0a", border: "1.5px dashed #d4d4d8" } },
  locked: { label: "Ngưng sử dụng", sub: "#71717a", box: { background: "#f4f4f5", color: "#52525b", border: "1.5px solid #e4e4e7" } },
  reserved: { label: "Đã đặt trước", sub: "#52525b", box: { background: "#fff", color: "#0a0a0a", border: "1.5px solid #0a0a0a" } },
};

/** Phiên đang chiếm một bàn (open/paid) tại chi nhánh — để hiện khối ghép. */
const occupantSession = (tableId: string) =>
  tableSessions.find(
    (s) =>
      s.branchId === currentBranchId &&
      (s.status === "open" || s.status === "paid") &&
      s.tableIds.includes(tableId),
  ) ?? null;

export default function FloorPlan() {
  const [mode, setMode] = useState<"view" | "design">("view");
  // Bản sao có thể sửa của sơ đồ — chế độ Thiết kế ghi vào đây.
  const [tables, setTables] = useState<FloorTable[]>(() => floorSeed.map((t) => ({ ...t })));

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Sơ đồ bàn · Quận 1"
        sub={mode === "view" ? "Trạng thái cập nhật real-time qua Socket.IO" : "Chế độ thiết kế — thao tác ngoài ca"}
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
      {mode === "view" ? <ViewMode tables={tables} /> : <DesignMode tables={tables} setTables={setTables} />}
    </Card>
  );
}

/* ============================ CHẾ ĐỘ XEM ============================ */

function ViewMode({ tables }: { tables: FloorTable[] }) {
  const areas = [...new Set(tables.map((t) => t.area))];
  const count = (st: TableDisplayState) => tables.filter((t) => getTableState(t.id) === st).length;
  const legend: TableDisplayState[] = ["serving", "paid", "available", "locked", "reserved"];

  return (
    <>
      <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "#52525b", flexWrap: "wrap", marginBottom: 18 }}>
        {legend.map((st) => (
          <span key={st} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, ...stateStyle[st].box, display: "inline-block" }} />
            {stateStyle[st].label} ({count(st)})
          </span>
        ))}
      </div>
      {areas.map((area) => (
        <div key={area} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 10 }}>{area}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {tables.filter((t) => t.area === area).map((t) => (
              <ViewCell key={t.id} t={t} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function ViewCell({ t }: { t: FloorTable }) {
  const state = getTableState(t.id);
  const s = stateStyle[state];
  const info = state === "serving" || state === "paid" ? getTableInfo(t.id) : null;
  const occ = state === "serving" || state === "paid" ? occupantSession(t.id) : null;
  const merged = occ && occ.tableIds.length > 1;
  return (
    <div style={{ ...s.box, borderRadius: 14, padding: 14, minHeight: 108, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>{t.id}</span>
        <span style={{ fontSize: 11.5, color: s.sub }}>{t.seats} chỗ</span>
      </div>
      <div style={{ fontSize: 11.5, color: s.sub, marginTop: 2 }}>{s.label}</div>
      {merged && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, alignSelf: "flex-start", fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "1px 8px", background: state === "serving" ? "rgba(255,255,255,0.14)" : "#e4e4e7", color: state === "serving" ? "#fff" : "#52525b" }}>
          <Link2 size={12} /> {occ!.tableIds.join(" + ")}
        </div>
      )}
      {info && (
        <div style={{ marginTop: "auto", fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, color: s.sub }}>
            <Users size={13} /> {info.guests} khách · <Clock size={13} /> {info.elapsedMinutes}’
          </span>
          <span style={{ fontWeight: 600 }}>{money(info.amount)}</span>
        </div>
      )}
      {state === "reserved" && <div style={{ marginTop: "auto", fontSize: 12, color: s.sub }}>Giữ chỗ 19:30</div>}
    </div>
  );
}

/* ============================ CHẾ ĐỘ THIẾT KẾ ============================ */

const COLS = 4;
const CELL_H = 116;
const GAP = 14;

function DesignMode({
  tables,
  setTables,
}: {
  tables: FloorTable[];
  setTables: React.Dispatch<React.SetStateAction<FloorTable[]>>;
}) {
  const { message } = App.useApp();
  const areas = [...new Set(tables.map((t) => t.area))];
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const selTable = tables.find((t) => t.id === selected) ?? null;

  // Bật/tắt liền kề — CẬP NHẬT ĐỐI XỨNG cả hai chiều.
  const toggleAdjacent = (a: string, b: string) =>
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === a) {
          const has = t.adjacentTableIds.includes(b);
          return { ...t, adjacentTableIds: has ? t.adjacentTableIds.filter((x) => x !== b) : [...t.adjacentTableIds, b] };
        }
        if (t.id === b) {
          const has = t.adjacentTableIds.includes(a);
          return { ...t, adjacentTableIds: has ? t.adjacentTableIds.filter((x) => x !== a) : [...t.adjacentTableIds, a] };
        }
        return t;
      }),
    );

  const toggleLock = (id: string) =>
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, state: t.state === "locked" ? "available" : "locked" } : t)),
    );

  const addTable = (id: string, seats: number, area: string) => {
    if (tables.some((t) => t.id === id)) {
      message.error(`Bàn ${id} đã tồn tại`);
      return;
    }
    setTables((prev) => [...prev, { id, area, seats, state: "available", adjacentTableIds: [] }]);
    setAdding(false);
    message.success(`Đã thêm bàn ${id}`);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fafafa", border: "1px solid var(--ant-color-border)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
        <Info size={17} color="#71717a" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.5 }}>
          Quan hệ <b>liền kề phải khai báo tay</b> — hệ thống không tự suy từ vị trí trên sơ đồ, vì hai bàn nhìn
          gần nhau nhưng cách một lối đi thì thực tế không ghép được. Đây là dữ liệu bắt buộc cho tính năng gợi
          ý ghép bàn. Chỉ ghép được bàn <b>cùng khu vực</b>.
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <Button icon={<Plus size={16} />} onClick={() => setAdding(true)}>
          Thêm bàn
        </Button>
        {selTable && (
          <Button
            icon={selTable.state === "locked" ? <Unlock size={16} /> : <Lock size={16} />}
            onClick={() => toggleLock(selTable.id)}
          >
            {selTable.state === "locked" ? `Mở lại bàn ${selTable.id}` : `Ngưng sử dụng ${selTable.id}`}
          </Button>
        )}
      </div>

      {selected && (
        <div style={{ fontSize: 12.5, color: "#71717a", marginBottom: 14 }}>
          Đang chọn <b style={{ color: "#0a0a0a" }}>bàn {selected}</b> — tick các bàn cùng khu vực để khai báo liền kề.
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

        // Cặp liền kề đã khai báo trong khu vực (không trùng, không xuyên khu).
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
              {/* Đường nối mảnh giữa các cặp bàn liền kề */}
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
                        background: t.state === "locked" ? "#f4f4f5" : "#fff",
                        border: isSel ? "2px solid #0a0a0a" : "1.5px solid var(--ant-color-border)",
                        opacity: otherArea ? 0.4 : 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 19, fontWeight: 700 }}>{t.id}</span>
                        <span style={{ fontSize: 11.5, color: "#a1a1aa" }}>{t.seats} chỗ</span>
                      </div>
                      {t.state === "locked" && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#71717a", marginTop: 4 }}>
                          <Lock size={12} /> Ngưng sử dụng
                        </div>
                      )}
                      {sameArea && (
                        <label onClick={(e) => e.stopPropagation()} style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                          <Checkbox checked={adjacent} onChange={() => toggleAdjacent(selTable!.id, t.id)} />
                          liền kề {selTable!.id}
                        </label>
                      )}
                      {otherArea && <div style={{ marginTop: "auto", fontSize: 11, color: "#a1a1aa" }}>Khác khu vực · không ghép</div>}
                      {!selTable && t.adjacentTableIds.length > 0 && (
                        <div style={{ marginTop: "auto", fontSize: 11, color: "#a1a1aa" }}>Liền kề: {t.adjacentTableIds.join(", ")}</div>
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
