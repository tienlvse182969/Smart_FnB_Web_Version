import { Col, Row } from "antd";
import { ChefHat, LayoutGrid, Sparkles, TrendingUp } from "lucide-react";
import {
  bestSellerBranch,
  branchRevenueToday,
  branches,
  currentBranchId,
  money,
  pendingKitchenCount,
  servingTableCount,
} from "../../data";
import { StatCard } from "../../components/bits";

export default function Kpis() {
  const totalTables = branches.find((b) => b.id === currentBranchId)?.tables ?? 0;
  const best = bestSellerBranch(currentBranchId);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <StatCard
          label="Doanh thu hôm nay"
          value={money(branchRevenueToday(currentBranchId))}
          hint="chi nhánh này"
          icon={<TrendingUp size={18} />}
          emphasis
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Bàn đang phục vụ"
          value={`${servingTableCount(currentBranchId)}/${totalTables}`}
          hint="trên tổng số bàn"
          icon={<LayoutGrid size={18} />}
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Món đang chờ bếp"
          value={pendingKitchenCount(currentBranchId)}
          hint="queued / cooking"
          icon={<ChefHat size={18} />}
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Món bán chạy"
          value={best?.name ?? "—"}
          hint={best ? `${best.sold} phần hôm nay` : undefined}
          icon={<Sparkles size={18} />}
        />
      </Col>
    </Row>
  );
}
