/**
 * Chuyển phản hồi `GET /manager/reports` (BE `manager-reports.service.ts:report`) sang kiểu của web.
 * Đọc phòng thủ: thiếu/sai kiểu thì rơi về mặc định, không ném lỗi. Tiền chuỗi → số bằng `parseAmount`. KHÔNG tính lại, KHÔNG gộp,
 * KHÔNG lọc số liệu (quyết định 78); giờ và ngày BE đã cắt theo múi giờ chi nhánh nên không đổi múi giờ ở web.
 */
import type {
  ManagerReport,
  ManagerReportBucket,
  ManagerReportCancelledOrder,
  ManagerReportGranularity,
  ManagerReportHour,
  ManagerReportItem,
  ManagerReportPayment,
  ManagerReportTopping,
} from "../../../types";
import { parseAmount } from "../../../lib/reportFormat";

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const money = (v: unknown): number => parseAmount(v as string | number | null | undefined);
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObject) : []);

const GRANULARITIES: readonly ManagerReportGranularity[] = ["day", "week", "month"];

function mapBucket(r: Raw): ManagerReportBucket {
  return { bucket: str(r.bucket) ?? "", revenue: money(r.revenue), orderCount: num(r.orderCount) };
}

function mapPayment(r: Raw): ManagerReportPayment {
  return { method: str(r.method) ?? "OTHER", settledAmount: money(r.settledAmount), receivedAmount: money(r.receivedAmount), paymentCount: num(r.paymentCount) };
}

function mapItem(r: Raw): ManagerReportItem {
  return { menuItemId: str(r.menuItemId) ?? "", name: str(r.name) ?? "—", quantity: num(r.quantity), lineRevenue: money(r.lineRevenue) };
}

function mapTopping(r: Raw): ManagerReportTopping {
  return { optionId: str(r.optionId) ?? "", name: str(r.name) ?? "—", quantity: num(r.quantity), additionalRevenue: money(r.additionalRevenue) };
}

function mapHour(r: Raw): ManagerReportHour {
  return { hour: num(r.hour), orderCount: num(r.orderCount) };
}

function mapCancelled(r: Raw): ManagerReportCancelledOrder {
  return {
    id: str(r.id) ?? "",
    orderCode: str(r.orderCode) ?? "",
    callNumber: typeof r.callNumber === "number" && Number.isFinite(r.callNumber) ? r.callNumber : null,
    totalAmount: money(r.totalAmount),
    cancelledAt: str(r.cancelledAt),
    reason: str(r.reason),
  };
}

export function mapManagerReport(raw: unknown, fallback: { from: string; to: string; granularity: ManagerReportGranularity }): ManagerReport {
  const body = isObject(raw) ? raw : {};
  const branch = isObject(body.branch) ? body.branch : {};
  const range = isObject(body.range) ? body.range : {};
  const summary = isObject(body.summary) ? body.summary : {};
  const prep = isObject(body.preparation) ? body.preparation : {};
  const cancel = isObject(body.cancellations) ? body.cancellations : {};
  const granularity = GRANULARITIES.find((g) => g === range.granularity) ?? fallback.granularity;
  const cancelItems = list(cancel.items).map(mapCancelled);
  return {
    branchName: str(branch.name) ?? "Chi nhánh",
    timezone: str(range.timezone) ?? str(branch.timezone) ?? "Asia/Ho_Chi_Minh",
    range: { from: str(range.from) ?? fallback.from, to: str(range.to) ?? fallback.to, granularity },
    summary: { revenue: money(summary.revenue), orderCount: num(summary.orderCount), averageOrderValue: money(summary.averageOrderValue) },
    revenue: list(body.revenue).map(mapBucket),
    payments: list(body.payments).map(mapPayment),
    topItems: list(body.topItems).map(mapItem),
    topToppings: list(body.topToppings).map(mapTopping),
    ordersByHour: list(body.ordersByHour).map(mapHour),
    // `averageSeconds` null khi chưa có suất nào xong trong kỳ (BE: AVG của tập rỗng); số 0 là số thật.
    preparation: { averageSeconds: typeof prep.averageSeconds === "number" && Number.isFinite(prep.averageSeconds) ? prep.averageSeconds : null, completedUnits: num(prep.completedUnits) },
    cancellations: { total: typeof cancel.total === "number" ? cancel.total : cancelItems.length, limit: num(cancel.limit), items: cancelItems },
  };
}
