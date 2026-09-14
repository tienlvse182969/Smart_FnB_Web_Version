import { Card } from "antd";
import { revenueComparison } from "../../data";
import { SectionTitle } from "../../components/bits";

export default function RevenueChart() {
  const data = revenueComparison();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Doanh thu theo chi nhánh" sub="Hôm nay · so sánh giữa các chi nhánh (triệu ₫)" />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 168, marginTop: 8 }}>
        {data.map((d) => {
          const top = d.value === max;
          return (
            <div key={d.name} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{d.value}</div>
              <div style={{ height: 118, display: "flex", alignItems: "flex-end" }}>
                <div
                  title={`${d.value} triệu`}
                  style={{
                    width: "100%",
                    height: `${(d.value / max) * 100}%`,
                    minHeight: 4,
                    background: top ? "#0a0a0a" : "#d4d4d8",
                    borderRadius: "5px 5px 0 0",
                    transition: "height .3s",
                  }}
                />
              </div>
              <div style={{ fontSize: 11.5, color: "#a1a1aa", marginTop: 6 }}>{d.name}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
