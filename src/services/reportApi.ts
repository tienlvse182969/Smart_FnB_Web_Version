/**
 * Báo cáo doanh thu — API thật (`GET /api/v1/reports/*`).
 *
 * Toàn bộ nhóm endpoint này **chỉ OWNER gọi được**: controller gắn
 * `@Roles(AppRole.OWNER)` và service chặn thêm một lần nữa. MANAGER và ADMIN
 * nhận 403.
 *
 * Quy ước dữ liệu của backend, đã kiểm chứng trên API đang chạy:
 * - `from` / `to` là **ngày lịch** `YYYY-MM-DD` theo múi giờ của chuỗi
 *   (mặc định `Asia/Ho_Chi_Minh`), và `to` **tính cả ngày đó**. Không gửi
 *   ISO timestamp — backend tự quy đổi sang mốc UTC nửa đêm giờ địa phương.
 * - Bỏ trống khoảng ngày thì backend lấy 30 ngày gần nhất. Tối đa 366 ngày.
 * - Mọi số tiền là **chuỗi thập phân** (`"7420000.00"`), không phải số. Dùng
 *   {@link parseMoney} để đổi sang số trước khi tính toán hoặc vẽ biểu đồ.
 * - Doanh thu chỉ đếm đơn `COMPLETED`, xếp theo `placedAt`.
 *
 * Các hàm ở đây cố ý không phụ thuộc UI và nhận tham số tường minh, để sau này
 * dùng lại làm "tool" cho trợ lý AI hỏi đáp số liệu.
 */
import { request } from "./http";

/** Mức gom nhóm trục thời gian của biểu đồ doanh thu. */
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

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      // Backend nhận branchIds lặp lại hoặc ngăn cách bằng dấu phẩy.
      for (const entry of value) search.append(key, String(entry));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * Doanh thu của từng chi nhánh trong một kỳ, để xếp cạnh nhau trên cùng biểu đồ.
 * Trả kèm tổng toàn phạm vi.
 */
export function getRevenueComparison(params: ReportRangeParams = {}): Promise<RevenueComparison> {
  return request<RevenueComparison>(`/reports/revenue/comparison${buildQuery(params)}`);
}

/**
 * Doanh thu theo trục thời gian, mỗi chi nhánh một chuỗi điểm dùng chung mốc,
 * dùng cho biểu đồ đường hoặc cột theo ngày / tuần / tháng.
 */
export function getRevenueTimeseries(
  params: ReportRangeParams & { granularity?: ReportGranularity } = {},
): Promise<RevenueTimeseries> {
  return request<RevenueTimeseries>(`/reports/revenue/timeseries${buildQuery(params)}`);
}

/**
 * Món bán chạy nhất trong kỳ, xếp theo số lượng bán.
 *
 * @param params.limit Số món muốn lấy, 1–50. Backend mặc định 10.
 */
export function getTopItems(
  params: ReportRangeParams & { limit?: number } = {},
): Promise<TopItems> {
  return request<TopItems>(`/reports/top-items${buildQuery(params)}`);
}

/**
 * Lượt khách đã phục vụ theo chi nhánh, đếm từ các lượt bàn đã sang trạng thái
 * PAID hoặc CLOSED trong kỳ.
 */
export function getCustomerTraffic(params: ReportRangeParams = {}): Promise<CustomerTraffic> {
  return request<CustomerTraffic>(`/reports/customers${buildQuery(params)}`);
}

// Đọc số tiền bằng `parseAmount` trong `reportFormat.ts` — một hàm duy nhất
// cho cả `/reports` ("995000.00") lẫn `/payments` ("250000").
