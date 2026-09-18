/**
 * Trợ lý số liệu (OW-14, đặc tả v7 mục 9 và 6.7).
 *
 * CHƯA có backend/mô hình AI thật — đây là bản mock so khớp câu hỏi với một
 * bộ mẫu (từ khoá + khoảng thời gian) rồi CHẠY THẬT trên dữ liệu mock
 * (`mock/db.ts`), không viết cứng con số nào (BR-50). Viết dưới dạng service
 * async với input/output cố định để sau này thay ruột bằng lời gọi API thật
 * (BR-27: mọi lời gọi mô hình đi qua backend) mà KHÔNG phải sửa UI.
 *
 * Mô phỏng các ràng buộc của trợ lý thật:
 * - BR-49: chỉ "đọc" từ các "view báo cáo" giả lập (readXxxView) — không bao
 *   giờ trả về nội dung đơn hàng chi tiết, không tự chọn tenant.
 * - Mọi hàm nhận `tenantId` của người hỏi và luôn tự lọc theo đó — không có
 *   đường nào đi qua tenant khác.
 * - BR-50: mọi con số trong `narrative`/`table` lấy trực tiếp từ kết quả tính.
 * - BR-51: giới hạn số dòng trả về, lưu lại câu hỏi/SQL minh hoạ/câu trả lời.
 */
import { db } from "../mock/db";
import type { AiQueryLog } from "../types";
import { delay, newId, nowISO } from "./_utils";

const MAX_ROWS = 20;

export interface AiAnswerTable {
  columns: string[];
  rows: (string | number)[][];
}

export interface AiAnswer {
  id: string;
  query: string;
  /** Khoảng thời gian trợ lý đã hiểu từ câu hỏi, diễn giải cho người đọc. */
  periodLabel: string;
  /** Tên "view báo cáo" giả lập đã dùng (BR-49) — không phải bảng dữ liệu thô. */
  viewName: string;
  /** Câu SQL minh hoạ hiển thị khi bấm "Xem truy vấn" — không thực sự chạy SQL. */
  sql: string;
  /** Câu diễn giải bằng tiếng Việt — mọi số liệu nhắc tới đều lấy từ `table`. */
  narrative: string;
  table: AiAnswerTable | null;
  /** true nếu bị từ chối vì ngoài phạm vi dữ liệu cho phép (BR-21/lợi nhuận/tồn kho/lương...). */
  refused?: boolean;
  /** true nếu câu hỏi không khớp mẫu nào. */
  unmatched?: boolean;
}

/** 6 câu hỏi gợi ý sẵn trên giao diện — 3 câu mẫu theo yêu cầu + 3 câu "hôm nay" luôn có dữ liệu để demo. */
export const SAMPLE_QUESTIONS: string[] = [
  "Tuần trước chi nhánh nào doanh thu cao nhất?",
  "Top 5 món bán chạy tháng này",
  "Thứ Bảy vừa rồi có bao nhiêu lượt khách mỗi chi nhánh?",
  "Hôm nay chi nhánh nào doanh thu cao nhất?",
  "Top 5 món bán chạy hôm nay",
  "Hôm nay có bao nhiêu lượt khách mỗi chi nhánh?",
];

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

/**
 * Nhiều bản ghi mock (phiên bàn, order) dùng giờ ngắn "HH:MM" cho dữ liệu
 * "hôm nay" của bản demo thay vì ngày đầy đủ. Coi các giá trị đó là hôm nay.
 */
function parseFlexibleDate(value: string, now: Date): Date {
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(now) : d;
}

function inRange(value: string, period: Period, now: Date): boolean {
  const d = parseFlexibleDate(value, now);
  return d.getTime() >= period.start.getTime() && d.getTime() <= period.end.getTime();
}

/* ============================================================ */
/* "View báo cáo" giả lập — chỉ đọc, tự lọc theo tenantId (BR-49) */
/* ============================================================ */

function readBranchRevenueView(tenantId: string, period: Period, now: Date) {
  return db.payments.filter((p) => p.tenantId === tenantId && p.status === "confirmed" && inRange(p.createdAt, period, now));
}

function readOrderLineSalesView(tenantId: string, period: Period, now: Date) {
  const sessionsByTenant = new Map(db.tableSessions.filter((s) => s.tenantId === tenantId).map((s) => [s.id, s]));
  const ordersInPeriod = db.orders.filter((o) => o.tenantId === tenantId && sessionsByTenant.has(o.sessionId) && inRange(o.createdAt, period, now));
  const orderIds = new Set(ordersInPeriod.map((o) => o.id));
  return db.orderLines
    .filter((l) => orderIds.has(l.orderId) && l.status !== "cancelled" && l.status !== "sold_out")
    .map((l) => {
      const order = ordersInPeriod.find((o) => o.id === l.orderId)!;
      const session = sessionsByTenant.get(order.sessionId)!;
      return { ...l, branchId: session.branchId };
    });
}

function readTableSessionsView(tenantId: string, period: Period, now: Date) {
  return db.tableSessions.filter((s) => s.tenantId === tenantId && inRange(s.openedAt, period, now));
}

function branchName(branchId: string): string {
  return db.branches.find((b) => b.id === branchId)?.name ?? branchId;
}

/* ============================================================ */
/* Từ chối theo phạm vi (mục 16/17: ngoài phạm vi đồ án)          */
/* ============================================================ */

const OUT_OF_SCOPE: { pattern: RegExp; reason: string }[] = [
  { pattern: /lợi nhuận|lãi\b|lỗ\b/i, reason: "Hệ thống không quản lý kho và không tính lương nên không có dữ liệu chi phí — không tính được lợi nhuận." },
  { pattern: /tồn kho|nguyên liệu|nhập hàng/i, reason: "Hệ thống không quản lý tồn kho nguyên liệu — chỉ có số suất còn lại theo món tại từng chi nhánh." },
  { pattern: /lương|chấm công|tính công|payroll/i, reason: "Dữ liệu ca làm chỉ dùng để điều phối, không dùng để tính lương." },
  { pattern: /doanh nghiệp khác|tenant khác|chi nhánh của (người khác|hãng khác)/i, reason: "Trợ lý chỉ trả lời trên dữ liệu của đúng doanh nghiệp bạn đang đăng nhập." },
];

/* ============================================================ */
/* Hàm chính                                                     */
/* ============================================================ */

export async function askAssistant(tenantId: string, userId: string, query: string): Promise<AiAnswer> {
  await delay();
  const now = new Date();
  const id = `AI-${newId()}`;
  const q = query.trim();

  for (const rule of OUT_OF_SCOPE) {
    if (rule.pattern.test(q)) {
      return { id, query: q, periodLabel: "—", viewName: "—", sql: "-- Từ chối, không chạy truy vấn", narrative: `Trợ lý chưa trả lời được câu này: ${rule.reason}`, table: null, refused: true };
    }
  }

  const period = resolvePeriod(q, now) ?? { label: "Không xác định khoảng thời gian — dùng toàn bộ dữ liệu hiện có", start: new Date(0), end: now };

  const isRevenueQuestion = /doanh thu/i.test(q);
  const isTopItemQuestion = /(top|bán chạy)/i.test(q);
  const isGuestQuestion = /(lượt khách|khách hàng|bao nhiêu khách)/i.test(q);

  if (isRevenueQuestion) {
    const rows = readBranchRevenueView(tenantId, period, now);
    const byBranch = new Map<string, number>();
    for (const p of rows) byBranch.set(p.branchId, (byBranch.get(p.branchId) ?? 0) + p.amount);
    const sorted = [...byBranch.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_ROWS);

    const table: AiAnswerTable = { columns: ["Chi nhánh", "Doanh thu"], rows: sorted.map(([bId, amount]) => [branchName(bId), amount.toLocaleString("vi-VN") + "đ"]) };
    const narrative =
      sorted.length === 0
        ? `Không có giao dịch nào đã xác nhận trong khoảng ${period.label}.`
        : `Trong khoảng ${period.label}, chi nhánh doanh thu cao nhất là "${branchName(sorted[0][0])}" với ${sorted[0][1].toLocaleString("vi-VN")}đ` +
          (sorted.length > 1 ? `, tiếp theo là "${branchName(sorted[1][0])}" với ${sorted[1][1].toLocaleString("vi-VN")}đ.` : ".");

    return {
      id,
      query: q,
      periodLabel: period.label,
      viewName: "vw_branch_revenue_daily",
      sql: `SELECT branch_id, SUM(amount) AS revenue\nFROM vw_branch_revenue_daily\nWHERE tenant_id = '${tenantId}'\n  AND confirmed_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'\nGROUP BY branch_id\nORDER BY revenue DESC;`,
      narrative,
      table,
    };
  }

  if (isTopItemQuestion) {
    const topMatch = q.match(/top\s*(\d+)/i);
    const limit = topMatch ? Math.min(MAX_ROWS, Number(topMatch[1])) : 5;

    const lines = readOrderLineSalesView(tenantId, period, now);
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
      sql: `SELECT menu_item_name, SUM(qty) AS sold_qty\nFROM vw_order_line_sales\nWHERE tenant_id = '${tenantId}'\n  AND order_created_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'\nGROUP BY menu_item_name\nORDER BY sold_qty DESC\nLIMIT ${limit};`,
      narrative,
      table,
    };
  }

  if (isGuestQuestion) {
    const sessions = readTableSessionsView(tenantId, period, now);
    const byBranch = new Map<string, { visits: number; guests: number }>();
    for (const s of sessions) {
      const cur = byBranch.get(s.branchId) ?? { visits: 0, guests: 0 };
      cur.visits += 1;
      cur.guests += s.guests;
      byBranch.set(s.branchId, cur);
    }
    const rows = [...byBranch.entries()].sort((a, b) => b[1].visits - a[1].visits).slice(0, MAX_ROWS);

    const table: AiAnswerTable = { columns: ["Chi nhánh", "Lượt khách (phiên bàn)", "Tổng số khách"], rows: rows.map(([bId, v]) => [branchName(bId), v.visits, v.guests]) };
    const narrative =
      rows.length === 0
        ? `Không có phiên bàn nào được mở trong khoảng ${period.label}.`
        : `Trong khoảng ${period.label}: ${rows.map(([bId, v]) => `"${branchName(bId)}" có ${v.visits} lượt khách (${v.guests} khách)`).join("; ")}.`;

    return {
      id,
      query: q,
      periodLabel: period.label,
      viewName: "vw_table_sessions_daily",
      sql: `SELECT branch_id, COUNT(*) AS visits, SUM(guests) AS total_guests\nFROM vw_table_sessions_daily\nWHERE tenant_id = '${tenantId}'\n  AND opened_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'\nGROUP BY branch_id\nORDER BY visits DESC;`,
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
    narrative: 'Chưa trả lời được câu này. Hãy hỏi về "doanh thu theo chi nhánh", "món bán chạy" hoặc "lượt khách", kèm khoảng thời gian như hôm nay/tuần trước/tháng này.',
    table: null,
    unmatched: true,
  };
}

/** Ghi lịch sử hỏi đáp (BR-51) — gọi sau khi có `AiAnswer` để log đúng những gì đã trả lời. */
export async function logAiQuery(tenantId: string, userId: string, answer: AiAnswer, latencyMs: number): Promise<AiQueryLog> {
  await delay(20);
  const log: AiQueryLog = {
    id: `LOG-${newId()}`,
    tenantId,
    userId,
    query: answer.query,
    response: answer.narrative,
    payloadJson: JSON.stringify(answer),
    latencyMs,
    createdAt: nowISO(),
  };
  db.aiQueryLogs = [log, ...db.aiQueryLogs];
  return log;
}

/** Lịch sử hỏi đáp của tenant — hiện ở thanh bên. */
export async function listAiQueryLogs(tenantId: string): Promise<AiQueryLog[]> {
  await delay();
  return db.aiQueryLogs.filter((l) => l.tenantId === tenantId);
}
