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
  /** Doanh thu SAU hoàn (= `netRevenue`), chuỗi thập phân. */
  revenue: string;
  /** Doanh thu trước khi trừ khoản hoàn của đơn huỷ sau thanh toán (BR-50). */
  grossRevenue: string;
  /** Tiền đã hoàn trong kỳ, trừ vào ngày huỷ (BR-50). */
  refundAmount: string;
  /** Tiền còn chờ chủ chuỗi hoàn (BR-49). */
  pendingRefundAmount: string;
  netRevenue: string;
  /** Số đơn huỷ sau khi đã thanh toán trong kỳ. */
  paidCancellationCount: number;
  /** Tổng giảm giá, chuỗi thập phân. */
  discount: string;
  orderCount: number;
  /** Doanh thu thuần trung bình mỗi đơn, chuỗi thập phân (BE tính). */
  averageOrderValue: string;
}

export interface RevenueComparison {
  range: ReportRange;
  totals: {
    revenue: string;
    grossRevenue: string;
    refundAmount: string;
    pendingRefundAmount: string;
    netRevenue: string;
    paidCancellationCount: number;
    orderCount: number;
    /**
     * Giá trị đơn trung bình toàn phạm vi do BE tính (BE `71e085d` có; BE cũ không trả). Web không tự chia (quyết định 139):
     * thiếu thì chỉ hiện giá trị của chi nhánh khi phạm vi đúng một chi nhánh.
     */
    averageOrderValue?: string;
  };
  /** Đã sắp theo doanh thu giảm dần. */
  branches: BranchRevenueRow[];
}

/** Một điểm trên trục thời gian. `bucket` là `YYYY-MM-DD` của đầu kỳ con. */
export interface RevenuePoint {
  bucket: string;
  /** Sau hoàn. */
  revenue: string;
  grossRevenue: string;
  /** Tiền hoàn của đơn huỷ TRONG kỳ con này (ngày huỷ, không phải ngày bán). */
  refundAmount: string;
  netRevenue: string;
  orderCount: number;
}

export interface RevenueSeries {
  branch: ReportBranchRef;
  /** Cùng độ dài và cùng thứ tự với `buckets` ở cấp ngoài. */
  points: RevenuePoint[];
  total: string;
  grossTotal: string;
  refundTotal: string;
  netTotal: string;
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


/**
 * `GET /reports/payment-methods` — doanh thu theo hình thức thanh toán (BR-83).
 * Hình thức giữ nguyên hình thức GỐC của đơn; tiền hoàn tách riêng và trừ vào ngày hoàn (BR-50).
 */
export interface PaymentMethodRow {
  /** Mã BE `PaymentMethod`: CASH, BANK_TRANSFER, … */
  method: string;
  /** Số ghi nhận trước hoàn. */
  grossSettledAmount: string;
  /** Số thực nhận trước hoàn (tiền mặt: khách đưa, chưa trừ tiền thối). */
  grossReceivedAmount: string;
  /** Tiền đã hoàn của hình thức này, theo ngày hoàn. */
  refundAmount: string;
  /** Sau hoàn (= gộp − hoàn). */
  netAmount: string;
  receivedAmount: string;
  paymentCount: number;
  /** Số khoản của đơn đã huỷ sau khi trả. */
  cancelledAfterPaymentCount: number;
}

export interface PaymentMethodsReport {
  range: ReportRange;
  /** Cộng mọi chi nhánh trong phạm vi. */
  methods: PaymentMethodRow[];
  branches: { branch: ReportBranchRef; methods: PaymentMethodRow[] }[];
}

/** `GET /reports/top-combos` — combo bán chạy; doanh thu chỉ ghi ở dòng cha của combo. */
export interface TopComboRow {
  rank: number;
  comboId: string | null;
  name: string;
  quantity: number;
  revenue: string;
}

export interface TopCombos {
  range: ReportRange;
  items: TopComboRow[];
}

/** `GET /reports/top-toppings` — topping bán chạy (BE tính từ tuỳ chọn của dòng đơn). */
export interface TopToppingRow {
  rank: number;
  optionId: string | null;
  name: string | null;
  groupCode: string | null;
  groupName: string | null;
  quantity: number;
  /** Tiền cộng thêm do topping. */
  additionalRevenue: string;
}

export interface TopToppings {
  range: ReportRange;
  items: TopToppingRow[];
}
