import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ReportChart from "./ReportChart";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
afterEach(cleanup);

const points = ["09/11", "10/11", "11/11", "12/11"].map((label, i) => ({ key: `k${i}`, label, value: i * 10, detail: `${label} · ${i * 10} đơn` }));

/** jsdom không có layout: giả lập SVG rộng 320px (= viewBox mặc định) để toạ độ con trỏ khớp 1:1. */
function layout(svg: Element, width = 320) {
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width, height: 184, right: width, bottom: 184, x: 0, y: 0, toJSON: () => ({}) });
}

describe("ReportChart hover", () => {
  it("shows the nearest point immediately under the pointer, with a guide line, and hides on leave", () => {
    render(<ReportChart title="Số đơn" mode="line" format={String} points={points} />);
    const svg = screen.getByTestId("report-chart");
    layout(svg);
    // No native <title> tooltip any more (it always lags ~1s).
    expect(svg.querySelector("title")).toBeNull();
    // viewBox 320: plot starts at 68, 4 columns of 57.5 → x = 300 is in the 4th column.
    fireEvent.pointerMove(svg, { clientX: 300, clientY: 60 });
    expect(screen.getByTestId("chart-tooltip").textContent).toBe("12/1130 đơn");
    expect(screen.getByTestId("chart-guide")).toBeTruthy();
    expect(svg.querySelector("[data-active=true]")!.getAttribute("data-key")).toBe("k3");
    // Anywhere in the column counts, not only on the dot.
    fireEvent.pointerMove(svg, { clientX: 70, clientY: 170 });
    expect(screen.getByTestId("chart-tooltip").textContent).toContain("09/11");
    fireEvent.pointerLeave(svg);
    expect(screen.queryByTestId("chart-tooltip")).toBeNull();
    expect(screen.queryByTestId("chart-guide")).toBeNull();
  });

  it("lists every series at the hovered point, highest first, with the full value format", () => {
    render(
      <ReportChart
        title="Doanh thu"
        mode="line"
        format={(v) => `${v / 1000} N`}
        formatFull={(v) => `${v.toLocaleString("vi-VN")} ₫`}
        points={points.slice(0, 2).map((p) => ({ ...p, detail: p.label }))}
        series={[
          { key: "q8", name: "Smart q8", values: [0, 0] },
          { key: "q10", name: "Smart q10", values: [0, 140000] },
        ]}
      />,
    );
    const svg = screen.getByTestId("report-chart");
    layout(svg);
    fireEvent.pointerMove(svg, { clientX: 300, clientY: 40 });
    const tip = screen.getByTestId("chart-tooltip").textContent!;
    expect(tip.startsWith("10/11")).toBe(true);
    expect(tip.indexOf("Smart q10")).toBeLessThan(tip.indexOf("Smart q8"));
    expect(tip).toContain("140.000 ₫");
  });

  it("is keyboard friendly: one tab stop, arrows move between points, Escape closes", () => {
    render(<ReportChart title="Số đơn" mode="bar" format={String} points={points} />);
    const svg = screen.getByTestId("report-chart");
    expect(document.querySelectorAll("[tabindex]")).toHaveLength(1);
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(screen.getByTestId("chart-tooltip").textContent).toContain("09/11");
    fireEvent.keyDown(svg, { key: "ArrowRight" });
    expect(screen.getByTestId("chart-tooltip").textContent).toContain("10/11");
    fireEvent.keyDown(svg, { key: "End" });
    expect(screen.getByTestId("chart-tooltip").textContent).toContain("12/11");
    fireEvent.keyDown(svg, { key: "Escape" });
    expect(screen.queryByTestId("chart-tooltip")).toBeNull();
  });
});
