/** Kiểu dữ liệu báo cáo — bám `GET /api/v1/reports/*`. Mọi số tiền là chuỗi thập phân ("7420000.00"). */

export type ReportGranularity = "day" | "week" | "month";

/** Khoảng thời gian backend đã áp dụng, trả kèm mọi báo cáo. */
export interface ReportRange {
  /** Ngày đầu kỳ, `YYYY-MM-DD` theo giờ chuỗi. */
  from: string;
  /** Ngày cuối kỳ, đã bao gồm chính ngày này. */
  to: string;
  /** Múi giờ backend dùng để cắt ngày, ví dụ `Asia/Ho_Chi_Minh`. */
  timezone: string;
  /** Số chi nhánh nằm trong phạm vi báo cáo. */
  branchCount: number;
}

/** Chi nhánh ở dạng rút gọn mà báo cáo trả kèm mỗi dòng. */
export interface ReportBranchRef {
  id: string;
  code: string;
  name: string;
  city: string | null;
  chainId: string;
}

/** Tham số lọc dùng chung cho cả bốn báo cáo. */
export interface ReportRangeParams {
  /** Giới hạn trong một chuỗi. Bỏ trống = mọi chuỗi Owner đang quản lý. */
  chainId?: string;
  /** Giới hạn vào một số chi nhánh. Chi nhánh ngoài phạm vi sẽ bị 403. */
  branchIds?: string[];
  /** Ngày đầu kỳ `YYYY-MM-DD`. Bỏ trống = 30 ngày gần nhất. */
  from?: string;
  /** Ngày cuối kỳ `YYYY-MM-DD`, tính cả ngày này. */
  to?: string;
}

/** Một dòng so sánh doanh thu của một chi nhánh. */
export interface BranchRevenueRow {
  branch: ReportBranchRef;
  /** Tổng doanh thu, chuỗi thập phân. */
  revenue: string;
  /** Tổng giảm giá, chuỗi thập phân. */
  discount: string;
  orderCount: number;
  /** Doanh thu trung bình mỗi đơn, chuỗi thập phân. */
  averageOrderValue: string;
  guestCount: number;
  sessionCount: number;
}

export interface RevenueComparison {
  range: ReportRange;
  totals: { revenue: string; orderCount: number; guestCount: number };
  /** Đã sắp theo doanh thu giảm dần. */
  branches: BranchRevenueRow[];
}

/** Một điểm trên trục thời gian. `bucket` là `YYYY-MM-DD` của đầu kỳ con. */
export interface RevenuePoint {
  bucket: string;
  revenue: string;
  orderCount: number;
}

export interface RevenueSeries {
  branch: ReportBranchRef;
  /** Cùng độ dài và cùng thứ tự với `buckets` ở cấp ngoài. */
  points: RevenuePoint[];
  total: string;
  orderCount: number;
}

export interface RevenueTimeseries {
  range: ReportRange;
  granularity: ReportGranularity;
  /** Danh sách mốc dùng chung, đã lấp đầy khoảng trống, để mọi series thẳng trục. */
  buckets: string[];
  series: RevenueSeries[];
}

export interface TopItemRow {
  rank: number;
  /** Khi món đã bị xoá khỏi thực đơn, chỉ còn `id`. */
  menuItem: { id: string; sku?: string; name?: string };
  quantity: number;
  revenue: string;
  orderLineCount: number;
}

export interface TopItems {
  range: ReportRange;
  items: TopItemRow[];
}

export interface CustomerTrafficRow {
  branch: ReportBranchRef;
  guestCount: number;
  sessionCount: number;
  /** Số khách trung bình mỗi lượt bàn, đã làm tròn 2 chữ số. */
  averageGuestsPerSession: number;
}

export interface CustomerTraffic {
  range: ReportRange;
  totals: { guestCount: number; sessionCount: number };
  branches: CustomerTrafficRow[];
}
