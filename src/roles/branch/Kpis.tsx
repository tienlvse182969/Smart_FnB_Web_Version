import { useMemo } from "react";
import { Col, Row } from "antd";
import { ChefHat, LayoutGrid, Sparkles, TrendingUp } from "lucide-react";
import { money } from "../../data";
import { kitchenQueue } from "../../services/order.service";
import { StatCard } from "../../components/bits";
import { useAppStore } from "../../store";

/** Dashboard chi nhánh (mục 4.5.D) — mọi số liệu đọc từ mock/db.ts qua store. */
export default function Kpis() {
  const tables = useAppStore((s) => s.tables);
  const payments = useAppStore((s) => s.payments);
  const orderLines = useAppStore((s) => s.orderLines);
  const menuItems = useAppStore((s) => s.menuItems);
  const branchMenuItems = useAppStore((s) => s.branchMenuItems);

  const revenueToday = payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + p.amount, 0);

  const servingCount = tables.filter((t) => t.status === "occupied").length;

  // Dùng lại đúng hàm kitchenQueue() mà màn Kitchen đang dùng — không viết bản riêng.
  const pendingKitchen = useMemo(
    () => kitchenQueue(orderLines, menuItems).filter((t) => t.status !== "awaiting_pickup").length,
    [orderLines, menuItems],
  );

  const bestSeller = useMemo(() => {
    const withName = branchMenuItems
      .map((b) => ({ ...b, item: menuItems.find((m) => m.id === b.menuItemId) }))
      .filter((b) => b.item);
    if (withName.length === 0) return null;
    const best = withName.reduce((a, b) => (b.soldToday > a.soldToday ? b : a));
    return best.soldToday > 0 ? { name: best.item!.name, sold: best.soldToday } : null;
  }, [branchMenuItems, menuItems]);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <StatCard
          label="Doanh thu hôm nay"
          value={money(revenueToday)}
          hint="chi nhánh này"
          icon={<TrendingUp size={18} />}
          emphasis
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Bàn đang phục vụ"
          value={`${servingCount}/${tables.length}`}
          hint="trên tổng số bàn"
          icon={<LayoutGrid size={18} />}
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Món đang chờ bếp"
          value={pendingKitchen}
          hint="queued / cooking"
          icon={<ChefHat size={18} />}
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Món bán chạy"
          value={bestSeller?.name ?? "—"}
          hint={bestSeller ? `${bestSeller.sold} phần hôm nay` : undefined}
          icon={<Sparkles size={18} />}
        />
      </Col>
    </Row>
  );
}
