import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Drawer, InputNumber, Modal, Segmented } from "antd";
import { Clock, DoorOpen, Info, Link2, Plus, ReceiptText, Users, Utensils, XCircle } from "lucide-react";
import { floorTables, minutesSince as minutesSinceData, money, type TableDisplayState } from "../../data";
import { estimateNextAvailable, suggestArrangements, type Suggestion } from "../../logic/tableArrangement";
import { SectionTitle } from "../../components/bits";
import { minutesSince, useWaiter } from "./store";

const stateStyle: Record<TableDisplayState, { label: string; box: React.CSSProperties; sub: string }> = {
  serving: {
    label: "Đang phục vụ",
    sub: "rgba(255,255,255,0.65)",
    box: { background: "#0a0a0a", color: "#fff", border: "1.5px solid #0a0a0a" },
  },
  paid: {
    label: "Đã thanh toán · chờ đóng bàn",
    sub: "#52525b",
    box: { background: "#f4f4f5", color: "#0a0a0a", border: "1.5px solid #a1a1aa" },
  },
  available: {
    label: "Trống",
    sub: "#a1a1aa",
    box: { background: "#fff", color: "#0a0a0a", border: "1.5px dashed #d4d4d8" },
  },
  locked: {
    label: "Ngưng sử dụng",
    sub: "#71717a",
    box: { background: "#f4f4f5", color: "#52525b", border: "1.5px solid #e4e4e7" },
  },
  reserved: {
    label: "Đã đặt trước",
    sub: "#52525b",
    box: { background: "#fff", color: "#0a0a0a", border: "1.5px solid #0a0a0a" },
  },
};

export default function TableMap({
  onOpenOrder,
  onOpenBilling,
}: {
  onOpenOrder: (sessionId: string) => void;
  onOpenBilling: (sessionId: string) => void;
}) {
  const store = useWaiter();
  const { message } = App.useApp();
  const areas = [...new Set(floorTables.map((t) => t.area))];

  const [opening, setOpening] = useState(false); // drawer "Mở bàn"
  const [highlight, setHighlight] = useState<string[]>([]); // bàn được tô sáng từ gợi ý
  const [servingTableId, setServingTableId] = useState<string | null>(null);
  const [viewOrderSession, setViewOrderSession] = useState<string | null>(null);

  const count = (st: TableDisplayState) => floorTables.filter((t) => store.tableState(t.id) === st).length;

  const handleTap = (tableId: string) => {
    const st = store.tableState(tableId);
    if (st === "available") {
      setOpening(true);
    } else if (st === "serving") {
      setServingTableId(tableId);
    } else if (st === "paid") {
      const s = store.sessionForTableAny(tableId);
      if (s) onOpenBilling(s.id); // sang màn Tính tiền để đóng bàn
    }
  };

  const legendStates: TableDisplayState[] = ["serving", "paid", "available", "locked", "reserved"];

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Sơ đồ bàn · Quận 1"
        sub="Chạm bàn trống để mở bàn · bàn ghép hiện chung một khối"
        extra={
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#52525b", flexWrap: "wrap" }}>
            {legendStates.map((s) => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, ...stateStyle[s].box, display: "inline-block" }} />
                {stateStyle[s].label} ({count(s)})
              </span>
            ))}
          </div>
        }
      />

      {areas.map((area) => (
        <div key={area} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#71717a", marginBottom: 12 }}>{area}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {floorTables
              .filter((t) => t.area === area)
              .map((t) => {
                const st = store.tableState(t.id);
                const s = stateStyle[st];
                const occ = st === "serving" || st === "paid" ? store.sessionForTableAny(t.id) : null;
                const merged = occ && occ.tableIds.length > 1;
                const tappable = st === "available" || st === "serving" || st === "paid";
                const lit = highlight.includes(t.id);
                return (
                  <button
                    key={t.id}
                    disabled={!tappable}
                    onClick={() => handleTap(t.id)}
                    style={{
                      ...s.box,
                      borderRadius: 16,
                      padding: 18,
                      minHeight: 132,
                      display: "flex",
                      flexDirection: "column",
                      textAlign: "left",
                      cursor: tappable ? "pointer" : "default",
                      font: "inherit",
                      outline: lit ? "3px solid #0a0a0a" : "none",
                      outlineOffset: lit ? 2 : 0,
                      boxShadow: lit ? "0 0 0 6px rgba(10,10,10,0.08)" : "none",
                      transition: "outline-offset .1s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 26, fontWeight: 700 }}>{t.id}</span>
                      <span style={{ fontSize: 13, color: s.sub }}>{t.seats} chỗ</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: s.sub, marginTop: 3 }}>{s.label}</div>
                    {merged && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, alignSelf: "flex-start", fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: "2px 10px", background: st === "serving" ? "rgba(255,255,255,0.14)" : "#e4e4e7", color: st === "serving" ? "#fff" : "#52525b" }}>
                        <Link2 size={13} /> {occ!.tableIds.join(" + ")}
                      </div>
                    )}
                    {occ && (
                      <div style={{ marginTop: "auto", fontSize: 13.5, display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: s.sub }}>
                          <Users size={14} /> {occ.guests} khách · <Clock size={14} /> {minutesSince(occ.openedAt)}’
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{money(store.sessionTotal(occ.id))}</span>
                        {occ.status === "open" && occ.paymentRequested && (
                          <span style={{ alignSelf: "flex-start", background: "#fff7e6", color: "#7a5b00", border: "1px solid #ffe1a8", borderRadius: 999, padding: "2px 10px", fontSize: 11.5, fontWeight: 600 }}>
                            Đang chờ thanh toán
                          </span>
                        )}
                      </div>
                    )}
                    {st === "reserved" && <div style={{ marginTop: "auto", fontSize: 13, color: s.sub }}>Giữ chỗ 19:30</div>}
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      <OpenTableDrawer
        open={opening}
        onClose={() => {
          setOpening(false);
          setHighlight([]);
        }}
        onHighlight={setHighlight}
        onOpened={(sessionId) => {
          setOpening(false);
          setHighlight([]);
          onOpenOrder(sessionId);
        }}
      />

      {servingTableId && (
        <ServingPanel
          tableId={servingTableId}
          onClose={() => setServingTableId(null)}
          onOrder={(sid) => {
            setServingTableId(null);
            onOpenOrder(sid);
          }}
          onBilling={(sid) => {
            setServingTableId(null);
            onOpenBilling(sid);
          }}
          onView={(sid) => {
            setServingTableId(null);
            setViewOrderSession(sid);
          }}
          onCancelled={() => {
            setServingTableId(null);
            message.success("Đã huỷ phiên — bàn về trống");
          }}
        />
      )}

      <ViewOrderModal sessionId={viewOrderSession} onClose={() => setViewOrderSession(null)} />
    </Card>
  );
}

function OpenTableDrawer({
  open,
  onClose,
  onHighlight,
  onOpened,
}: {
  open: boolean;
  onClose: () => void;
  onHighlight: (ids: string[]) => void;
  onOpened: (sessionId: string) => void;
}) {
  const store = useWaiter();
  const [guests, setGuests] = useState<number>(2);
  const [mode, setMode] = useState<"suggest" | "manual">("suggest");
  const [manual, setManual] = useState<string[]>([]);

  // Gợi ý tính lại theo số khách & trạng thái bàn hiện tại.
  const suggestions: Suggestion[] = useMemo(
    () => (open ? suggestArrangements(store.branchId, guests, store.sessions, floorTables) : []),
    [open, guests, store.branchId, store.sessions],
  );
  const estimate = useMemo(
    () =>
      open && suggestions.length === 0
        ? estimateNextAvailable(store.branchId, guests, store.sessions, floorTables, minutesSinceData)
        : null,
    [open, suggestions.length, guests, store.branchId, store.sessions],
  );

  const emptyTables = floorTables.filter((t) => store.tableState(t.id) === "available");

  useEffect(() => {
    if (!open) {
      setGuests(2);
      setMode("suggest");
      setManual([]);
    }
  }, [open]);

  const openWith = (ids: string[]) => {
    if (ids.length === 0) return;
    onOpened(store.openTable(ids, guests));
  };

  const manualSeats = manual.reduce((s, id) => s + (floorTables.find((t) => t.id === id)?.seats ?? 0), 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={440}
      title={<span style={{ fontSize: 18, fontWeight: 700 }}>Mở bàn mới</span>}
      styles={{ body: { paddingTop: 12 } }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#71717a", marginBottom: 8 }}>Số khách</div>
      <InputNumber
        size="large"
        min={1}
        max={30}
        value={guests}
        onChange={(v) => setGuests(v ?? 1)}
        style={{ width: "100%" }}
      />

      <Segmented
        block
        size="large"
        value={mode}
        onChange={(v) => {
          setMode(v as "suggest" | "manual");
          onHighlight([]);
        }}
        options={[
          { label: "Gợi ý xếp bàn", value: "suggest" },
          { label: "Chọn thủ công", value: "manual" },
        ]}
        style={{ margin: "16px 0" }}
      />

      {mode === "suggest" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a1a1aa", marginBottom: 12 }}>
            <Info size={14} /> Hệ thống chỉ gợi ý — waiter quyết định cuối cùng.
          </div>
          {suggestions.length === 0 ? (
            <Alert
              type="warning"
              showIcon
              message="Không đủ chỗ cho nhóm này"
              description={
                estimate
                  ? `Ước tính còn khoảng ${estimate.minutes} phút nữa sẽ có chỗ (bàn ${estimate.freeingTables.join(", ")} dự kiến trống). Có thể chọn thủ công hoặc mời khách chờ.`
                  : "Không có tổ hợp bàn nào đủ số ghế. Hãy chọn thủ công hoặc mời khách chờ."
              }
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {suggestions.map((sug, i) => (
                <div
                  key={sug.tableIds.join(",")}
                  onMouseEnter={() => onHighlight(sug.tableIds)}
                  onMouseLeave={() => onHighlight([])}
                  onFocus={() => onHighlight(sug.tableIds)}
                  style={{
                    border: `1.5px solid ${i === 0 ? "#0a0a0a" : "var(--ant-color-border)"}`,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      {sug.tableIds.length > 1 && <Link2 size={16} />}
                      {sug.label}
                    </div>
                    {i === 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, background: "#0a0a0a", color: "#fff", borderRadius: 999, padding: "2px 10px" }}>
                        Tốt nhất
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#71717a", marginTop: 6 }}>
                    {sug.totalSeats} ghế · thừa {sug.wastedSeats} · {sug.tableCount} bàn
                    {" · "}
                    {floorTables.find((t) => t.id === sug.tableIds[0])?.area}
                  </div>
                  <Button
                    type={i === 0 ? "primary" : "default"}
                    size="large"
                    block
                    icon={<DoorOpen size={18} />}
                    style={{ marginTop: 12, height: 46 }}
                    onClick={() => openWith(sug.tableIds)}
                  >
                    Chọn phương án này
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#71717a", marginBottom: 8 }}>
            Chọn bàn trống ({emptyTables.length}) · {manualSeats} ghế đã chọn
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 10 }}>
            {emptyTables.map((t) => {
              const active = manual.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    setManual((p) => {
                      const next = active ? p.filter((x) => x !== t.id) : [...p, t.id];
                      onHighlight(next);
                      return next;
                    })
                  }
                  style={{
                    border: `1.5px solid ${active ? "#0a0a0a" : "var(--ant-color-border)"}`,
                    background: active ? "#0a0a0a" : "#fff",
                    color: active ? "#fff" : "#0a0a0a",
                    borderRadius: 12,
                    padding: "12px 8px",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{t.id}</div>
                  <div style={{ fontSize: 11.5, color: active ? "rgba(255,255,255,0.6)" : "#a1a1aa" }}>{t.seats} chỗ</div>
                </button>
              );
            })}
          </div>
          {manualSeats > 0 && manualSeats < guests && (
            <div style={{ fontSize: 12, color: "#7a5b00", marginTop: 10 }}>
              Đang chọn {manualSeats} ghế cho {guests} khách — waiter tự cân nhắc.
            </div>
          )}
          <Button
            type="primary"
            size="large"
            block
            icon={<DoorOpen size={18} />}
            disabled={manual.length === 0}
            style={{ marginTop: 16, height: 48 }}
            onClick={() => openWith(manual)}
          >
            Mở bàn {manual.length > 0 ? manual.join(" + ") : ""}
          </Button>
        </>
      )}
    </Drawer>
  );
}

function ServingPanel({
  tableId,
  onClose,
  onOrder,
  onBilling,
  onView,
  onCancelled,
}: {
  tableId: string;
  onClose: () => void;
  onOrder: (sessionId: string) => void;
  onBilling: (sessionId: string) => void;
  onView: (sessionId: string) => void;
  onCancelled: () => void;
}) {
  const store = useWaiter();
  const session = store.openSessionForTable(tableId);
  if (!session) return null;
  const noLines = store.linesOfSession(session.id).length === 0;

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={460}
      title={<span style={{ fontSize: 18, fontWeight: 700 }}>Bàn {session.tableIds.join(" + ")}</span>}
    >
      <div style={{ fontSize: 13, color: "#71717a", marginBottom: 4 }}>
        Phiên {session.id} · {session.guests} khách · mở {session.openedAt} · {store.waiter}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>{money(store.sessionTotal(session.id))}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Button type="primary" size="large" block icon={<Plus size={18} />} style={{ height: 48 }} onClick={() => onOrder(session.id)}>
          Gọi thêm món
        </Button>
        <Button size="large" block icon={<Utensils size={18} />} style={{ height: 48 }} onClick={() => onView(session.id)}>
          Xem order của bàn
        </Button>
        <Button size="large" block icon={<ReceiptText size={18} />} style={{ height: 48 }} onClick={() => onBilling(session.id)}>
          Báo tính tiền
        </Button>
        {noLines && (
          <Button
            size="large"
            block
            danger
            icon={<XCircle size={18} />}
            style={{ height: 48 }}
            onClick={() => {
              store.cancelSession(session.id);
              onCancelled();
            }}
          >
            Huỷ phiên (khách bỏ về)
          </Button>
        )}
      </div>
    </Modal>
  );
}

const lineStatusLabel: Record<string, string> = {
  queued: "Chờ bếp",
  cooking: "Đang làm",
  done: "Xong · chờ bưng",
  served: "Đã phục vụ",
  cancelled: "Đã huỷ",
  "sold-out": "Hết món",
};

function ViewOrderModal({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const store = useWaiter();
  if (!sessionId) return null;
  const lines = store.linesOfSession(sessionId).filter((l) => l.status !== "cancelled");

  return (
    <Modal open onCancel={onClose} footer={null} width={520} title={<span style={{ fontSize: 18, fontWeight: 700 }}>Order của bàn</span>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        {lines.map((l) => (
          <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--ant-color-border)", borderRadius: 10, padding: "12px 14px" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {l.name} <span style={{ color: "#a1a1aa", fontWeight: 400 }}>× {l.qty}</span>
              </div>
              {l.note && <div style={{ fontSize: 12.5, color: "#a1a1aa" }}>✎ {l.note}</div>}
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: l.status === "cooking" ? "#0a0a0a" : "#f4f4f5", color: l.status === "cooking" ? "#fff" : "#52525b" }}>
              {lineStatusLabel[l.status]}
            </span>
          </div>
        ))}
        {lines.length === 0 && <div style={{ color: "#a1a1aa", fontSize: 13, padding: "12px 0" }}>Chưa gọi món nào.</div>}
      </div>
    </Modal>
  );
}
