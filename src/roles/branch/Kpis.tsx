import { Col, Row } from "antd";
import { Sparkles, TrendingUp } from "lucide-react";
import { StatCard } from "../../components/bits";
import { palette } from "../../theme";

const PLACEHOLDER = <span style={{ fontSize: 15, color: palette.textMuted }}>Chưa có dữ liệu</span>;

/**
 * Dashboard chi nhánh (BM-03). Các ô đang là placeholder: backend chỉ mở
 * `/reports/*` cho OWNER nên Manager chưa đọc được số liệu chi nhánh. Thà để
 * trống còn hơn hiện số giả. Số liệu thật sẽ nối ở giai đoạn sau.
 */
export default function Kpis() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <StatCard
          label="Doanh thu hôm nay"
          value={PLACEHOLDER}
          hint="báo cáo doanh thu chưa mở cho Quản lý chi nhánh"
          icon={<TrendingUp size={18} />}
        />
      </Col>
      <Col xs={12} md={6}>
        <StatCard
          label="Món bán chạy"
          value={PLACEHOLDER}
          hint="chờ báo cáo chi nhánh (BM-03)"
          icon={<Sparkles size={18} />}
        />
      </Col>
    </Row>
  );
}
