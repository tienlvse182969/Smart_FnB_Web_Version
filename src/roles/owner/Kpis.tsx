import { Col, Row } from "antd";
import { Sparkles, Store, TrendingUp, Users } from "lucide-react";
import {
  bestSellerChain,
  branches,
  chainRevenueToday,
  guestsTodayByBranch,
  money,
} from "../../data";
import { StatCard } from "../../components/bits";

export default function Kpis() {
  const openBranches = branches.filter((b) => b.status === "open").length;
  const totalGuests = branches.reduce(
    (n, b) => n + (guestsTodayByBranch[b.id] ?? 0),
    0,
  );
  const best = bestSellerChain();

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <StatCard
          label="Doanh thu hôm nay · toàn chuỗi"
          value={money(chainRevenueToday())}
          hint={`${branches.length} chi nhánh cộng dồn`}
          icon={<TrendingUp size={18} />}
          emphasis
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Chi nhánh đang mở"
          value={`${openBranches}/${branches.length}`}
          hint="theo trạng thái cửa hàng"
          icon={<Store size={18} />}
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Tổng lượt khách hôm nay"
          value={totalGuests.toLocaleString("vi-VN")}
          hint="cộng dồn mọi chi nhánh"
          icon={<Users size={18} />}
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Món bán chạy toàn chuỗi"
          value={best?.name ?? "—"}
          hint={best ? `${best.sold} phần hôm nay` : undefined}
          icon={<Sparkles size={18} />}
        />
      </Col>
    </Row>
  );
}
