import { Card } from "antd";
import { money, type Transaction, type TxStatus } from "../../data";
import { SectionTitle } from "../../components/bits";

export const txMeta: Record<TxStatus, { label: string; bg: string; color: string }> = {
  confirmed: { label: "Đã xác nhận", bg: "#e7f7ec", color: "#0a0a0a" },
  pending: { label: "Chờ xử lý", bg: "#fff3d6", color: "#0a0a0a" },
  refund: { label: "Hoàn tiền", bg: "#f4f4f5", color: "#0a0a0a" },
  failed: { label: "Lỗi · đối soát", bg: "#0a0a0a", color: "#fff" },
};

export default function TxList({
  txs,
  selId,
  onSelect,
}: {
  txs: Transaction[];
  selId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Ngoại lệ thanh toán"
        sub="Luồng VietQR tự đối soát — thu ngân chỉ xử lý phần còn lại"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {txs.map((t) => {
          const active = t.id === selId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
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
              <div style={{ minWidth: 52 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{t.table}</div>
                <div style={{ fontSize: 11, color: "#a1a1aa" }}>{t.time}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{money(t.amount)}</div>
                <div style={{ fontSize: 12, color: "#71717a" }}>
                  {t.id} · {t.method}
                  {t.note ? ` · ${t.note}` : ""}
                </div>
              </div>
              <span
                style={{
                  background: txMeta[t.status].bg,
                  color: txMeta[t.status].color,
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {txMeta[t.status].label}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
