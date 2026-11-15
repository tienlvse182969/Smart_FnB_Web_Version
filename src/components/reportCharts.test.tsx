import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { changeRatio, niceTicks, previousRange } from "../lib/reportFormat";
import { DeltaBadge, ShareBar, StatCard } from "./bits";
import ReportChart from "./ReportChart";
import { rankProducts } from "../roles/owner/Reports";

afterEach(cleanup);

describe("report helpers", () => {
  it("previous period has the same length and ends the day before", () => {
    expect(previousRange({ from: "2026-11-10", to: "2026-11-16" })).toEqual({ from: "2026-11-03", to: "2026-11-09" });
    expect(previousRange({ from: "2026-11-15", to: "2026-11-15" })).toEqual({ from: "2026-11-14", to: "2026-11-14" });
    expect(previousRange({ from: "2026-03-01", to: "2026-03-31" })).toEqual({ from: "2026-01-29", to: "2026-02-28" });
  });

  it("change ratio never divides by zero or invents +100%", () => {
    expect(changeRatio(120, 100)).toBeCloseTo(0.2);
    expect(changeRatio(80, 100)).toBeCloseTo(-0.2);
    expect(changeRatio(50, 0)).toBeNull();
    expect(changeRatio(null, 10)).toBeNull();
    // A negative base (refund-only day) still gives the direction of change.
    expect(changeRatio(-50, -100)).toBeCloseTo(0.5);
  });

  it("nice ticks are round, include 0 and cover the data", () => {
    expect(niceTicks(0, 1_337_000)).toEqual([0, 500_000, 1_000_000, 1_500_000]);
    expect(niceTicks(0, 11)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(-100_000, 300_000)).toEqual([-100_000, 0, 100_000, 200_000, 300_000]);
    expect(niceTicks(0, 0)).toEqual([0]);
  });
});

describe("KPI delta", () => {
  it("colors by meaning: more refunds is bad, more revenue is good, zero base shows a dash", () => {
    render(<>
      <DeltaBadge delta={{ ratio: 0.125 }} />
      <DeltaBadge delta={{ ratio: 0.3, higherIsBetter: false }} />
      <DeltaBadge delta={{ ratio: null }} />
    </>);
    const [revenue, refunds, none] = screen.getAllByTestId("stat-delta");
    expect(revenue.textContent).toContain("▲ +12,5%");
    expect(revenue.getAttribute("data-direction")).toBe("up");
    expect(refunds.textContent).toContain("▲ +30%");
    expect(revenue.getAttribute("style")).not.toBe(refunds.getAttribute("style"));
    expect(none.textContent).toBe("— so với kỳ trước");
  });

  it("StatCard keeps working without a delta", () => {
    render(<StatCard label="Số đơn" value="12" />);
    expect(screen.queryByTestId("stat-delta")).toBeNull();
  });

  it("ShareBar clamps to 0–100% and uses theme colors, not a native progress element", () => {
    render(<ShareBar value={150} max={100} label="Tiền mặt" />);
    const bar = screen.getByTestId("share-bar");
    expect((bar.firstChild as HTMLElement).style.width).toBe("100%");
    expect(document.querySelector("progress, meter")).toBeNull();
  });
});

describe("ReportChart", () => {
  it("draws round gridlines and a single point as a bar instead of a one-point line", () => {
    render(<ReportChart title="t" mode="line" format={String} points={[{ key: "2026-11-15", label: "15/11", value: 1_337_000, detail: "x" }]} />);
    expect(document.querySelector("polyline")).toBeNull();
    const labels = [...document.querySelectorAll("svg text")].map((n) => n.textContent);
    expect(labels).toEqual(expect.arrayContaining(["0", "500000", "1000000", "1500000"]));
  });
});

describe("top products", () => {
  it("can rank by revenue without changing the data", () => {
    const rows = [
      { name: "Trà sữa", quantity: 30, revenue: "900000" },
      { name: "Cà phê muối", quantity: 20, revenue: "1100000" },
    ];
    expect(rankProducts(rows, "quantity").map((r) => r.name)).toEqual(["Trà sữa", "Cà phê muối"]);
    expect(rankProducts(rows, "revenue").map((r) => r.name)).toEqual(["Cà phê muối", "Trà sữa"]);
    expect(rows[0].name).toBe("Trà sữa");
  });
});
