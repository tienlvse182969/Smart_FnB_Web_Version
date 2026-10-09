/**
 * Báo cáo chi nhánh của Branch Manager (BM-03) — bám `GET /api/v1/manager/reports` (BE `manager-reports.service.ts`).
 * Tiền BE là chuỗi thập phân ("1090000.00") → số ở đây. Ngày/giờ đã cắt theo múi giờ của chi nhánh (Asia/Ho_Chi_Minh); web KHÔNG
 * đổi múi giờ và KHÔNG tính lại số liệu (quyết định 78).
 */

export type ManagerReportGranularity = "day" | "week" | "month";

export interface ManagerReportQuery {
  /** Ngày đầu kỳ `YYYY-MM-DD` theo giờ chi nhánh (bao gồm). */
  from: string;
  /** Ngày cuối kỳ `YYYY-MM-DD` (bao gồm). */
  to: string;
  granularity: ManagerReportGranularity;
  /** Số dòng cho món/topping bán chạy và danh sách đơn huỷ (BE 1–50). */
  limit: number;
}

export interface ManagerReportBucket {
  /** Đầu kỳ `YYYY-MM-DD` (ngày; thứ Hai của tuần; mùng 1 của tháng). */
  bucket: string;
  revenue: number;
  orderCount: number;
}

export interface ManagerReportPayment {
  /** Mã BE PaymentMethod. */
  method: string;
  /** Số tiền ghi nhận (đã chốt vào đơn). */
  settledAmount: number;
  /** Số tiền thực nhận. */
  receivedAmount: number;
  paymentCount: number;
}

export interface ManagerReportItem {
  menuItemId: string;
  name: string;
  quantity: number;
  lineRevenue: number;
}

export interface ManagerReportTopping {
  optionId: string;
  name: string;
  quantity: number;
  additionalRevenue: number;
}

export interface ManagerReportHour {
  /** 0–23 theo giờ chi nhánh. */
  hour: number;
  orderCount: number;
}

export interface ManagerReportCancelledOrder {
  id: string;
  orderCode: string;
  callNumber: number | null;
  totalAmount: number;
  cancelledAt: string | null;
  reason: string | null;
}

export interface ManagerReport {
  branchName: string;
  timezone: string;
  range: { from: string; to: string; granularity: ManagerReportGranularity };
  summary: { revenue: number; orderCount: number; averageOrderValue: number };
  revenue: ManagerReportBucket[];
  payments: ManagerReportPayment[];
  topItems: ManagerReportItem[];
  topToppings: ManagerReportTopping[];
  ordersByHour: ManagerReportHour[];
  /** Thời gian pha trung bình từ lúc bắt đầu tới lúc xong của từng suất, tính bằng giây; null = chưa có suất nào xong trong kỳ. */
  preparation: { averageSeconds: number | null; completedUnits: number };
  cancellations: { total: number; limit: number; items: ManagerReportCancelledOrder[] };
}
