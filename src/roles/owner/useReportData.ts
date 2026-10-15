/**
 * Nạp các mục báo cáo Owner ĐỘC LẬP: mỗi mục có trạng thái tải / lỗi / khoá riêng và tự thử lại, nên một mục bị BE chặn theo
 * gói (403 `PLAN_FEATURE_NOT_ENABLED`, BR-08) hay lỗi mạng không làm hỏng thẻ số và các mục còn lại.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError, describeApiError, reportApi } from "../../api";
import type { DateRange } from "../../lib/reportFormat";
import type {
  ReportGranularity,
  RevenueComparison,
  RevenueTimeseries,
  TopItems,
  PaymentMethodsReport,
  TopToppings,
} from "../../types";
import { PLAN_FEATURE_NOT_ENABLED } from "./reportKpi";

export interface ReportQuery extends DateRange {
  /** Bỏ trống = mọi chi nhánh Owner quản lý (chỉ khi gói có so sánh đa chi nhánh). */
  branchIds?: string[];
  granularity?: ReportGranularity;
}

export interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** BE chặn mục này theo gói. */
  locked: boolean;
  reload: () => void;
}

export function isPlanFeatureBlocked(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.code === PLAN_FEATURE_NOT_ENABLED;
}

function useSection<T>(fetcher: () => Promise<T>, key: string): SectionState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLocked(false);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        if (isPlanFeatureBlocked(err)) setLocked(true);
        else setError(describeApiError(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `key` gom mọi tham số; `fetcher` đổi tham chiếu mỗi lần render nên không đưa vào deps.
  }, [key, nonce]);

  return { data, loading, error, locked, reload };
}

export interface ReportSections {
  comparison: SectionState<RevenueComparison>;
  timeseries: SectionState<RevenueTimeseries>;
  topItems: SectionState<TopItems>;
  paymentMethods: SectionState<PaymentMethodsReport>;
  topToppings: SectionState<TopToppings>;
}

export function useReportData(query: ReportQuery): ReportSections {
  const { from, to, granularity = "day" } = query;
  // Mảng đổi tham chiếu mỗi lần render, nên khoá effect bằng chuỗi đã nối.
  const branchKey = (query.branchIds ?? []).join(",");
  const params = { from, to, branchIds: branchKey ? branchKey.split(",") : undefined };
  const key = `${from}|${to}|${branchKey}`;

  return {
    comparison: useSection(() => reportApi.getRevenueComparison(params), key),
    timeseries: useSection(() => reportApi.getRevenueTimeseries({ ...params, granularity }), `${key}|${granularity}`),
    topItems: useSection(() => reportApi.getTopItems({ ...params, limit: 10 }), key),
    paymentMethods: useSection(() => reportApi.getPaymentMethods(params), key),
    topToppings: useSection(() => reportApi.getTopToppings({ ...params, limit: 10 }), key),
  };
}
