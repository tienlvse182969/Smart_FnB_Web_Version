/**
 * Bản real của module report — báo cáo doanh thu (API thật, `GET /api/v1/reports/*`).
 *
 * Toàn bộ nhóm endpoint này **chỉ OWNER gọi được**: controller gắn
 * `@Roles(AppRole.OWNER)` và service chặn thêm một lần nữa. MANAGER và ADMIN
 * nhận 403. Phạm vi có từ hai chi nhánh trở lên cần gói có "so sánh đa chi nhánh"
 * (BE `reports.service.ts` `resolveScope`): thiếu thì 403 `PLAN_FEATURE_NOT_ENABLED` (BR-08).
 *
 * Quy ước dữ liệu của backend, đã kiểm chứng trên API đang chạy:
 * - `from` / `to` là **ngày lịch** `YYYY-MM-DD` theo múi giờ của chuỗi
 *   (mặc định `Asia/Ho_Chi_Minh`), và `to` **tính cả ngày đó**. Không gửi
 *   ISO timestamp — backend tự quy đổi sang mốc UTC nửa đêm giờ địa phương.
 * - Bỏ trống khoảng ngày thì backend lấy 30 ngày gần nhất. Tối đa 366 ngày.
 * - Mọi số tiền là **chuỗi thập phân** (`"7420000.00"`), không phải số. Dùng
 *   `parseAmount` để đổi sang số trước khi tính toán hoặc vẽ biểu đồ.
 * - Doanh thu đếm đơn đã thanh toán (`paymentStatus = PAID`), xếp theo `paidAt`; đơn quầy đã
 *   được tính. Tiền hoàn của đơn huỷ sau thanh toán trừ vào ngày huỷ/hoàn (BR-50).
 * - `limit` của các bảng xếp hạng: 1–50, BE mặc định 10.
 *
 * Các hàm ở đây cố ý không phụ thuộc UI và nhận tham số tường minh. `signal` (nếu có) không
 * đi vào query: nó huỷ request khi người dùng đổi bộ lọc.
 */
import type {
  PaymentMethodsReport,
  ReportGranularity,
  ReportRangeParams,
  RevenueComparison,
  RevenueTimeseries,
  TopCombos,
  TopItems,
  TopToppings,
} from "../../../types";
import { request } from "../../http/client";
import type { ReportApi, ReportCallOptions } from "./index";

/** Dựng query string; bỏ giá trị rỗng, lặp khoá cho mảng (`branchIds`). Xuất ra để test. */
export function buildQuery(params: object): string {
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

/** GET một báo cáo: tách `signal` khỏi tham số lọc để nó không lọt vào query string. */
function get<T>(path: string, params: object & ReportCallOptions = {}): Promise<T> {
  const { signal, ...filters } = params;
  return request<T>(`${path}${buildQuery(filters)}`, { signal });
}

/**
 * Doanh thu của từng chi nhánh trong một kỳ, để xếp cạnh nhau trên cùng biểu đồ.
 * Trả kèm tổng toàn phạm vi.
 */
function getRevenueComparison(params: ReportRangeParams & ReportCallOptions = {}): Promise<RevenueComparison> {
  return get<RevenueComparison>("/reports/revenue/comparison", params);
}

/**
 * Doanh thu theo trục thời gian, mỗi chi nhánh một chuỗi điểm dùng chung mốc,
 * dùng cho biểu đồ đường hoặc cột theo ngày / tuần / tháng.
 */
function getRevenueTimeseries(
  params: ReportRangeParams & ReportCallOptions & { granularity?: ReportGranularity } = {},
): Promise<RevenueTimeseries> {
  return get<RevenueTimeseries>("/reports/revenue/timeseries", params);
}

/**
 * Món bán chạy nhất trong kỳ, xếp theo số lượng bán.
 *
 * @param params.limit Số món muốn lấy, 1–50. Backend mặc định 10.
 */
function getTopItems(params: ReportRangeParams & ReportCallOptions & { limit?: number } = {}): Promise<TopItems> {
  return get<TopItems>("/reports/top-items", params);
}

/** Doanh thu theo hình thức thanh toán: giữ hình thức gốc, tiền hoàn tách riêng (BR-83, BR-50). */
function getPaymentMethods(params: ReportRangeParams & ReportCallOptions = {}): Promise<PaymentMethodsReport> {
  return get<PaymentMethodsReport>("/reports/payment-methods", params);
}

/** Combo bán chạy nhất trong kỳ (doanh thu chỉ ghi ở dòng cha của combo). */
function getTopCombos(params: ReportRangeParams & ReportCallOptions & { limit?: number } = {}): Promise<TopCombos> {
  return get<TopCombos>("/reports/top-combos", params);
}

/** Topping bán chạy nhất trong kỳ. */
function getTopToppings(
  params: ReportRangeParams & ReportCallOptions & { limit?: number } = {},
): Promise<TopToppings> {
  return get<TopToppings>("/reports/top-toppings", params);
}

export const reportReal: ReportApi = {
  getRevenueComparison,
  getRevenueTimeseries,
  getTopItems,
  getPaymentMethods,
  getTopCombos,
  getTopToppings,
};
