/**
 * Bản real của module report — báo cáo doanh thu (API thật, `GET /api/v1/reports/*`).
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
 *   `parseAmount` để đổi sang số trước khi tính toán hoặc vẽ biểu đồ.
 * - Doanh thu đếm đơn đã thanh toán (`paymentStatus = PAID`), xếp theo `paidAt` (BE `dfe8100`, reports.service.ts); đơn quầy đã
 *   được tính. Chưa trừ đơn huỷ sau thanh toán vì BE chưa có huỷ đơn đã trả (BR-50).
 *
 * Các hàm ở đây cố ý không phụ thuộc UI và nhận tham số tường minh, để sau này
 * dùng lại làm "tool" cho trợ lý AI hỏi đáp số liệu.
 */
import type {
  CustomerTraffic,
  ReportGranularity,
  ReportRangeParams,
  RevenueComparison,
  RevenueTimeseries,
  TopItems,
} from "../../../types";
import { request } from "../../http/client";
import type { ReportApi } from "./index";

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
function getRevenueComparison(params: ReportRangeParams = {}): Promise<RevenueComparison> {
  return request<RevenueComparison>(`/reports/revenue/comparison${buildQuery(params)}`);
}

/**
 * Doanh thu theo trục thời gian, mỗi chi nhánh một chuỗi điểm dùng chung mốc,
 * dùng cho biểu đồ đường hoặc cột theo ngày / tuần / tháng.
 */
function getRevenueTimeseries(
  params: ReportRangeParams & { granularity?: ReportGranularity } = {},
): Promise<RevenueTimeseries> {
  return request<RevenueTimeseries>(`/reports/revenue/timeseries${buildQuery(params)}`);
}

/**
 * Món bán chạy nhất trong kỳ, xếp theo số lượng bán.
 *
 * @param params.limit Số món muốn lấy, 1–50. Backend mặc định 10.
 */
function getTopItems(
  params: ReportRangeParams & { limit?: number } = {},
): Promise<TopItems> {
  return request<TopItems>(`/reports/top-items${buildQuery(params)}`);
}

/**
 * Lượt khách đã phục vụ theo chi nhánh, đếm từ các lượt bàn đã sang trạng thái
 * PAID hoặc CLOSED trong kỳ.
 */
function getCustomerTraffic(params: ReportRangeParams = {}): Promise<CustomerTraffic> {
  return request<CustomerTraffic>(`/reports/customers${buildQuery(params)}`);
}

export const reportReal: ReportApi = {
  getRevenueComparison,
  getRevenueTimeseries,
  getTopItems,
  getCustomerTraffic,
};
