/** Điểm của biểu đồ thực thu (màn Doanh thu nền tảng, PA-06): lấp đủ các mốc trống theo giờ Việt Nam. */
import dayjs from "dayjs"
import { formatVnd } from "../../lib/reportFormat"
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
    // Nhãn trục gọn, tiêu đề hộp số liệu đầy đủ, đều theo kiểu Việt Nam (không hiện ngày dạng máy "2026-11-02").
    const label = groupBy === "day" ? at.format("DD/MM") : groupBy === "month" ? at.format("MM/YYYY") : at.format("YYYY")
    const heading = groupBy === "day" ? at.format("DD/MM/YYYY") : groupBy === "month" ? `Tháng ${at.format("MM/YYYY")}` : `Năm ${at.format("YYYY")}`
    points.push({
      key,
      label,
      value: row?.revenue ?? 0,
      detail: heading + " · " + formatVnd(row?.revenue ?? 0) + " · " + (row?.invoiceCount ?? 0) + " hoá đơn",
    })
  }
  return points
}
