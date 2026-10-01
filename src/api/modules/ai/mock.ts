/**
 * Bản mock của module ai — trợ lý số liệu (OW-09, đặc tả v9 mục 9).
 *
 * CHƯA có backend/mô hình AI thật — đây là bản mock so khớp câu hỏi với một bộ mẫu (từ khoá + khoảng thời gian)
 * rồi CHẠY THẬT trên đơn mock (`mock/store`), không viết cứng con số nào (BR-39). Cùng interface với bản real
 * sẽ viết sau (BR-37: mọi lời gọi mô hình đi qua backend) nên UI không phải sửa.
 *
 * Mô phỏng các ràng buộc của trợ lý thật:
 * - BR-38: chỉ "đọc" từ các "view báo cáo" giả lập (readXxxView) — không trả nội dung đơn chi tiết, không tự chọn
 *   doanh nghiệp.
 * - BR-01/BR-37: mọi hàm nhận `chainId` của người hỏi và luôn tự lọc theo đó.
 * - BR-39: mọi con số trong `narrative`/`table` lấy trực tiếp từ kết quả tính.
 * - BR-40: giới hạn số dòng trả về, lưu lại câu hỏi/SQL minh hoạ/câu trả lời; chỉ gói Nâng cao dùng được.
 */
import type { AiAnswer, AiAnswerTable, AiQueryLog } from "../../../types";
import { mockDelay } from "../../mock/control";
import { revenueEvents } from "../../mock/data/orders";
import { assertMockFeature } from "../../mock/guards";
import { getBranchOrders, getChainState } from "../../mock/store";
import { newId, nowISO } from "../../mock/util";
import { branchApi } from "../branch";
import type { AiApi } from "./index";

const MAX_ROWS = 20;

/* ============================================================ */
/* Thời gian: phân giải khoảng ngày từ câu hỏi tiếng Việt         */
/* ============================================================ */

type Period = { label: string; start: Date; end: Date };

const WEEKDAY_NAMES: Record<string, number> = {
  "chủ nhật": 0,
  "thứ hai": 1,
  "thứ ba": 2,
  "thứ tư": 3,
  "thứ năm": 4,
  "thứ sáu": 5,
  "thứ bảy": 6,
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(d, diff));
}
function fmt(d: Date): string {
  return d.toLocaleDateString("vi-VN");
}

/** Phân giải cụm từ chỉ thời gian trong câu hỏi. Trả về null nếu không nhận ra. */
function resolvePeriod(question: string, now: Date): Period | null {
  const q = question.toLowerCase();

  if (/\bhôm nay\b/.test(q)) {
    return { label: `Hôm nay (${fmt(now)})`, start: startOfDay(now), end: endOfDay(now) };
  }
  if (/\bhôm qua\b/.test(q)) {
    const y = addDays(now, -1);
    return { label: `Hôm qua (${fmt(y)})`, start: startOfDay(y), end: endOfDay(y) };
  }
  if (/\btuần này\b/.test(q)) {
    const start = mondayOf(now);
    const end = endOfDay(addDays(start, 6));
    return { label: `Tuần này (${fmt(start)}–${fmt(end)})`, start, end };
  }
  if (/\btuần trước\b/.test(q)) {
    const start = addDays(mondayOf(now), -7);
    const end = endOfDay(addDays(start, 6));
    return { label: `Tuần trước (${fmt(start)}–${fmt(end)})`, start, end };
  }
  if (/\btháng này\b/.test(q)) {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { label: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`, start, end };
  }
  if (/\btháng trước\b/.test(q)) {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    return { label: `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`, start, end };
  }

  // "thứ bảy vừa rồi", "chủ nhật vừa rồi" — lần gần nhất TRƯỚC hôm nay (không tính hôm nay).
  for (const [name, weekday] of Object.entries(WEEKDAY_NAMES)) {
    if (q.includes(name)) {
      let diff = (now.getDay() - weekday + 7) % 7;
      if (diff === 0) diff = 7;
      const day = addDays(now, -diff);
      return { label: `${name.charAt(0).toUpperCase()}${name.slice(1)} vừa rồi (${fmt(day)})`, start: startOfDay(day), end: endOfDay(day) };
    }
  }

  return null;
}

/* ============================================================ */
/* "View báo cáo" giả lập — chỉ đọc, tự lọc theo chainId (BR-38) */
/* ============================================================ */

type RevenueRow = { branchId: string; amount: number };
type OrderLineSalesRow = { branchId: string; menuItemId: string; name: string; qty: number };
type OrderCountRow = { branchId: string; orders: number; cancelled: number };

interface ViewContext {
  chainId: string;
  branchNames: Map<string, string>;
  branchIds: string[];
}

async function viewContext(chainId: string): Promise<ViewContext> {
  const branches = await branchApi.listBranches(chainId);
  return {
    chainId,
    branchIds: branches.map((b) => b.id),
    branchNames: new Map(branches.map((b) => [b.id, b.name])),
  };
}

const inPeriod = (iso: Date, period: Period) => iso.getTime() >= period.start.getTime() && iso.getTime() <= period.end.getTime();

/** Doanh thu theo chi nhánh — đơn đã thanh toán cộng vào ngày bán, đơn huỷ sau thanh toán trừ vào ngày huỷ (BR-50). */
function readBranchRevenueView(ctx: ViewContext, period: Period, now: Date): RevenueRow[] {
  return ctx.branchIds.map((branchId) => ({
    branchId,
    amount: getBranchOrders(ctx.chainId, branchId)
      .flatMap((o) => revenueEvents(o, now))
      .filter((e) => inPeriod(e.at, period))
      .reduce((sum, e) => sum + e.amount, 0),
  }));
}

/** Dòng món của đơn còn hiệu lực đã thanh toán. */
function readOrderLineSalesView(ctx: ViewContext, period: Period): OrderLineSalesRow[] {
  const rows: OrderLineSalesRow[] = [];
  for (const branchId of ctx.branchIds) {
    for (const order of getBranchOrders(ctx.chainId, branchId)) {
      if (order.paymentStatus !== "paid" || order.status === "cancelled") continue;
      if (!inPeriod(new Date(order.createdAt), period)) continue;
      for (const line of order.lines) {
        rows.push({ branchId, menuItemId: line.menuItemId, name: line.name, qty: line.quantity });
      }
    }
  }
  return rows;
}

/** Số đơn (đã thanh toán) và số đơn bị huỷ theo chi nhánh. */
function readOrderCountView(ctx: ViewContext, period: Period): OrderCountRow[] {
  return ctx.branchIds.map((branchId) => {
    const orders = getBranchOrders(ctx.chainId, branchId).filter((o) => inPeriod(new Date(o.createdAt), period));
    return {
      branchId,
      orders: orders.filter((o) => o.paymentStatus === "paid").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };
  });
}

/* ============================================================ */
/* Từ chối theo phạm vi (đặc tả mục 9.5, 16: ngoài phạm vi)          */
/* ============================================================ */

const OUT_OF_SCOPE: { pattern: RegExp; reason: string }[] = [
  { pattern: /lợi nhuận|lãi\b|lỗ\b/i, reason: "Hệ thống không quản lý kho và không tính lương nên không có dữ liệu chi phí — không tính được lợi nhuận." },
  { pattern: /tồn kho|nguyên liệu|nhập hàng/i, reason: "Hệ thống không quản lý tồn kho nguyên liệu." },
  { pattern: /lương|chấm công|tính công|payroll/i, reason: "Hệ thống không quản lý ca làm hay tính lương." },
  { pattern: /doanh nghiệp khác|tenant khác|chi nhánh của (người khác|hãng khác)/i, reason: "Trợ lý chỉ trả lời trên dữ liệu của đúng doanh nghiệp bạn đang đăng nhập." },
];

/* ============================================================ */
/* Hàm chính                                                     */
/* ============================================================ */

async function askAssistant(chainId: string, query: string): Promise<AiAnswer> {
  await mockDelay();
  assertMockFeature("aiAssistant");
  const ctx = await viewContext(chainId);
  const now = new Date();
  const id = `AI-${newId()}`;
  const q = query.trim();

  for (const rule of OUT_OF_SCOPE) {
    if (rule.pattern.test(q)) {
      return { id, query: q, periodLabel: "—", viewName: "—", sql: "-- Từ chối, không chạy truy vấn", narrative: `Trợ lý chưa trả lời được câu này: ${rule.reason}`, table: null, refused: true };
    }
  }

  const period = resolvePeriod(q, now) ?? { label: "Không xác định khoảng thời gian — dùng toàn bộ dữ liệu hiện có", start: new Date(0), end: now };

  const nameOf = (id: string) => ctx.branchNames.get(id) ?? id;

  const isRevenueQuestion = /doanh thu/i.test(q);
  const isTopItemQuestion = /(top|bán chạy)/i.test(q);
  const isOrderCountQuestion = /(số đơn|bao nhiêu đơn|lượng đơn)/i.test(q);

  if (isRevenueQuestion) {
    const rows = readBranchRevenueView(ctx, period, now);
    const byBranch = new Map<string, number>();
    for (const p of rows) byBranch.set(p.branchId, (byBranch.get(p.branchId) ?? 0) + p.amount);
    const sorted = [...byBranch.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_ROWS);

    const table: AiAnswerTable = { columns: ["Chi nhánh", "Doanh thu"], rows: sorted.map(([bId, amount]) => [nameOf(bId), amount.toLocaleString("vi-VN") + "đ"]) };
    const narrative =
      sorted.length === 0
        ? `Không có giao dịch nào đã xác nhận trong khoảng ${period.label}.`
        : `Trong khoảng ${period.label}, chi nhánh doanh thu cao nhất là "${nameOf(sorted[0][0])}" với ${sorted[0][1].toLocaleString("vi-VN")}đ` +
          (sorted.length > 1 ? `, tiếp theo là "${nameOf(sorted[1][0])}" với ${sorted[1][1].toLocaleString("vi-VN")}đ.` : ".");

    return {
      id,
      query: q,
      periodLabel: period.label,
      viewName: "vw_branch_revenue_daily",
      sql: `SELECT branch_id, SUM(amount) AS revenue\nFROM vw_branch_revenue_daily\nWHERE chain_id = '${chainId}'\n  AND confirmed_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'\nGROUP BY branch_id\nORDER BY revenue DESC;`,
      narrative,
      table,
    };
  }

  if (isTopItemQuestion) {
    const topMatch = q.match(/top\s*(\d+)/i);
    const limit = topMatch ? Math.min(MAX_ROWS, Number(topMatch[1])) : 5;

    const lines = readOrderLineSalesView(ctx, period);
    const byItem = new Map<string, { name: string; qty: number }>();
    for (const l of lines) {
      const cur = byItem.get(l.menuItemId) ?? { name: l.name, qty: 0 };
      cur.qty += l.qty;
      byItem.set(l.menuItemId, cur);
    }
    const sorted = [...byItem.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);

    const table: AiAnswerTable = { columns: ["Món", "Số lượng đã bán"], rows: sorted.map((x) => [x.name, x.qty]) };
    const narrative =
      sorted.length === 0
        ? `Không có món nào được gọi trong khoảng ${period.label}.`
        : `Top ${sorted.length} món bán chạy trong khoảng ${period.label}: ${sorted.map((x, i) => `${i + 1}. ${x.name} (${x.qty} phần)`).join(", ")}.`;

    return {
      id,
      query: q,
      periodLabel: period.label,
      viewName: "vw_order_line_sales",
      sql: `SELECT menu_item_name, SUM(qty) AS sold_qty\nFROM vw_order_line_sales\nWHERE chain_id = '${chainId}'\n  AND order_created_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'\nGROUP BY menu_item_name\nORDER BY sold_qty DESC\nLIMIT ${limit};`,
      narrative,
      table,
    };
  }

  if (isOrderCountQuestion) {
    const rows = readOrderCountView(ctx, period)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, MAX_ROWS);

    const table: AiAnswerTable = {
      columns: ["Chi nhánh", "Số đơn đã thanh toán", "Số đơn đã huỷ"],
      rows: rows.map((r) => [nameOf(r.branchId), r.orders, r.cancelled]),
    };
    const narrative =
      rows.every((r) => r.orders === 0 && r.cancelled === 0)
        ? `Không có đơn nào trong khoảng ${period.label}.`
        : `Trong khoảng ${period.label}: ${rows.map((r) => `"${nameOf(r.branchId)}" có ${r.orders} đơn (huỷ ${r.cancelled})`).join("; ")}.`;

    return {
      id,
      query: q,
      periodLabel: period.label,
      viewName: "vw_orders_daily",
      sql: `SELECT branch_id, COUNT(*) FILTER (WHERE payment_status = 'PAID') AS paid_orders,\n       COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders\nFROM vw_orders_daily\nWHERE chain_id = '${chainId}'\n  AND created_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'\nGROUP BY branch_id\nORDER BY paid_orders DESC;`,
      narrative,
      table,
    };
  }

  return {
    id,
    query: q,
    periodLabel: "—",
    viewName: "—",
    sql: "-- Không khớp mẫu câu hỏi nào, chưa chạy truy vấn",
    narrative: 'Chưa trả lời được câu này. Hãy hỏi về "doanh thu theo chi nhánh", "món bán chạy" hoặc "số đơn", kèm khoảng thời gian như hôm nay/tuần trước/tháng này.',
    table: null,
    unmatched: true,
  };
}

/** Ghi lịch sử hỏi đáp (BR-40) — gọi sau khi có `AiAnswer` để log đúng những gì đã trả lời. */
async function logAiQuery(chainId: string, userId: string, answer: AiAnswer, latencyMs: number): Promise<AiQueryLog> {
  await mockDelay();
  const log: AiQueryLog = {
    id: `LOG-${newId()}`,
    tenantId: chainId,
    userId,
    query: answer.query,
    response: answer.narrative,
    payloadJson: JSON.stringify(answer),
    latencyMs,
    createdAt: nowISO(),
  };
  getChainState(chainId).aiLogs.unshift(log);
  return log;
}

/** Lịch sử hỏi đáp của doanh nghiệp — hiện ở thanh bên. */
async function listAiQueryLogs(chainId: string): Promise<AiQueryLog[]> {
  await mockDelay();
  return [...getChainState(chainId).aiLogs];
}

export const aiMock: AiApi = {
  ask: (chainId, _userId, query) => askAssistant(chainId, query),
  logQuery: logAiQuery,
  listLogs: listAiQueryLogs,
};
