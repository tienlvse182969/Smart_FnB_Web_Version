/**
 * Nạp các khối báo cáo Owner, MỖI KHỐI MỘT yêu cầu riêng: khối lỗi không kéo theo khối khác (mỗi khối có lỗi và
 * nút Thử lại riêng). Đổi bộ lọc thì huỷ yêu cầu cũ và xoá dữ liệu cũ — không bao giờ hiện số của bộ lọc trước.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { reportApi } from "../../api";
import type { DateRange } from "../../lib/reportFormat";
import type {
  PaymentMethodsReport,
  ReportGranularity,
  RevenueComparison,
  RevenueTimeseries,
  TopCombos,
  TopItems,
  TopToppings,
} from "../../types";

export interface BlockState<T> {
  data: T | null;
  loading: boolean;
  /** Lỗi thô (ApiError hoặc Error); màn hình tự chọn cách mô tả. */
  error: unknown;
  reload: () => void;
}

/** Yêu cầu bị huỷ chủ động (đổi bộ lọc) — không phải lỗi để báo người dùng. */
function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Chạy `fetcher` mỗi khi `key` đổi (hoặc bấm Thử lại). `key` là chuỗi đại diện cho bộ lọc, nên effect không bị
 * kích hoạt lại chỉ vì mảng/đối tượng đổi tham chiếu.
 */
export function useReportBlock<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): BlockState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [nonce, setNonce] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    setLoading(true);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbort(err)) return;
        setError(err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export interface ReportQuery extends DateRange {
  /** Bỏ trống = mọi chi nhánh Owner quản lý. */
  branchIds?: string[];
  granularity?: ReportGranularity;
}

export interface ReportBlocks {
  comparison: BlockState<RevenueComparison>;
  timeseries: BlockState<RevenueTimeseries>;
  paymentMethods: BlockState<PaymentMethodsReport>;
  topItems: BlockState<TopItems>;
  topCombos: BlockState<TopCombos>;
  topToppings: BlockState<TopToppings>;
}

const TOP_LIMIT = 10;

export function useReportData(query: ReportQuery): ReportBlocks {
  const { from, to, granularity = "day" } = query;
  const branchIds = query.branchIds;
  const scopeKey = `${from}|${to}|${(branchIds ?? []).join(",")}`;
  const params = { from, to, branchIds };

  return {
    comparison: useReportBlock(scopeKey, (signal) => reportApi.getRevenueComparison({ ...params, signal })),
    timeseries: useReportBlock(`${scopeKey}|${granularity}`, (signal) =>
      reportApi.getRevenueTimeseries({ ...params, granularity, signal }),
    ),
    paymentMethods: useReportBlock(scopeKey, (signal) => reportApi.getPaymentMethods({ ...params, signal })),
    topItems: useReportBlock(scopeKey, (signal) => reportApi.getTopItems({ ...params, limit: TOP_LIMIT, signal })),
    topCombos: useReportBlock(scopeKey, (signal) => reportApi.getTopCombos({ ...params, limit: TOP_LIMIT, signal })),
    topToppings: useReportBlock(scopeKey, (signal) =>
      reportApi.getTopToppings({ ...params, limit: TOP_LIMIT, signal }),
    ),
  };
}
