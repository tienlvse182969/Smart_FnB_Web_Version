import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Drawer, InputNumber, Modal } from "antd";
import { Clock, DoorOpen, Info, Link2, Plus, ReceiptText, Users, Utensils, XCircle } from "lucide-react";
import { money } from "../../data";
import type { FloorTable, TableSession, TableStatus } from "../../types";
import { TABLE_STATUS_COLOR, STATUS_COLORS } from "../../theme/semantic";
import { estimateNextAvailable, suggestArrangements, type Suggestion } from "../../logic/tableArrangement";
import { minutesSinceISO } from "../../services/_utils";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

const TABLE_LABEL: Record<TableStatus, string> = {
  available: "Trống",
  reserved: "Đã đặt trước",
  occupied: "Đang phục vụ",
  locked: "Tạm khoá",
};

/** Tính tổng tạm tính của một phiên từ orderLines (bỏ dòng huỷ/hết món). */
function sessionTotal(sessionId: string, lines: { sessionId?: string; unitPrice: number; qty: number; status: string }[]) {
  return lines
    .filter((l) => l.sessionId === sessionId && l.status !== "cancelled" && l.status !== "sold_out")
    .reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

export default function TableMap({
  onOpenOrder,
  onOpenBilling,
}: {
  onOpenOrder: (sessionId: string) => void;
  onOpenBilling: (sessionId: string) => void;
}) {
  const { message } = App.useApp();
  const tables = useAppStore((s) => s.tables);
  const sessions = useAppStore((s) => s.sessions);
  const orderLines = useAppStore((s) => s.orderLines);
  const cancelSession = useAppStore((s) => s.cancelSession);

  const areas = [...new Set(tables.map((t) => t.area))];

  const [opening, setOpening] = useState(false); // drawer "Mở bàn"
  const [highlight, setHighlight] = useState<string[]>([]); // bàn được tô sáng từ gợi ý
  const [activeTable, setActiveTable] = useState<FloorTable | null>(null); // panel bàn occupied
  const [viewOrderSession, setViewOrderSession] = useState<string | null>(null);

  const sessionByTable = (tableId: string): TableSession | null =>
    sessions.find((s) => s.tableIds.includes(tableId) && s.status !== "closed" && s.status !== "cancelled") ?? null;

  const count = (st: TableStatus) => tables.filter((t) => t.status === st).length;

  const handleTap = (table: FloorTable) => {
    if (table.status === "available") {
      setOpening(true);
    } else if (table.status === "occupied") {
      setActiveTable(table);
    }
  };

  const legend: TableStatus[] = ["occupied", "reserved", "available", "locked"];

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Sơ đồ bàn"
        sub="Chạm bàn trống để mở bàn · bàn ghép hiện chung một khối"
        extra={
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#52525b", flexWrap: "wrap" }}>
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
        }
      />

      {areas.map((area) => (
        <div key={area} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#71717a", marginBottom: 12 }}>{area}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {tables
              .filter((t) => t.area === area)
              .map((t) => {
                const colorKey = TABLE_STATUS_COLOR[t.status];
                const c = STATUS_COLORS[colorKey];
                const session = t.status === "occupied" ? sessionByTable(t.id) : null;
                const merged = session && session.tableIds.length > 1;
                const tappable = t.status === "available" || t.status === "occupied";
                const lit = highlight.includes(t.id);
                return (
                  <button
                    key={t.id}
                    disabled={!tappable}
                    onClick={() => handleTap(t)}
                    style={{
                      background: t.status === "occupied" ? "#0a0a0a" : c.bg,
                      color: t.status === "occupied" ? "#fff" : "#0a0a0a",
                      border: `1.5px solid ${t.status === "occupied" ? "#0a0a0a" : c.border}`,
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
                      <span style={{ fontSize: 26, fontWeight: 700 }}>{t.id.split("-").pop()}</span>
                      <span style={{ fontSize: 13, opacity: 0.7 }}>{t.seats} chỗ</span>
                    </div>
                    <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 3 }}>{TABLE_LABEL[t.status]}</div>
                    {merged && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 8,
                          alignSelf: "flex-start",
                          fontSize: 11.5,
                          fontWeight: 600,
                          borderRadius: 999,
                          padding: "2px 10px",
                          background: "rgba(255,255,255,0.14)",
                          color: "#fff",
                        }}
                      >
                        <Link2 size={13} /> {session!.tableIds.map((id) => id.split("-").pop()).join(" + ")}
                      </div>
                    )}
                    {session && (
                      <div style={{ marginTop: "auto", fontSize: 13.5, display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, opacity: 0.85 }}>
                          <Users size={14} /> {session.guests} khách · <Clock size={14} /> {minutesSinceISO(session.openedAt)}’
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{money(sessionTotal(session.id, orderLines))}</span>
                        {session.billRequestedAt && (
                          <span
                            style={{
                              alignSelf: "flex-start",
                              background: "#fff7e6",
                              color: "#7a5b00",
                              border: "1px solid #ffe1a8",
                              borderRadius: 999,
                              padding: "2px 10px",
                              fontSize: 11.5,
                              fontWeight: 600,
                            }}
                          >
                            Đang chờ thanh toán
                          </span>
                        )}
                      </div>
                    )}
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

      {activeTable && (
        <ServingPanel
          table={activeTable}
          session={sessionByTable(activeTable.id)}
          onClose={() => setActiveTable(null)}
          onOrder={(sid) => {
            setActiveTable(null);
            onOpenOrder(sid);
          }}
          onBilling={(sid) => {
            setActiveTable(null);
            onOpenBilling(sid);
          }}
          onView={(sid) => {
            setActiveTable(null);
            setViewOrderSession(sid);
          }}
          onCancelled={async (sessionId) => {
            try {
              await cancelSession(sessionId);
              setActiveTable(null);
              message.success("Đã huỷ phiên — bàn về trống");
            } catch (err) {
              message.error(err instanceof Error ? err.message : "Không huỷ được phiên");
            }
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
  const { message } = App.useApp();
  const tables = useAppStore((s) => s.tables);
  const sessions = useAppStore((s) => s.sessions);
  const openTable = useAppStore((s) => s.openTable);
  const [guests, setGuests] = useState<number>(2);

  const suggestions: Suggestion[] = useMemo(
    () => (open ? suggestArrangements(guests, tables) : []),
    [open, guests, tables],
  );
  const estimate = useMemo(
    () =>
      open && suggestions.length === 0
        ? estimateNextAvailable(guests, sessions, tables, minutesSinceISO)
        : null,
    [open, suggestions.length, guests, sessions, tables],
  );

  useEffect(() => {
    if (!open) setGuests(2);
  }, [open]);

  const openWith = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const session = await openTable(ids, guests);
      onOpened(session.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không mở được bàn");
    }
  };

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

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#a1a1aa", margin: "16px 0 12px" }}>
        <Info size={14} /> Hệ thống chỉ gợi ý tối đa 3 phương án — waiter chọn phương án cuối cùng (BR-24).
      </div>

      {suggestions.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Không đủ chỗ cho nhóm này"
          description={
            estimate
              ? `Ước tính còn khoảng ${estimate.minutes} phút nữa sẽ có chỗ (bàn ${estimate.freeingTables.map((id) => id.split("-").pop()).join(", ")} dự kiến trống).`
              : "Không có tổ hợp bàn nào đủ số ghế, kể cả khi mọi bàn đều trống. Hãy mời khách chờ."
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
                  {sug.tableIds.length === 1
                    ? `Bàn ${sug.tableIds[0].split("-").pop()}`
                    : `Ghép ${sug.tableIds.map((id) => id.split("-").pop()).join(" + ")}`}
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
                {tables.find((t) => t.id === sug.tableIds[0])?.area}
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
    </Drawer>
  );
}

function ServingPanel({
  table,
  session,
  onClose,
  onOrder,
  onBilling,
  onView,
  onCancelled,
}: {
  table: FloorTable;
  session: TableSession | null;
  onClose: () => void;
  onOrder: (sessionId: string) => void;
  onBilling: (sessionId: string) => void;
  onView: (sessionId: string) => void;
  onCancelled: (sessionId: string) => void;
}) {
  const orderLines = useAppStore((s) => s.orderLines);
  if (!session) return null;
  const noLines = !orderLines.some((l) => l.sessionId === session.id);

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={460}
      title={<span style={{ fontSize: 18, fontWeight: 700 }}>Bàn {session.tableIds.map((id) => id.split("-").pop()).join(" + ")}</span>}
    >
      <div style={{ fontSize: 13, color: "#71717a", marginBottom: 4 }}>
        Phiên {session.id} · {session.guests} khách · mở lúc {minutesSinceISO(session.openedAt)} phút trước · {session.openedBy}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18 }}>{money(sessionTotal(session.id, orderLines))}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Button type="primary" size="large" block icon={<Plus size={18} />} style={{ height: 48 }} onClick={() => onOrder(session.id)}>
          Gọi thêm món
        </Button>
        <Button size="large" block icon={<Utensils size={18} />} style={{ height: 48 }} onClick={() => onView(session.id)}>
          Xem order của bàn
        </Button>
        {!session.billRequestedAt && (
          <Button size="large" block icon={<ReceiptText size={18} />} style={{ height: 48 }} onClick={() => onBilling(session.id)}>
            Báo tính tiền
          </Button>
        )}
        {session.status === "paid" && (
          <Button size="large" block icon={<ReceiptText size={18} />} style={{ height: 48 }} onClick={() => onBilling(session.id)}>
            Xem hoá đơn / Đóng bàn
          </Button>
        )}
        {noLines && (
          <Button
            size="large"
            block
            danger
            icon={<XCircle size={18} />}
            style={{ height: 48 }}
            onClick={() => onCancelled(session.id)}
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
  awaiting_pickup: "Chờ bưng",
  served: "Đã phục vụ",
  cancelled: "Đã huỷ",
  sold_out: "Hết món",
};

function ViewOrderModal({ sessionId, onClose }: { sessionId: string | null; onClose: () => void }) {
  const orderLines = useAppStore((s) => s.orderLines);
  if (!sessionId) return null;
  const lines = orderLines.filter((l) => l.sessionId === sessionId && l.status !== "cancelled");
  const total = sessionTotal(sessionId, orderLines);

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
              {lineStatusLabel[l.status] ?? l.status}
            </span>
          </div>
        ))}
        {lines.length === 0 && <div style={{ color: "#a1a1aa", fontSize: 13, padding: "12px 0" }}>Chưa gọi món nào.</div>}
        {lines.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1.5px solid #0a0a0a" }}>
            <span style={{ fontWeight: 600 }}>Tạm tính</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{money(total)}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
