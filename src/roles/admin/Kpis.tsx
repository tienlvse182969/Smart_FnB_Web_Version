import { Col, Row } from "antd";
import { Building2, CheckCircle2, Clock3, Wallet } from "lucide-react";
import { money, signupRequests, tenants } from "../../data";
import { StatCard } from "../../components/bits";

export default function Kpis() {
  const mrr = tenants.reduce((s, t) => s + t.mrr, 0);
  const active = tenants.filter((t) => t.status === "active").length;
  const expiring = tenants.filter((t) => t.status === "expiring").length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={6}>
        <StatCard label="Doanh thu thuê bao (MRR)" value={money(mrr)} hint="+8,2% so với tháng trước" icon={<Wallet size={18} />} emphasis />
      </Col>
      <Col xs={12} md={6}>
        <StatCard label="Doanh nghiệp thuê bao" value={tenants.length} hint={`${active} đang hoạt động`} icon={<Building2 size={18} />} />
      </Col>
      <Col xs={12} md={6}>
        <StatCard label="Sắp hết hạn (7 ngày)" value={expiring} hint="cần nhắc gia hạn" icon={<Clock3 size={18} />} />
      </Col>
      <Col xs={12} md={6}>
        <StatCard label="Đăng ký chờ duyệt" value={signupRequests.length} hint="khởi tạo tenant mới" icon={<CheckCircle2 size={18} />} />
      </Col>
    </Row>
  );
}
