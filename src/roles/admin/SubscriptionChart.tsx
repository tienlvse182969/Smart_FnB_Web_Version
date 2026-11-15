import dayjs from "dayjs"
import { useCallback } from "react"
import { Alert, Button, Card, Skeleton } from "antd"
import ReportChart from "../../components/ReportChart"
import { useReportSection } from "../../components/useReportSection"
import { adminAnalyticsApi } from "../../api/adminAnalytics"
import {
  formatVnd,
  formatVndCompact,
  presetRange,
} from "../../lib/reportFormat"
import type { PlatformRevenueReport } from "../../types"

export function subscriptionPoints(data: PlatformRevenueReport) {
  const { from, to, groupBy } = data.range
  const localDay = (value: string) =>
    value.length === 10
      ? dayjs(value)
      : dayjs(dayjs(value).tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD"))
  const rows = new Map(data.series.map((r) => [r.period, r]))
  const pattern = { day: "YYYY-MM-DD", month: "YYYY-MM", year: "YYYY" }[groupBy]
  const points = []
  for (
    let at = localDay(from).startOf(groupBy);
    !at.isAfter(localDay(to), groupBy);
    at = at.add(1, groupBy)
  ) {
    const key = at.format(pattern)
    const row = rows.get(key)
    points.push({
      key,
      label: groupBy === "day" ? at.format("DD/MM") : key,
      value: row?.revenue ?? 0,
      detail:
        key +
        " · " +
        formatVnd(row?.revenue ?? 0) +
        " · " +
        (row?.invoiceCount ?? 0) +
        " hóa đơn",
    })
  }
  return points
}

export default function SubscriptionTrend() {
  const report = useReportSection(
    useCallback(
      () =>
        adminAnalyticsApi.revenue({ ...presetRange("30d"), groupBy: "day" }),
      [],
    ),
  )
  return (
    <Card
      title="Tiền thuê bao thực thu · 30 ngày gần nhất"
      style={{ marginTop: 16 }}
    >
      {report.error ? (
        <Alert
          type="error"
          message={report.error}
          action={<Button onClick={report.reload}>Thử lại</Button>}
        />
      ) : report.data ? (
        <ReportChart
          title="Tiền thuê bao thực thu"
          mode="bar"
          points={subscriptionPoints(report.data)}
          format={formatVndCompact}
        />
      ) : (
        <Skeleton active />
      )}
    </Card>
  )
}
