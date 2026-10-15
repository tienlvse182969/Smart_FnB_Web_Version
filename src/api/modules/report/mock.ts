/**
 * Bản mock của module report: tính từ đơn mock theo BR-50 (đơn đã thanh toán cộng vào ngày bán, đơn bị huỷ sau
 * khi thanh toán bị trừ vào ngày huỷ). Cùng shape với bản real — số tiền là chuỗi thập phân.
 */
import type {
  ChainRefundPage,
  ChainRefundRow,
  OrderQuery,
  PaymentMethodRow,
  PaymentMethodsReport,
  TopToppingRow,
  TopToppings,
  ApiBranch,
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
import { orderMock } from "../order/mock";
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
      const gross = events.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
      const refund = events.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0);
      const orderCount = events.filter((e) => e.amount > 0).length;
      return {
        branch: refOf(branch),
        revenue: money(revenue),
        grossRevenue: money(gross),
        refundAmount: money(refund),
        pendingRefundAmount: money(0),
        netRevenue: money(revenue),
        paidCancellationCount: events.filter((e) => e.amount < 0).length,
        discount: money(0),
        orderCount,
        averageOrderValue: money(orderCount ? revenue / orderCount : 0),
        raw: revenue,
      };
    });
    rows.sort((a, b) => b.raw - a.raw);
    const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + pick(r), 0);
    return {
      range: scope.range,
      totals: {
        revenue: money(sum((r) => r.raw)),
        grossRevenue: money(sum((r) => Number(r.grossRevenue))),
        refundAmount: money(sum((r) => Number(r.refundAmount))),
        pendingRefundAmount: money(0),
        netRevenue: money(sum((r) => r.raw)),
        paidCancellationCount: sum((r) => r.paidCancellationCount),
        orderCount: sum((r) => r.orderCount),
        averageOrderValue: money(sum((r) => r.orderCount) ? sum((r) => r.raw) / sum((r) => r.orderCount) : 0),
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
      const byBucket = new Map<string, { gross: number; refund: number; orders: number }>();
      for (const e of eventsOf(branch, scope)) {
        const key = bucketOf(e.at, granularity);
        const cur = byBucket.get(key) ?? { gross: 0, refund: 0, orders: 0 };
        if (e.amount > 0) {
          cur.gross += e.amount;
          cur.orders += 1;
        } else {
          cur.refund -= e.amount;
        }
        byBucket.set(key, cur);
      }
      const points: RevenuePoint[] = buckets.map((bucket) => {
        const v = byBucket.get(bucket);
        const net = (v?.gross ?? 0) - (v?.refund ?? 0);
        return {
          bucket,
          revenue: money(net),
          grossRevenue: money(v?.gross ?? 0),
          refundAmount: money(v?.refund ?? 0),
          netRevenue: money(net),
          orderCount: v?.orders ?? 0,
        };
      });
      const sumOf = (pick: (p: RevenuePoint) => string) => money(points.reduce((s, p) => s + Number(pick(p)), 0));
      return {
        branch: refOf(branch),
        points,
        total: sumOf((p) => p.revenue),
        grossTotal: sumOf((p) => p.grossRevenue),
        refundTotal: sumOf((p) => p.refundAmount),
        netTotal: sumOf((p) => p.netRevenue),
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

  /** Mock không có hình thức thanh toán thật theo đơn: chia cố định theo chẵn lẻ mã đơn để tổng vẫn khớp doanh thu. */
  async getPaymentMethods(params = {}): Promise<PaymentMethodsReport> {
    await mockDelay();
    const scope = await resolveScope(params);
    const methodOf = (orderId: string) => (orderId.charCodeAt(orderId.length - 1) % 2 === 0 ? "CASH" : "BANK_TRANSFER");
    const build = (branch: ApiBranch) => {
      const byMethod = new Map<string, PaymentMethodRow>();
      for (const e of eventsOf(branch, scope)) {
        const method = methodOf(e.orderId);
        const cur =
          byMethod.get(method) ??
          { method, grossSettledAmount: "0", grossReceivedAmount: "0", refundAmount: "0", netAmount: "0", receivedAmount: "0", paymentCount: 0, cancelledAfterPaymentCount: 0 };
        if (e.amount > 0) {
          cur.grossSettledAmount = money(Number(cur.grossSettledAmount) + e.amount);
          cur.grossReceivedAmount = cur.grossSettledAmount;
          cur.paymentCount += 1;
        } else {
          cur.refundAmount = money(Number(cur.refundAmount) - e.amount);
          cur.cancelledAfterPaymentCount += 1;
        }
        cur.netAmount = money(Number(cur.grossSettledAmount) - Number(cur.refundAmount));
        cur.receivedAmount = cur.netAmount;
        byMethod.set(method, cur);
      }
      return [...byMethod.values()];
    };
    const perBranch = scope.branches.map((b) => ({ branch: refOf(b), methods: build(b) }));
    const total = new Map<string, PaymentMethodRow>();
    for (const { methods } of perBranch) {
      for (const m of methods) {
        const cur = total.get(m.method) ?? { ...m, grossSettledAmount: "0", grossReceivedAmount: "0", refundAmount: "0", netAmount: "0", receivedAmount: "0", paymentCount: 0, cancelledAfterPaymentCount: 0 };
        for (const k of ["grossSettledAmount", "grossReceivedAmount", "refundAmount", "netAmount", "receivedAmount"] as const) {
          cur[k] = money(Number(cur[k]) + Number(m[k]));
        }
        cur.paymentCount += m.paymentCount;
        cur.cancelledAfterPaymentCount += m.cancelledAfterPaymentCount;
        total.set(m.method, cur);
      }
    }
    return { range: scope.range, methods: [...total.values()], branches: perBranch };
  },

  async getTopToppings(params = {}): Promise<TopToppings> {
    await mockDelay();
    const scope = await resolveScope(params);
    const limit = Math.min(50, Math.max(1, params.limit ?? 10));
    const byTopping = new Map<string, { name: string; quantity: number; revenue: number }>();
    const now = new Date();
    for (const branch of scope.branches) {
      for (const order of getBranchOrders(branch.chainId, branch.id)) {
        if (order.paymentStatus !== "paid" || order.status === "cancelled") continue;
        const soldAt = new Date(order.createdAt);
        if (soldAt < scope.from || soldAt >= scope.toExclusive || soldAt > now) continue;
        for (const line of order.lines) {
          for (const opt of line.options) {
            if (!/topping/i.test(opt.groupName ?? "")) continue;
            const cur = byTopping.get(opt.optionName) ?? { name: opt.optionName, quantity: 0, revenue: 0 };
            cur.quantity += line.quantity;
            cur.revenue += line.quantity * opt.priceDelta;
            byTopping.set(opt.optionName, cur);
          }
        }
      }
    }
    const items: TopToppingRow[] = [...byTopping.entries()]
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, limit)
      .map(([id, v], i) => ({ rank: i + 1, optionId: id, name: v.name, quantity: v.quantity, additionalRevenue: money(v.revenue) }));
    return { range: scope.range, items };
  },

  async listPendingRefunds(params = {}): Promise<ChainRefundPage> {
    await mockDelay();
    const scope = await resolveScope(params);
    const rows: ChainRefundRow[] = [];
    for (const branch of scope.branches) {
      const page = await orderMock.listOrders({ chainId: branch.chainId, branchId: branch.id }, { refundStatus: "PENDING", page: 1, limit: 100 } as OrderQuery);
      for (const order of page.items) {
        for (const refund of order.refunds) {
          if (refund.status !== "PENDING") continue;
          if (params.from && refund.requestedAt && refund.requestedAt < params.from) continue;
          if (params.to && refund.requestedAt && refund.requestedAt > params.to) continue;
          rows.push({
            id: refund.id,
            orderId: order.id,
            orderCode: order.orderCode,
            callNumber: order.callNumber,
            branchId: branch.id,
            branchName: branch.name,
            amount: refund.amount,
            reason: refund.reason,
            requestedByRole: refund.requestedByRole,
            requestedAt: refund.requestedAt,
            method: refund.method,
            source: refund.source,
          });
        }
      }
    }
    rows.sort((a, b) => (b.requestedAt ?? "").localeCompare(a.requestedAt ?? ""));
    return { items: rows, total: rows.length, page: 1, limit: rows.length };
  },
};
