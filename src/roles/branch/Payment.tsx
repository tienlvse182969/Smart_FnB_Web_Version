import { useMemo, useState } from "react";
import { App, Button, Card, Segmented, Select } from "antd";
import { Banknote, BellRing, CheckCircle2, QrCode } from "lucide-react";
import { money } from "../../data";
import type { Payment as PaymentRecord, TableSession } from "../../types";
import { minutesSinceISO } from "../../services/_utils";
import { SectionTitle, EmptyState } from "../../components/bits";
import { useAppStore } from "../../store";
import { FEATURE_FLAGS } from "../../config";

function sessionTotal(sessionId: string, lines: { sessionId?: string; unitPrice: number; qty: number; status: string }[]) {
  return lines
    .filter((l) => l.sessionId === sessionId && l.status !== "cancelled" && l.status !== "sold_out")
    .reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

/**
 * Thanh toán (mục 4.5.A, BR-13→BR-17): chỉ Branch Manager sinh mã QR/ghi
 * nhận tiền mặt và xác nhận thu tiền — waiter chỉ báo quầy và thu hộ.
 * "Đối soát tay" (mục 4.5.B) là giai đoạn 2 — ẩn khỏi menu chính theo
 * `FEATURE_FLAGS.manualReconciliation` (src/config.ts), chưa cài đặt ở bước này.
 */
export default function Payment() {
  const [tab, setTab] = useState<string>("counter");

  const options = [
    { label: "Thu ngân tại quầy", value: "counter" },
    ...(FEATURE_FLAGS.manualReconciliation
      ? [{ label: "Đối soát tay (GĐ2)", value: "reconcile" }]
      : []),
  ];

  return (
    <>
      <SectionTitle
        title="Thanh toán"
        sub="Chỉ Branch Manager xác nhận thanh toán — waiter chỉ mang QR hoặc thu tiền hộ (BR-13)"
        extra={<Segmented value={tab} onChange={(v) => setTab(v as string)} options={options} />}
      />

      {tab === "counter" ? <Counter /> : <EmptyState title="Đối soát tay — giai đoạn 2" />}
    </>
  );
}

function Counter() {
  const sessions = useAppStore((s) => s.sessions);
  const orderLines = useAppStore((s) => s.orderLines);
  const billable = sessions.filter((s) => s.status === "open" || s.status === "serving" || s.status === "paid");
  const [selId, setSelId] = useState<string | null>(billable[0]?.id ?? null);
  const sel = billable.find((s) => s.id === selId) ?? null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)", gap: 16 }}>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
          Bàn đang có khách ({billable.length})
        </div>
        {billable.length === 0 ? (
          <div style={{ fontSize: 13, color: "#a1a1aa", padding: "24px 0", textAlign: "center" }}>
            Không còn bàn nào chờ thanh toán.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {billable.map((s) => {
              const active = s.id === selId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
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
                    font: "inherit",
                  }}
                >
                  <div style={{ minWidth: 56 }}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{s.tableIds.map((id) => id.split("-").pop()).join(" + ")}</div>
                    <div style={{ fontSize: 11, color: "#a1a1aa" }}>{s.guests} khách</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{money(sessionTotal(s.id, orderLines))}</div>
                    <div style={{ fontSize: 12, color: "#71717a" }}>{s.id} · mở {minutesSinceISO(s.openedAt)} phút trước</div>
                  </div>
                  {s.status === "paid" ? (
                    <Tag bg="#e7f7ec" color="#0a0a0a">Đã thanh toán</Tag>
                  ) : s.billRequestedAt ? (
                    <Tag bg="#fff7e6" color="#7a5b00">
                      <BellRing size={12} /> Chờ tính tiền
                    </Tag>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <BillPanel session={sel} />
    </div>
  );
}

function Tag({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, background: bg, color, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function BillPanel({ session }: { session: TableSession | null }) {
  const { message } = App.useApp();
  const orderLines = useAppStore((s) => s.orderLines);
  const payments = useAppStore((s) => s.payments);
  const staff = useAppStore((s) => s.staff);
  const collectPayment = useAppStore((s) => s.collectPayment);
  const confirmPayment = useAppStore((s) => s.confirmPayment);
  const [pendingMethod, setPendingMethod] = useState<"qr" | "cash" | null>(null);
  const [waiterSel, setWaiterSel] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const waitersOnShift = staff
    .filter((s) => s.role === "Waiter" && s.onShift && s.active)
    .map((s) => ({ value: s.name, label: s.name }));

  // Payment mới nhất của phiên (mỗi phiên chỉ mở 1 payment tại một thời điểm trong demo này).
  const payment: PaymentRecord | undefined = session
    ? payments.filter((p) => p.sessionId === session.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
    : undefined;

  if (!session) {
    return (
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
        <div style={{ minHeight: 240, display: "grid", placeItems: "center", color: "#a1a1aa", fontSize: 13 }}>
          Chọn một bàn để xem hoá đơn.
        </div>
      </Card>
    );
  }

  const lines = orderLines.filter((l) => l.sessionId === session.id && l.status !== "cancelled" && l.status !== "sold_out");
  const orderIds: string[] = [];
  for (const l of lines) if (!orderIds.includes(l.orderId)) orderIds.push(l.orderId);
  const total = sessionTotal(session.id, orderLines);
  const paid = session.status === "paid";

  const generateQr = async () => {
    setBusy(true);
    try {
      await collectPayment(session.id, total, "qr");
      message.info("Đã sinh mã QR — mang ra bàn cho khách quét");
    } finally {
      setBusy(false);
    }
  };

  const receiveCash = async () => {
    if (!waiterSel) return;
    setBusy(true);
    try {
      await collectPayment(session.id, total, "cash", waiterSel);
      message.info("Đã ghi nhận tiền mặt — chờ xác nhận");
    } finally {
      setBusy(false);
    }
  };

  const simulateWebhook = async () => {
    if (!payment) return;
    setBusy(true);
    try {
      await confirmPayment(payment.id);
      message.success("Webhook báo tiền về — đã xác nhận thanh toán & in hoá đơn (BR-15)");
    } finally {
      setBusy(false);
    }
  };

  const confirmCash = async () => {
    if (!payment) return;
    setBusy(true);
    try {
      await confirmPayment(payment.id);
      message.success("Đã xác nhận thanh toán & in hoá đơn (BR-15)");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
      <SectionTitle
        title={`Hoá đơn · bàn ${session.tableIds.map((id) => id.split("-").pop()).join(" + ")}`}
        sub={`Phiên ${session.id} · ${session.guests} khách · mở ${minutesSinceISO(session.openedAt)} phút trước`}
      />

      <div style={{ border: "1px solid var(--ant-color-border)", borderRadius: 12, overflow: "hidden" }}>
        {orderIds.map((orderId, gi) => (
          <div key={orderId}>
            <div style={{ background: "#fafafa", padding: "8px 16px", fontSize: 12, color: "#71717a", fontWeight: 600, borderTop: gi === 0 ? "none" : "1px solid var(--ant-color-border)" }}>
              {gi === 0 ? "Gọi lần đầu" : `Gọi thêm ${gi}`}
            </div>
            {lines
              .filter((l) => l.orderId === orderId)
              .map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--ant-color-border)", fontSize: 13.5 }}>
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
        {orderIds.length === 0 && (
          <div style={{ padding: "20px 16px", color: "#a1a1aa", fontSize: 13 }}>Bàn chưa gọi món nào.</div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderTop: "1.5px solid #0a0a0a" }}>
          <span style={{ fontWeight: 600 }}>Tổng cộng</span>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{money(total)}</span>
        </div>
      </div>

      {paid ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13, color: "#52525b", background: "#e7f7ec", borderRadius: 10, padding: "10px 14px" }}>
          <CheckCircle2 size={16} />
          Đã xác nhận thanh toán
          {payment?.method ? ` · ${payment.method === "qr" ? "chuyển khoản QR" : "tiền mặt"}` : ""}
          {session.confirmedBy ? ` · ${session.confirmedBy}` : ""}
          {payment?.invoiceCode ? ` · hoá đơn ${payment.invoiceCode}` : ""}
        </div>
      ) : payment?.status === "awaiting_transfer" ? (
        <>
          <div style={{ marginTop: 16, textAlign: "center", border: "1.5px dashed var(--ant-color-border)", borderRadius: 12, padding: "18px 12px" }}>
            <QrCode size={40} style={{ margin: "0 auto 8px" }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>{payment.invoiceCode}</div>
            <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>
              Mã hoá đơn duy nhất trên QR (BR-16) — {money(total)}
            </div>
          </div>
          <Button
            type="primary"
            size="large"
            block
            loading={busy}
            icon={<CheckCircle2 size={18} />}
            style={{ marginTop: 12, height: 50, fontSize: 15 }}
            onClick={simulateWebhook}
          >
            Giả lập: cổng thanh toán báo webhook đã nhận tiền
          </Button>
        </>
      ) : payment?.status === "cash_received" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 13.5, color: "#7a5b00", background: "#fff7e6", border: "1px solid #ffe1a8", borderRadius: 10, padding: "12px 14px" }}>
            <Banknote size={17} />
            Đã ghi nhận tiền mặt do <b>&nbsp;{payment.collectedBy}&nbsp;</b> thu hộ — xác nhận để hoàn tất.
          </div>
          <Button
            type="primary"
            size="large"
            block
            loading={busy}
            icon={<CheckCircle2 size={18} />}
            style={{ marginTop: 12, height: 50, fontSize: 15 }}
            onClick={confirmCash}
          >
            Xác nhận thanh toán & in hoá đơn
          </Button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Button
              block
              size="large"
              type={pendingMethod === "qr" ? "primary" : "default"}
              icon={<QrCode size={18} />}
              disabled={orderIds.length === 0}
              onClick={() => setPendingMethod("qr")}
            >
              Sinh mã QR
            </Button>
            <Button
              block
              size="large"
              type={pendingMethod === "cash" ? "primary" : "default"}
              icon={<Banknote size={18} />}
              disabled={orderIds.length === 0}
              onClick={() => setPendingMethod("cash")}
            >
              Nhận tiền mặt
            </Button>
          </div>

          {pendingMethod === "cash" && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>
                Waiter đã thu tiền hộ
              </div>
              <Select
                placeholder="Chọn waiter đang trong ca"
                value={waiterSel}
                onChange={setWaiterSel}
                style={{ width: "100%" }}
                options={waitersOnShift}
              />
              <div style={{ fontSize: 11.5, color: "#a1a1aa", marginTop: 5 }}>
                Hệ thống ghi lại tên waiter để truy vết khi thất thoát.
              </div>
            </div>
          )}

          {pendingMethod && (
            <Button
              block
              size="large"
              type="primary"
              loading={busy}
              disabled={pendingMethod === "cash" && !waiterSel}
              style={{ marginTop: 12, height: 48 }}
              onClick={pendingMethod === "qr" ? generateQr : receiveCash}
            >
              {pendingMethod === "qr" ? "Xuất mã QR" : "Ghi nhận tiền mặt"}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
