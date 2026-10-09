/**
 * Mock của module managerReport: dựng báo cáo BM-03 từ cùng bộ đơn giả lập của báo cáo Owner/AI (`getBranchOrders`), theo ĐÚNG quy tắc
 * của BE `manager-reports.service.ts`: doanh thu = đơn đã trả và chưa huỷ, tính theo ngày/giờ Việt Nam; theo giờ đếm mọi đơn đặt trong
 * kỳ; đơn huỷ kèm lý do (xem đơn huỷ trước khi trả và sau khi trả). Có ngày không có đơn (bucket 0), nhiều lý do huỷ, topping.
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { ManagerReport, ManagerReportGranularity, ManagerReportQuery, Order } from "../../../types";
import { VN_TIMEZONE } from "../../../lib/reportFormat";
import { mockDelay } from "../../mock/control";
import { hashString } from "../../mock/prng";
import { getBranchOrders } from "../../mock/store";
import { mockOrderCode } from "../order/mock";
import type { ManagerReportApi } from "./index";

dayjs.extend(utc);
dayjs.extend(timezone);

const vnDay = (iso: string) => dayjs(iso).tz(VN_TIMEZONE).format("YYYY-MM-DD");
const vnHour = (iso: string) => dayjs(iso).tz(VN_TIMEZONE).hour();

/** Đầu kỳ của một ngày: chính ngày đó, thứ Hai của tuần, hoặc mùng 1 của tháng (như `date_trunc` của BE). */
function bucketStart(day: string, granularity: ManagerReportGranularity): string {
  const d = dayjs(day);
  if (granularity === "day") return day;
  if (granularity === "month") return d.startOf("month").format("YYYY-MM-DD");
  const offset = (d.day() + 6) % 7; // 0 = thứ Hai
  return d.subtract(offset, "day").format("YYYY-MM-DD");
}

function bucketsBetween(from: string, to: string, granularity: ManagerReportGranularity): string[] {
  const out: string[] = [];
  let cursor = bucketStart(from, granularity);
  const last = bucketStart(to, granularity);
  while (cursor <= last) {
    out.push(cursor);
    const d = dayjs(cursor);
    cursor = (granularity === "day" ? d.add(1, "day") : granularity === "week" ? d.add(7, "day") : d.add(1, "month")).format("YYYY-MM-DD");
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isToppingGroup = (name: string) => /topping/i.test(name);

function build(orders: Order[], branchId: string, query: ManagerReportQuery): ManagerReport {
  const inRange = orders.filter((o) => {
    const day = vnDay(o.createdAt);
    return day >= query.from && day <= query.to;
  });
  const sales = inRange.filter((o) => (o.paymentStatus === "paid" || o.refund !== undefined) && o.status !== "cancelled");
  const revenue = sales.reduce((s, o) => s + o.total, 0);

  const byBucket = new Map<string, { revenue: number; orderCount: number }>();
  for (const o of sales) {
    const key = bucketStart(vnDay(o.createdAt), query.granularity);
    const row = byBucket.get(key) ?? { revenue: 0, orderCount: 0 };
    row.revenue += o.total;
    row.orderCount += 1;
    byBucket.set(key, row);
  }

  const byMethod = new Map<string, { settled: number; count: number }>();
  for (const o of sales) {
    const method = o.paymentMethod === "cash" ? "CASH" : "BANK_TRANSFER";
    const row = byMethod.get(method) ?? { settled: 0, count: 0 };
    row.settled += o.total;
    row.count += 1;
    byMethod.set(method, row);
  }

  const items = new Map<string, { menuItemId: string; name: string; quantity: number; lineRevenue: number }>();
  const toppings = new Map<string, { optionId: string; name: string; quantity: number; additionalRevenue: number }>();
  for (const o of sales) {
    for (const line of o.lines) {
      if (line.status === "cancelled") continue;
      const it = items.get(line.menuItemId) ?? { menuItemId: line.menuItemId, name: line.name, quantity: 0, lineRevenue: 0 };
      it.quantity += line.quantity;
      it.lineRevenue += line.lineTotal;
      items.set(line.menuItemId, it);
      for (const opt of line.options) {
        if (!isToppingGroup(opt.groupName)) continue;
        const key = opt.optionName;
        const tp = toppings.get(key) ?? { optionId: key, name: opt.optionName, quantity: 0, additionalRevenue: 0 };
        tp.quantity += line.quantity;
        tp.additionalRevenue += opt.priceDelta * line.quantity;
        toppings.set(key, tp);
      }
    }
  }
  const top = <T extends { quantity: number; name: string }>(map: Map<string, T>) => [...map.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)).slice(0, query.limit);

  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orderCount: 0 }));
  for (const o of inRange) hours[vnHour(o.createdAt)].orderCount += 1;

  const doneUnits = sales.reduce((s, o) => s + o.lines.filter((l) => l.status === "done").reduce((a, l) => a + l.quantity, 0), 0);
  const cancelled = inRange.filter((o) => o.status === "cancelled").sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    branchName: "Chi nhánh (mock)",
    timezone: VN_TIMEZONE,
    range: { from: query.from, to: query.to, granularity: query.granularity },
    summary: { revenue, orderCount: sales.length, averageOrderValue: sales.length ? round2(revenue / sales.length) : 0 },
    revenue: bucketsBetween(query.from, query.to, query.granularity).map((bucket) => ({ bucket, revenue: byBucket.get(bucket)?.revenue ?? 0, orderCount: byBucket.get(bucket)?.orderCount ?? 0 })),
    payments: [...byMethod.entries()].map(([method, v]) => ({ method, settledAmount: v.settled, receivedAmount: v.settled, paymentCount: v.count })).sort((a, b) => a.method.localeCompare(b.method)),
    topItems: top(items),
    topToppings: top(toppings),
    ordersByHour: hours,
    // Mock: thời gian pha cố định theo chi nhánh (1:30–2:29) khi có suất xong; null khi kỳ không có suất nào.
    preparation: { averageSeconds: doneUnits > 0 ? 90 + (hashString(branchId) % 60) : null, completedUnits: doneUnits },
    cancellations: {
      total: cancelled.length,
      limit: query.limit,
      items: cancelled.slice(0, query.limit).map((o) => ({ id: o.id, orderCode: mockOrderCode(o.id), callNumber: o.callNumber, totalAmount: o.total, cancelledAt: o.createdAt, reason: o.cancelReason ?? null })),
    },
  };
}

export const managerReportMock: ManagerReportApi = {
  async getReport({ chainId, branchId }, query) {
    await mockDelay();
    return build(getBranchOrders(chainId, branchId), branchId, query);
  },
};
