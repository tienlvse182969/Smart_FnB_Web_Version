import { Col, Row } from "antd";
import { AlertTriangle, Building2, Clock3, Coins, FlaskConical, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { adminAnalyticsApi } from "../../api/adminAnalytics";
import { StatCard } from "../../components/bits";
import { formatCount, formatVnd } from "../../lib/reportFormat";
import type { AdminOverviewMetrics } from "../../types";

export default function Kpis() {
  const [data, setData] = useState<AdminOverviewMetrics>();

  useEffect(() => {
    let cancelled = false;
    adminAnalyticsApi.overview().then((result) => {
      if (!cancelled) setData(result);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const count = (value: number | undefined) => value === undefined ? "…" : formatCount(value);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} xl={8}>
        <StatCard label="Doanh nghiệp" value={count(data?.businesses.total)} hint={`${count(data?.businesses.paid)} đang trả phí`} icon={<Building2 size={18} />} emphasis />
      </Col>
      <Col xs={24} sm={12} xl={8}>
        <StatCard label="Doanh thu tháng này" value={data ? formatVnd(data.revenueThisMonth) : "…"} hint={`MRR hiện tại: ${data ? formatVnd(data.mrr) : "…"}`} icon={<Coins size={18} />} />
      </Col>
      <Col xs={24} sm={12} xl={8}>
        <StatCard label="Hồ sơ chờ duyệt" value={count(data?.registrations.PENDING)} hint={`${count(data?.registrations.APPROVED)} chờ kích hoạt`} icon={<Clock3 size={18} />} />
      </Col>
      <Col xs={24} sm={12} xl={8}>
        <StatCard label="Đang dùng thử" value={count(data?.businesses.trial)} hint="gói Cơ bản 14 ngày" icon={<FlaskConical size={18} />} />
      </Col>
      <Col xs={24} sm={12} xl={8}>
        <StatCard label="Hết hạn / tạm ngưng" value={data ? formatCount(data.businesses.expired + data.businesses.suspended) : "…"} hint="đang ở chế độ chỉ đọc" icon={<AlertTriangle size={18} />} />
      </Col>
      <Col xs={24} sm={12} xl={8}>
        <StatCard label="Hoá đơn cần xem xét" value={count(data?.invoicesNeedReview)} hint={`${count(data?.activePlans)} gói đang bán`} icon={<Receipt size={18} />} />
      </Col>
    </Row>
  );
}
