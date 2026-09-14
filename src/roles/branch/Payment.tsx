import { App, Button, Card, Segmented, Select } from "antd";
import { Banknote, CheckCircle2, QrCode } from "lucide-react";
import { useMemo, useState } from "react";
import {
  branchShortName,
  calcSessionTotal,
  currentBranchId,
  getSessionBill,
  money,
  sessionsForBranch,
  staff as staffSeed,
  transactions as txSeed,
  type TableSession,
  type Transaction,
  type TxStatus,
} from "../../data";
import { SectionTitle } from "../../components/bits";
import TxList from "./TxList";
import TxDetail from "./TxDetail";

/** Branch Manager đang trực quầy (demo). */
const MANAGER_NAME = "Trần Minh Quân";

/** Danh sách waiter đang trong ca tại chi nhánh hiện tại. */
const waitersOnShift = staffSeed
  .filter(
    (s) =>
      s.branch === branchShortName(currentBranchId) &&
      s.role === "Waiter" &&
      s.onShift &&
      s.active,
  )
  .map((s) => ({ value: s.name, label: s.name }));

export default function Payment() {
  const { message } = App.useApp();
  const [tab, setTab] = useState<string>("counter");

  const [sessions, setSessions] = useState<TableSession[]>(
    sessionsForBranch(currentBranchId).filter((s) => s.status === "open"),
  );
  const [method, setMethod] = useState<Record<string, "VietQR" | "Tiền mặt" | undefined>>({});
  const [waiterSel, setWaiterSel] = useState<Record<string, string>>({});
  const [attribution, setAttribution] = useState<Record<string, string>>({});

  const openSessions = sessions.filter((s) => s.status === "open");
  const [selId, setSelId] = useState<string | null>(openSessions[0]?.id ?? null);
  const sel = sessions.find((s) => s.id === selId) ?? null;

  const chooseMethod = (m: "VietQR" | "Tiền mặt") => {
    if (!sel) return;
    setMethod((p) => ({ ...p, [sel.id]: m }));
    if (m === "VietQR") {
      setWaiterSel((p) => ({ ...p, [sel.id]: "" }));
      message.info("Đã sinh mã QR — mang ra bàn cho khách quét");
    } else {
      message.info("Nhận tiền mặt — chọn waiter đã thu hộ trước khi xác nhận");
    }
  };

  const confirm = () => {
    if (!sel) return;
    const m = method[sel.id];
    if (!m) {
      message.error("Chọn phương thức thanh toán trước");
      return;
    }
    if (m === "Tiền mặt" && !waiterSel[sel.id]) {
      message.error("Chọn waiter đã thu tiền hộ");
      return;
    }
    setSessions((p) => p.map((s) => (s.id === sel.id ? { ...s, status: "paid" } : s)));
    const attr =
      m === "VietQR"
        ? `Chuyển khoản QR · xác nhận bởi ${MANAGER_NAME}`
        : `Tiền mặt · thu hộ bởi ${waiterSel[sel.id]} · xác nhận bởi ${MANAGER_NAME}`;
    setAttribution((p) => ({ ...p, [sel.id]: attr }));
    message.success("Đã xác nhận thanh toán & in hoá đơn");
    const remaining = openSessions.filter((s) => s.id !== sel.id);
    setSelId(remaining[0]?.id ?? null);
  };

  return (
    <>
      <SectionTitle
        title="Thanh toán"
        sub="Chỉ Branch Manager xác nhận thanh toán — waiter chỉ mang QR hoặc thu tiền hộ"
        extra={
          <Segmented
            value={tab}
            onChange={(v) => setTab(v as string)}
            options={[
              { label: "Thu ngân tại quầy", value: "counter" },
              { label: "Đối soát tay", value: "reconcile" },
            ]}
          />
        }
      />

      {tab === "counter" ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)", gap: 16 }}>
          <OpenTables sessions={openSessions} selId={selId} onSelect={setSelId} />
          <BillPanel
            session={sel}
            method={sel ? method[sel.id] : undefined}
            waiterSel={sel ? waiterSel[sel.id] : undefined}
            attribution={sel ? attribution[sel.id] : undefined}
            waitersOnShift={waitersOnShift}
            onMethod={chooseMethod}
            onWaiter={(name) => {
              if (sel) setWaiterSel((p) => ({ ...p, [sel.id]: name }));
            }}
            onConfirm={confirm}
          />
        </div>
      ) : (
        <Reconcile />
      )}
    </>
  );
}

function OpenTables({
  sessions,
  selId,
  onSelect,
}: {
  sessions: TableSession[];
  selId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
        Bàn đang có khách ({sessions.length})
      </div>
      {sessions.length === 0 ? (
        <div style={{ fontSize: 13, color: "#a1a1aa", padding: "24px 0", textAlign: "center" }}>
          Không còn bàn nào chờ thanh toán.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sessions.map((s) => {
            const active = s.id === selId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  border: `1.5px solid ${active ? "#0a0a0a" : "var(--ant-color-border)"}`,
                  background: active ? "#fafafa" : "#fff",
                  borderRadius: 12,
                  padding: "13px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{ minWidth: 56 }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{s.tableIds.join(" + ")}</div>
                  <div style={{ fontSize: 11, color: "#a1a1aa" }}>{s.guests} khách</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{money(calcSessionTotal(s.id))}</div>
                  <div style={{ fontSize: 12, color: "#71717a" }}>
                    {s.id} · mở {s.openedAt}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function BillPanel({
  session,
  method,
  waiterSel,
  attribution,
  waitersOnShift,
  onMethod,
  onWaiter,
  onConfirm,
}: {
  session: TableSession | null;
  method?: "VietQR" | "Tiền mặt";
  waiterSel?: string;
  attribution?: string;
  waitersOnShift: { value: string; label: string }[];
  onMethod: (m: "VietQR" | "Tiền mặt") => void;
  onWaiter: (name: string) => void;
  onConfirm: () => void;
}) {
  const bill = useMemo(() => (session ? getSessionBill(session.id) : []), [session]);

  if (!session) {
    return (
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
        <div style={{ minHeight: 240, display: "grid", placeItems: "center", color: "#a1a1aa", fontSize: 13 }}>
          Chọn một bàn để xem hoá đơn.
        </div>
      </Card>
    );
  }

  const total = calcSessionTotal(session.id);
  const canConfirm = !!method && (method !== "Tiền mặt" || !!waiterSel);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
      <SectionTitle
        title={`Hoá đơn · bàn ${session.tableIds.join(" + ")}`}
        sub={`Phiên ${session.id} · ${session.guests} khách · mở ${session.openedAt}`}
      />

      <div style={{ border: "1px solid var(--ant-color-border)", borderRadius: 12, overflow: "hidden" }}>
        {bill.map((group, gi) => (
          <div key={group.orderId}>
            <div
              style={{
                background: "#fafafa",
                padding: "8px 16px",
                fontSize: 12,
                color: "#71717a",
                fontWeight: 600,
                borderTop: gi === 0 ? "none" : "1px solid var(--ant-color-border)",
              }}
            >
              {gi === 0 ? "Gọi lần đầu" : `Gọi thêm ${gi}`} · {group.createdAt}
            </div>
            {group.lines.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderTop: "1px solid var(--ant-color-border)",
                  fontSize: 13.5,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>
                    {l.name} <span style={{ color: "#a1a1aa", fontWeight: 400 }}>× {l.qty}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>
                    {money(l.unitPrice)}
                    {l.note ? ` · ${l.note}` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>{money(l.unitPrice * l.qty)}</div>
              </div>
            ))}
          </div>
        ))}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderTop: "1.5px solid #0a0a0a",
          }}
        >
          <span style={{ fontWeight: 600 }}>Tổng cộng</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{money(total)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Button
          block
          size="large"
          type={method === "VietQR" ? "primary" : "default"}
          icon={<QrCode size={18} />}
          onClick={() => onMethod("VietQR")}
        >
          Sinh mã QR
        </Button>
        <Button
          block
          size="large"
          type={method === "Tiền mặt" ? "primary" : "default"}
          icon={<Banknote size={18} />}
          onClick={() => onMethod("Tiền mặt")}
        >
          Nhận tiền mặt
        </Button>
      </div>

      {method === "Tiền mặt" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>
            Waiter đã thu tiền hộ
          </div>
          <Select
            placeholder="Chọn waiter đang trong ca"
            value={waiterSel || undefined}
            onChange={onWaiter}
            style={{ width: "100%" }}
            options={waitersOnShift}
          />
          <div style={{ fontSize: 11.5, color: "#a1a1aa", marginTop: 5 }}>
            Hệ thống ghi lại tên waiter để truy vết khi thất thoát.
          </div>
        </div>
      )}

      <Button
        block
        size="large"
        type="primary"
        style={{ marginTop: 12 }}
        disabled={!canConfirm}
        icon={<CheckCircle2 size={18} />}
        onClick={onConfirm}
      >
        Xác nhận thanh toán & in hoá đơn
      </Button>

      {attribution && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12.5,
            color: "#52525b",
            textAlign: "center",
            background: "#f4f4f5",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {attribution}
        </div>
      )}
    </Card>
  );
}

function Reconcile() {
  const { message } = App.useApp();
  const [txs, setTxs] = useState<Transaction[]>(
    txSeed.filter(
      (t) => t.branchId === currentBranchId && (t.status === "pending" || t.status === "failed"),
    ),
  );
  const [selId, setSelId] = useState<string>(txs[0]?.id ?? "");
  const sel = txs.find((t) => t.id === selId) ?? null;

  const resolve = (id: string, to: TxStatus, msg: string) => {
    setTxs((p) => p.map((t) => (t.id === id ? { ...t, status: to, note: undefined } : t)));
    message.success(msg);
  };

  if (txs.length === 0) {
    return (
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div style={{ minHeight: 200, display: "grid", placeItems: "center", color: "#a1a1aa", fontSize: 13 }}>
          Không có giao dịch treo hoặc lỗi cần đối soát tay.
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)", gap: 16 }}>
      <TxList txs={txs} selId={selId} onSelect={setSelId} />
      {sel && <TxDetail sel={sel} onResolve={resolve} />}
    </div>
  );
}
