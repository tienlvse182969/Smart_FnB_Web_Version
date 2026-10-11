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
  /** Doanh thu SAU hoàn tiền (BE `514c426`: `revenue` = `netRevenue`). */
  revenue: number;
  /** Doanh thu gộp (đơn đã trả theo ngày trả), chưa trừ hoàn. */
  grossRevenue: number;
  /** Tổng hoàn theo NGÀY HUỶ (kể cả khoản chuyển khoản chờ hoàn). */
  refundAmount: number;
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
  /** Tổng khoản hoàn của đơn (0 với đơn huỷ khi chưa trả). */
  refundAmount: number;
}

export interface ManagerReport {
  branchName: string;
  timezone: string;
  range: { from: string; to: string; granularity: ManagerReportGranularity };
  summary: {
    /** Doanh thu sau hoàn (= `netRevenue` của BE). */
    revenue: number;
    grossRevenue: number;
    refundAmount: number;
    /** Phần `refundAmount` còn chờ hoàn (chuyển khoản chưa đánh dấu). */
    pendingRefundAmount: number;
    netRevenue: number;
    orderCount: number;
    averageOrderValue: number;
  };
  revenue: ManagerReportBucket[];
  payments: ManagerReportPayment[];
  topItems: ManagerReportItem[];
  topToppings: ManagerReportTopping[];
  ordersByHour: ManagerReportHour[];
  /** Thời gian pha trung bình từ lúc bắt đầu tới lúc xong của từng suất, tính bằng giây; null = chưa có suất nào xong trong kỳ. */
  preparation: { averageSeconds: number | null; completedUnits: number };
  cancellations: {
    total: number;
    /** Số đơn có khoản hoàn trong kỳ (đã huỷ SAU khi trả). */
    paidCancellationCount: number;
    refundAmount: number;
    pendingRefundAmount: number;
    limit: number;
    items: ManagerReportCancelledOrder[];
  };
}
