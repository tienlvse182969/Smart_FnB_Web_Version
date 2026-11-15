import { Alert, Button, Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Table } from "antd";
import dayjs from "dayjs";
import { Banknote, Building2, Clock3, Coins, RefreshCw, ReceiptText, Repeat2, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminAnalyticsApi } from "../../api/adminAnalytics";
import { adminApi } from "../../api";
import { SectionTitle, StatCard } from "../../components/bits";
import { formatCount, formatVnd, formatVndCompact, presetRange } from "../../lib/reportFormat";
import ReportChart from "../../components/ReportChart";
import { useReportSection } from "../../components/useReportSection";
import { subscriptionPoints } from "./SubscriptionChart";
import type { PlatformRevenueGroupBy, ServicePlan } from "../../types";

const DAY = "YYYY-MM-DD";

export default function PlatformRevenue() {
  const [range, setRange] = useState(presetRange("30d"));
  const [groupBy, setGroupBy] = useState<PlatformRevenueGroupBy>("day");
  const [planId, setPlanId] = useState<string>();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  useEffect(() => { void adminApi.listPlans().then(setPlans).catch(() => undefined); }, []);
  const { data, loading, error, reload } = useReportSection(useCallback(
    () => adminAnalyticsApi.revenue({ ...range, groupBy, planId }), [range, groupBy, planId]
  ));

  return <div data-testid="platform-revenue">
    <SectionTitle
      title="Doanh thu nền tảng"
      sub="Chỉ tính phí thuê bao Smart F&B đã thu; không gồm doanh thu bán hàng của các quán"
      extra={<Button icon={<RefreshCw size={15} />} loading={loading && !!data} onClick={reload}>Làm mới</Button>}
    />
    <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <DatePicker.RangePicker
          allowClear={false}
          format="DD/MM/YYYY"
          value={[dayjs(range.from, DAY), dayjs(range.to, DAY)]}
          onChange={(values) => values?.[0] && values[1] && setRange({ from: values[0].format(DAY), to: values[1].format(DAY) })}
        />
        <Segmented
          value={groupBy}
          options={[{ value: "day", label: "Theo ngày" }, { value: "month", label: "Theo tháng" }, { value: "year", label: "Theo năm" }]}
          onChange={(value) => setGroupBy(value as PlatformRevenueGroupBy)}
        />
        <Select
          allowClear
          value={planId}
          onChange={setPlanId}
          placeholder="Tất cả gói"
          style={{ minWidth: 190 }}
          options={plans.filter((plan) => plan.code !== "TRIAL").map((plan) => ({ value: plan.id, label: plan.name }))}
        />
      </div>
    </Card>

    {error && <Alert type="error" showIcon message="Không tải được báo cáo" description={error} action={<Button size="small" onClick={reload}>Thử lại</Button>} />}
    {!error && !data && <Skeleton active paragraph={{ rows: 8 }} />}
    {!error && data && <div style={{ opacity: loading ? 0.65 : 1 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}><StatCard label="Thực thu trong kỳ" value={formatVnd(data.summary.revenue)} hint={`${formatCount(data.summary.invoiceCount)} hoá đơn đã trả`} icon={<Banknote size={18} />} emphasis /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="MRR hiện tại" value={formatVnd(data.summary.mrr)} hint="tổng giá tháng của doanh nghiệp trả phí" icon={<TrendingUp size={18} />} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="Doanh nghiệp trả phí" value={formatCount(data.summary.paidBusinesses)} hint={`${formatCount(data.summary.trialBusinesses)} đang dùng thử`} icon={<Building2 size={18} />} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="Chuyển đổi dùng thử" value={`${(data.summary.trialConversionRate * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`} hint="đã trả kỳ đầu / từng dùng thử" icon={<Repeat2 size={18} />} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="Hoá đơn chưa trả" value={formatCount(data.summary.unpaidInvoices)} hint={formatVnd(data.summary.outstandingAmount)} icon={<Clock3 size={18} />} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="Cần đối chiếu" value={formatCount(data.summary.reviewInvoices)} hint="thanh toán lệch hoặc trạng thái thay đổi" icon={<ReceiptText size={18} />} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="Hết hạn / tạm ngưng" value={formatCount(data.summary.expiredBusinesses + data.summary.suspendedBusinesses)} hint="doanh nghiệp chỉ đọc" icon={<Coins size={18} />} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="Gia hạn thủ công" value={formatCount(data.summary.manualRenewals)} hint="ngoại lệ trong kỳ báo cáo" icon={<RefreshCw size={18} />} /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card title="Doanh thu theo thời gian" style={{ borderRadius: 14, height: "100%" }}>
            <ReportChart title="Biểu đồ thực thu" points={subscriptionPoints(data)} format={formatVndCompact} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Doanh thu theo gói" style={{ borderRadius: 14, height: "100%" }}>
            {data.plans.map(row => <div key={row.planId}>{row.planName} · {formatVnd(row.revenue)}
              <progress style={{width:"100%"}} aria-label={row.planName} value={row.revenue} max={Math.max(1,...data.plans.map(p=>p.revenue))} /></div>)}
            <Table
              rowKey="planId"
              size="small"
              pagination={false}
              dataSource={data.plans}
              columns={[
                { title: "Gói", dataIndex: "planName" },
                { title: "Hoá đơn", dataIndex: "invoiceCount", align: "right" },
                { title: "Doanh thu", dataIndex: "revenue", align: "right", render: (value: number) => formatVnd(value) },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>}
  </div>;
}
