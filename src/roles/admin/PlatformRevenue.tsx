import { Alert, Button, Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Table } from "antd";
import dayjs from "dayjs";
import { Banknote, Building2, Clock3, Coins, RefreshCw, ReceiptText, Repeat2, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminAnalyticsApi } from "../../api/adminAnalytics";
import { adminApi } from "../../api";
import { SectionTitle, StatCard } from "../../components/bits";
import { formatCount, formatVnd, formatVndCompact, presetRange } from "../../lib/reportFormat";
import { palette } from "../../theme";
import type { PlatformRevenueGroupBy, PlatformRevenueReport, ServicePlan } from "../../types";

const DAY = "YYYY-MM-DD";

export default function PlatformRevenue() {
  const [range, setRange] = useState(presetRange("30d"));
  const [groupBy, setGroupBy] = useState<PlatformRevenueGroupBy>("day");
  const [planId, setPlanId] = useState<string>();
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [data, setData] = useState<PlatformRevenueReport>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [nonce, setNonce] = useState(0);

  useEffect(() => { void adminApi.listPlans().then(setPlans).catch(() => undefined); }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try { setData(await adminAnalyticsApi.revenue({ ...range, groupBy, planId })); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được báo cáo doanh thu nền tảng"); }
    finally { setLoading(false); }
  }, [range, groupBy, planId, nonce]);

  useEffect(() => { void load(); }, [load]);

  return <div data-testid="platform-revenue">
    <SectionTitle
      title="Doanh thu nền tảng"
      sub="Chỉ tính phí thuê bao Smart F&B đã thu; không gồm doanh thu bán hàng của các quán"
      extra={<Button icon={<RefreshCw size={15} />} loading={loading && !!data} onClick={() => setNonce((value) => value + 1)}>Làm mới</Button>}
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

    {error && <Alert type="error" showIcon message="Không tải được báo cáo" description={error} action={<Button size="small" onClick={() => setNonce((value) => value + 1)}>Thử lại</Button>} />}
    {!error && !data && <Skeleton active paragraph={{ rows: 8 }} />}
    {!error && data && <div style={{ opacity: loading ? 0.65 : 1 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}><StatCard label="Doanh thu đã thu" value={formatVnd(data.summary.revenue)} hint={`${formatCount(data.summary.invoiceCount)} hoá đơn đã trả`} icon={<Banknote size={18} />} emphasis /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard label="MRR" value={formatVnd(data.summary.mrr)} hint="tổng giá tháng của doanh nghiệp trả phí" icon={<TrendingUp size={18} />} /></Col>
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
            <RevenueBars rows={data.series} />
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="Doanh thu theo gói" style={{ borderRadius: 14, height: "100%" }}>
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

function RevenueBars({ rows }: { rows: PlatformRevenueReport["series"] }) {
  const max = useMemo(() => Math.max(1, ...rows.map((row) => row.revenue)), [rows]);
  if (!rows.length) return <div style={{ padding: "42px 0", textAlign: "center", color: palette.textMuted }}>Chưa có phí thuê bao đã thu trong kỳ.</div>;
  return <div role="img" aria-label="Biểu đồ doanh thu thuê bao theo thời gian" style={{ display: "grid", gap: 10 }}>
    {rows.map((row) => <div key={row.period} style={{ display: "grid", gridTemplateColumns: "82px minmax(120px, 1fr) 110px", gap: 10, alignItems: "center", fontSize: 12.5 }}>
      <span style={{ color: palette.textMuted }}>{row.period}</span>
      <div style={{ height: 12, borderRadius: 999, background: palette.paperSubtle, overflow: "hidden" }} title={`${row.period}: ${formatVnd(row.revenue)}`}>
        <div style={{ width: `${Math.max(2, row.revenue / max * 100)}%`, height: "100%", background: palette.brandPrimary, borderRadius: 999 }} />
      </div>
      <span style={{ textAlign: "right", fontWeight: 600 }}>{formatVndCompact(row.revenue)}</span>
    </div>)}
  </div>;
}
