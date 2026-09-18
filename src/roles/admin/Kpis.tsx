import { useEffect, useState } from "react";
import { Col, Row } from "antd";
import { Building2, CheckCircle2, Clock3 } from "lucide-react";
import type { RegistrationRequest, Tenant } from "../../types";
import { listRegistrations, listTenants } from "../../services";
import { StatCard } from "../../components/bits";

export default function Kpis() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);

  useEffect(() => {
    listTenants().then(setTenants);
    listRegistrations().then(setRegistrations);
  }, []);

  const active = tenants.filter((t) => t.status === "active").length;
  const pending = registrations.filter((r) => r.status === "pending").length;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} md={8}>
        <StatCard label="Doanh nghiệp thuê bao" value={tenants.length} hint={`${active} đang hoạt động`} icon={<Building2 size={18} />} emphasis />
      </Col>
      <Col xs={12} md={8}>
        <StatCard label="Tạm ngưng / hết hạn" value={tenants.filter((t) => t.status === "suspended" || t.status === "expired").length} hint="đang ở chế độ chỉ đọc" icon={<Clock3 size={18} />} />
      </Col>
      <Col xs={12} md={8}>
        <StatCard label="Đăng ký chờ duyệt" value={pending} hint="khởi tạo doanh nghiệp mới" icon={<CheckCircle2 size={18} />} />
      </Col>
    </Row>
  );
}
