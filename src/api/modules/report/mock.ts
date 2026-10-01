/**
 * Bản mock của module report: tính từ đơn mock theo BR-50 (đơn đã thanh toán cộng vào ngày bán, đơn bị huỷ sau
 * khi thanh toán bị trừ vào ngày huỷ). Cùng shape với bản real — số tiền là chuỗi thập phân.
 */
import type {
  ApiBranch,
  CustomerTraffic,
  ReportBranchRef,
  ReportGranularity,
  ReportRange,
  ReportRangeParams,
  RevenueComparison,
  RevenuePoint,
  RevenueTimeseries,
  TopItemRow,
  TopItems,
} from "../../../types";
import { mockDelay } from "../../mock/control";
import { revenueEvents } from "../../mock/data/orders";
import { getBranchOrders } from "../../mock/store";
import { branchApi } from "../branch";
import type { ReportApi } from "./index";

const DAY_MS = 86_400_000;
const TIMEZONE = "Asia/Ho_Chi_Minh";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const money = (n: number) => `${Math.round(n)}.00`;

function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function bucketOf(date: Date, granularity: ReportGranularity): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (granularity === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (granularity === "month") d.setDate(1);
  return ymd(d);
}

interface Scope {
  range: ReportRange;
  from: Date;
  toExclusive: Date;
  branches: ApiBranch[];
}

async function resolveScope(params: ReportRangeParams): Promise<Scope> {
  const all = await branchApi.listBranches(params.chainId);
  const branches = params.branchIds?.length ? all.filter((b) => params.branchIds!.includes(b.id)) : all;
  const today = new Date();
  const to = params.to ? parseDay(params.to) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const from = params.from ? parseDay(params.from) : new Date(to.getTime() - 29 * DAY_MS);
  return {
    range: { from: ymd(from), to: ymd(to), timezone: TIMEZONE, branchCount: branches.length },
    from,
    toExclusive: new Date(to.getTime() + DAY_MS),
    branches,
  };
}

const refOf = (b: ApiBranch): ReportBranchRef => ({
  id: b.id,
  code: b.code,
  name: b.name,
  city: b.city,
  chainId: b.chainId,
});

function eventsOf(branch: ApiBranch, scope: Scope) {
  const now = new Date();
  return getBranchOrders(branch.chainId, branch.id).flatMap((o) =>
    revenueEvents(o, now)
      .filter((e) => e.at >= scope.from && e.at < scope.toExclusive)
      .map((e) => ({ ...e, order: o })),
  );
}

export const reportMock: ReportApi = {
  async getRevenueComparison(params = {}): Promise<RevenueComparison> {
    await mockDelay();
    const scope = await resolveScope(params);
    const rows = scope.branches.map((branch) => {
      const events = eventsOf(branch, scope);
      const revenue = events.reduce((s, e) => s + e.amount, 0);
      const orderCount = events.filter((e) => e.amount > 0).length;
      return {
        branch: refOf(branch),
        revenue: money(revenue),
        discount: money(0),
        orderCount,
        averageOrderValue: money(orderCount ? revenue / orderCount : 0),
        guestCount: 0,
        sessionCount: 0,
        raw: revenue,
      };
    });
    rows.sort((a, b) => b.raw - a.raw);
    return {
      range: scope.range,
      totals: {
        revenue: money(rows.reduce((s, r) => s + r.raw, 0)),
        orderCount: rows.reduce((s, r) => s + r.orderCount, 0),
        guestCount: 0,
      },
      branches: rows.map(({ raw: _raw, ...row }) => row),
    };
  },

  async getRevenueTimeseries(params = {}): Promise<RevenueTimeseries> {
    await mockDelay();
    const granularity = params.granularity ?? "day";
    const scope = await resolveScope(params);

    const buckets: string[] = [];
    for (let t = scope.from.getTime(); t < scope.toExclusive.getTime(); t += DAY_MS) {
      const key = bucketOf(new Date(t), granularity);
      if (buckets[buckets.length - 1] !== key && !buckets.includes(key)) buckets.push(key);
    }

    const series = scope.branches.map((branch) => {
      const byBucket = new Map<string, { revenue: number; orders: number }>();
      for (const e of eventsOf(branch, scope)) {
        const key = bucketOf(e.at, granularity);
        const cur = byBucket.get(key) ?? { revenue: 0, orders: 0 };
        cur.revenue += e.amount;
        if (e.amount > 0) cur.orders += 1;
        byBucket.set(key, cur);
      }
      const points: RevenuePoint[] = buckets.map((bucket) => {
        const v = byBucket.get(bucket);
        return { bucket, revenue: money(v?.revenue ?? 0), orderCount: v?.orders ?? 0 };
      });
      return {
        branch: refOf(branch),
        points,
        total: money(points.reduce((s, p) => s + Number(p.revenue), 0)),
        orderCount: points.reduce((s, p) => s + p.orderCount, 0),
      };
    });

    return { range: scope.range, granularity, buckets, series };
  },

  async getTopItems(params = {}): Promise<TopItems> {
    await mockDelay();
    const scope = await resolveScope(params);
    const limit = Math.min(50, Math.max(1, params.limit ?? 10));
    const byItem = new Map<string, { name: string; quantity: number; revenue: number; lines: number }>();
    const now = new Date();
    for (const branch of scope.branches) {
      for (const order of getBranchOrders(branch.chainId, branch.id)) {
        // Chỉ đơn còn hiệu lực đã thanh toán, bán trong kỳ.
        if (order.paymentStatus !== "paid" || order.status === "cancelled") continue;
        const soldAt = new Date(order.createdAt);
        if (soldAt < scope.from || soldAt >= scope.toExclusive || soldAt > now) continue;
        for (const line of order.lines) {
          const cur = byItem.get(line.menuItemId) ?? { name: line.name, quantity: 0, revenue: 0, lines: 0 };
          cur.quantity += line.quantity;
          cur.revenue += line.lineTotal;
          cur.lines += 1;
          byItem.set(line.menuItemId, cur);
        }
      }
    }
    const items: TopItemRow[] = [...byItem.entries()]
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, limit)
      .map(([id, v], i) => ({
        rank: i + 1,
        menuItem: { id, name: v.name },
        quantity: v.quantity,
        revenue: money(v.revenue),
        orderLineCount: v.lines,
      }));
    return { range: scope.range, items };
  },

  async getCustomerTraffic(params = {}): Promise<CustomerTraffic> {
    await mockDelay();
    const scope = await resolveScope(params);
    return {
      range: scope.range,
      totals: { guestCount: 0, sessionCount: 0 },
      branches: scope.branches.map((b) => ({ branch: refOf(b), guestCount: 0, sessionCount: 0, averageGuestsPerSession: 0 })),
    };
  },
};
