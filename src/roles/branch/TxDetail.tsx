import { App, Button, Card } from "antd";
import { CheckCircle2, Printer, RotateCcw, ScanLine } from "lucide-react";
import { money, type Transaction, type TxStatus } from "../../data";
import { SectionTitle } from "../../components/bits";

export default function TxDetail({
  sel,
  onResolve,
}: {
  sel: Transaction;
  onResolve: (id: string, to: TxStatus, msg: string) => void;
}) {
  const { message } = App.useApp();
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
      <SectionTitle title={`Giao dịch ${sel.id}`} sub={`Bàn ${sel.table} · phiên ${sel.session}`} />

      <div
        style={{
          border: "1px solid var(--ant-color-border)",
          borderRadius: 12,
          padding: 18,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "#71717a" }}>Số tiền</span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>{money(sel.amount)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#52525b" }}>
          <span>Phương thức</span>
          <span>{sel.method}</span>
        </div>
        {sel.note && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              background: "#fafafa",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#52525b",
            }}
          >
            {sel.note}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sel.status === "pending" && sel.method === "Tiền mặt" && (
          <Button
            type="primary"
            size="large"
            block
            icon={<CheckCircle2 size={18} />}
            onClick={() => onResolve(sel.id, "confirmed", "Đã xác nhận tiền mặt — đơn xuống bếp")}
          >
            Xác nhận đã nhận tiền mặt
          </Button>
        )}
        {sel.status === "pending" && sel.method === "VietQR" && (
          <Button
            type="primary"
            size="large"
            block
            icon={<ScanLine size={18} />}
            onClick={() => onResolve(sel.id, "confirmed", "Đã đối soát tay & xác nhận — ghi audit log")}
          >
            Đối soát tay & xác nhận
          </Button>
        )}
        {sel.status === "failed" && (
          <Button
            type="primary"
            size="large"
            block
            icon={<ScanLine size={18} />}
            onClick={() => onResolve(sel.id, "confirmed", "Đã đối soát tay — khớp mã đơn & số tiền")}
          >
            Đối soát tay theo mã đơn
          </Button>
        )}
        {(sel.status === "confirmed" || sel.status === "refund") && (
          <Button
            size="large"
            block
            danger
            icon={<RotateCcw size={18} />}
            onClick={() => onResolve(sel.id, "refund", "Đã tạo phiếu hoàn tiền — chờ Manager duyệt")}
          >
            Tạo hoàn tiền
          </Button>
        )}
        <Button
          size="large"
          block
          icon={<Printer size={18} />}
          onClick={() => message.info("Đang mở hộp thoại in hoá đơn…")}
        >
          In hoá đơn
        </Button>
      </div>
    </Card>
  );
}
