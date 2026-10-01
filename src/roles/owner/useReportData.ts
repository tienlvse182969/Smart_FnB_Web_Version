/** Nạp ba báo cáo doanh thu song song, kèm trạng thái tải / lỗi / thử lại. */
import { useCallback, useEffect, useState } from "react";
import { reportApi } from "../../api";
import type { DateRange } from "../../lib/reportFormat";
import type { ReportGranularity, RevenueComparison, RevenueTimeseries, TopItems } from "../../types";

export interface ReportBundle {
  comparison: RevenueComparison;
  timeseries: RevenueTimeseries;
  topItems: TopItems;
  // TODO(BE): thẻ khách đã ẩn — /reports/customers đang đếm lượt bàn (v7). Thêm lại khi BE có số khách theo đơn.
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
      reportApi.getRevenueComparison(params),
      reportApi.getRevenueTimeseries({ ...params, granularity: granularity ?? "day" }),
      reportApi.getTopItems({ ...params, limit: 10 }),
    ])
      .then(([comparison, timeseries, topItems]) => {
        if (cancelled) return;
        setData({ comparison, timeseries, topItems });
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
