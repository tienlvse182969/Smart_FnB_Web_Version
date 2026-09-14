import { Card } from "antd";
import { branchShortName, currentBranchId, revenueByHour } from "../../data";
import { SectionTitle } from "../../components/bits";

export default function RevenueChart() {
  const max = Math.max(...revenueByHour.map((d) => d.value));
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Doanh thu theo giờ" sub={`${branchShortName(currentBranchId)} · hôm nay (triệu ₫)`} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 168, marginTop: 8 }}>
        {revenueByHour.map((d) => {
          const peak = d.value === max;
          return (
            <div key={d.hour} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 140, display: "flex", alignItems: "flex-end" }}>
                <div
                  title={`${d.value} triệu`}
                  style={{
                    width: "100%",
                    height: `${(d.value / max) * 100}%`,
                    background: peak ? "#0a0a0a" : "#d4d4d8",
                    borderRadius: "5px 5px 0 0",
                    transition: "height .3s",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 6 }}>{d.hour}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
