/** Nạp bốn báo cáo doanh thu song song, kèm trạng thái tải / lỗi / thử lại. */
import { useCallback, useEffect, useState } from "react";
import {
  getCustomerTraffic,
  getRevenueComparison,
  getRevenueTimeseries,
  getTopItems,
  type CustomerTraffic,
  type ReportGranularity,
  type RevenueComparison,
  type RevenueTimeseries,
  type TopItems,
} from "../../services/reportApi";
import type { DateRange } from "../../services/reportFormat";

export interface ReportBundle {
  comparison: RevenueComparison;
  timeseries: RevenueTimeseries;
  topItems: TopItems;
  customers: CustomerTraffic;
}

export interface ReportQuery extends DateRange {
  /** Bỏ trống = mọi chi nhánh Owner quản lý. */
  branchIds?: string[];
  granularity?: ReportGranularity;
}

export interface ReportState {
  data: ReportBundle | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useReportData(query: ReportQuery): ReportState {
  const [data, setData] = useState<ReportBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const { from, to, granularity } = query;
  // Mảng đổi tham chiếu mỗi lần render, nên khoá effect bằng chuỗi đã nối.
  const branchKey = (query.branchIds ?? []).join(",");

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    const branchIds = branchKey ? branchKey.split(",") : undefined;
    const params = { from, to, branchIds };
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      getRevenueComparison(params),
      getRevenueTimeseries({ ...params, granularity: granularity ?? "day" }),
      getTopItems({ ...params, limit: 10 }),
      getCustomerTraffic(params),
    ])
      .then(([comparison, timeseries, topItems, customers]) => {
        if (cancelled) return;
        setData({ comparison, timeseries, topItems, customers });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được báo cáo");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, branchKey, granularity, nonce]);

  return { data, loading, error, reload };
}
