import { Link } from "react-router-dom";
import { Col, Row } from "antd";
import { AlertTriangle, Building2, CirclePause, Clock3, Coins, FlaskConical, Receipt, TrendingUp } from "lucide-react";
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
      {/* Hàng 1 — tình hình kinh doanh hiện tại. */}
      <Col xs={24} sm={12} xl={6}>
        <StatCard label="Doanh nghiệp" value={count(data?.businesses.total)} hint={`${count(data?.businesses.paid)} đang trả phí`} icon={<Building2 size={18} />} emphasis />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatCard label="MRR hiện tại" value={data ? formatVnd(data.mrr) : "…"} hint="giá tháng của gói và phần mua thêm" icon={<TrendingUp size={18} />} />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <Link to="/admin/platform-revenue" data-testid="kpi-revenue-link">
          <StatCard label="Doanh thu tháng này" value={data ? formatVnd(data.revenueThisMonth) : "…"} hint="phí thuê bao đã thu từ ngày 1 · xem chi tiết →" icon={<Coins size={18} />} />
        </Link>
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatCard label="Đang dùng thử" value={count(data?.businesses.trial)} hint="gói Cơ bản 14 ngày" icon={<FlaskConical size={18} />} />
      </Col>
      {/* Hàng 2 — việc cần xử lý. */}
      <Col xs={24} sm={12} xl={6}>
        <Link to="/admin/signups"><StatCard label="Hồ sơ chờ duyệt" value={count(data?.registrations.PENDING)} hint={`${count(data?.registrations.APPROVED)} chờ kích hoạt`} icon={<Clock3 size={18} />} /></Link>
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <Link to={`/admin/billing?status=${data && data.invoicesNeedReview > 0 ? "NEEDS_REVIEW" : "PENDING"}`} data-testid="kpi-invoices">
          <StatCard
            label="Hoá đơn cần xử lý"
            value={data ? formatCount((data.unpaidInvoices ?? 0) + data.invoicesNeedReview) : "…"}
            hint={data ? `${formatCount(data.unpaidInvoices ?? 0)} chưa trả · ${formatVnd(data.outstandingAmount ?? 0)} · ${formatCount(data.invoicesNeedReview)} cần đối chiếu` : undefined}
            icon={<Receipt size={18} />}
          />
        </Link>
      </Col>
      {/* Hai tình huống khác nhau: hết hạn cần nhắc gia hạn, tạm ngưng là quyết định của nền tảng. */}
      <Col xs={24} sm={12} xl={6}>
        <StatCard label="Hết hạn" value={count(data?.businesses.expired)} hint="chế độ chỉ đọc, chờ gia hạn" icon={<AlertTriangle size={18} />} />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatCard label="Tạm ngưng" value={count(data?.businesses.suspended)} hint="do nền tảng tạm ngưng" icon={<CirclePause size={18} />} />
      </Col>
    </Row>
  );
}
