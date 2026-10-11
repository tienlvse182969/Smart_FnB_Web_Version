import { describe, expect, it } from "vitest";
import { bucketLabel, defaultReportFilters, formatPrepTime, parseReportFilters, presetOf, reportFiltersToSearch, toReportQuery, withPreset } from "./reportFilters";

const TODAY = "2026-10-09";

describe("bộ lọc báo cáo chi nhánh ↔ URL (quyết định 77)", () => {
  it("mặc định: 7 ngày gần nhất giờ Việt Nam, kỳ theo ngày", () => {
    expect(defaultReportFilters(TODAY)).toEqual({ from: "2026-10-03", to: "2026-10-09", granularity: "day" });
    expect(parseReportFilters("", TODAY)).toEqual(defaultReportFilters(TODAY));
    expect(presetOf(defaultReportFilters(TODAY), TODAY)).toBe("7d");
  });

  it("chọn nhanh: Hôm nay / 7 ngày / 30 ngày; khoảng khác = tuỳ chọn", () => {
    const base = defaultReportFilters(TODAY);
    expect(withPreset(base, "today", TODAY)).toMatchObject({ from: "2026-10-09", to: "2026-10-09" });
    expect(withPreset(base, "30d", TODAY)).toMatchObject({ from: "2026-09-10", to: "2026-10-09" });
    expect(presetOf(withPreset(base, "today", TODAY), TODAY)).toBe("today");
    expect(presetOf(withPreset(base, "30d", TODAY), TODAY)).toBe("30d");
    expect(presetOf({ ...base, from: "2026-09-01", to: "2026-09-05" }, TODAY)).toBe("custom");
    expect(withPreset({ ...base, granularity: "week" }, "today", TODAY).granularity).toBe("week");
  });

  it("vòng tròn bộ lọc → URL → bộ lọc; URL chỉ giữ tham số khác mặc định", () => {
    expect(reportFiltersToSearch(defaultReportFilters(TODAY), TODAY).toString()).toBe("");
    const f = { from: "2026-09-01", to: "2026-09-30", granularity: "week" as const };
    const search = reportFiltersToSearch(f, TODAY).toString();
    expect(search).toBe("from=2026-09-01&to=2026-09-30&granularity=week");
    expect(parseReportFilters(search, TODAY)).toEqual(f);
    expect(reportFiltersToSearch({ ...defaultReportFilters(TODAY), granularity: "month" }, TODAY).toString()).toBe("granularity=month");
  });

  it("tham số hỏng bị bỏ qua", () => {
    const base = defaultReportFilters(TODAY);
    expect(parseReportFilters("from=abc&to=2026-10-09", TODAY)).toEqual(base);
    expect(parseReportFilters("from=2026-02-30&to=2026-03-05", TODAY)).toEqual(base);
    expect(parseReportFilters("from=2026-10-09&to=2026-10-01", TODAY)).toEqual(base);
    expect(parseReportFilters("from=2024-01-01&to=2026-10-09", TODAY)).toEqual(base); // quá 366 ngày
    expect(parseReportFilters("from=2025-10-09&to=2026-10-09", TODAY)).toMatchObject({ from: "2025-10-09" }); // đúng 366 ngày thì nhận
    expect(parseReportFilters("granularity=year&lạ=1", TODAY).granularity).toBe("day");
  });

  it("toReportQuery: ngày giờ VN, kỳ, top 10", () => {
    expect(toReportQuery({ from: "2026-10-03", to: "2026-10-09", granularity: "month" })).toEqual({ from: "2026-10-03", to: "2026-10-09", granularity: "month", limit: 10 });
  });
});

describe("thời gian pha trung bình", () => {
  it("dưới 1 giây, phút:giây, chưa có dữ liệu", () => {
    expect(formatPrepTime(0.02)).toBe("Dưới 1 giây");
    expect(formatPrepTime(0)).toBe("Dưới 1 giây");
    expect(formatPrepTime(0.99)).toBe("Dưới 1 giây");
    expect(formatPrepTime(1)).toBe("0:01");
    expect(formatPrepTime(45)).toBe("0:45");
    expect(formatPrepTime(125)).toBe("2:05");
    expect(formatPrepTime(125.4)).toBe("2:05");
    expect(formatPrepTime(3600)).toBe("60:00");
    expect(formatPrepTime(null)).toBe("Chưa có dữ liệu");
  });
});

describe("nhãn mốc thời gian", () => {
  it("ngày DD/MM, tuần có chữ 'Tuần', tháng MM/YYYY", () => {
    expect(bucketLabel("2026-10-08", "day")).toBe("08/10");
    expect(bucketLabel("2026-10-05", "week")).toBe("Tuần 05/10");
    expect(bucketLabel("2026-10-01", "month")).toBe("10/2026");
  });
});
