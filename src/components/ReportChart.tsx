import { useEffect, useRef, useState } from "react"
import { CHART_SERIES, palette } from "../theme"
import { niceTicks } from "../lib/reportFormat"

export interface ChartPoint {
  key: string
  label: string
  value: number
  detail: string
}

/** Một chuỗi số trên cùng trục với `points` (cùng độ dài, cùng thứ tự). Dùng cho so sánh nhiều chi nhánh. */
export interface ChartSeries {
  key: string
  name: string
  values: number[]
}

export const seriesColor = (index: number) => CHART_SERIES[index % CHART_SERIES.length]

export default function ReportChart({
  points,
  series,
  mode: requestedMode = "bar",
  format,
  title,
  highlightPeak = false,
}: {
  points: ChartPoint[]
  /** Có `series` thì vẽ nhiều đường (bỏ qua `points[].value`), kèm chú thích màu. */
  series?: ChartSeries[]
  mode?: "line" | "bar"
  format: (value: number) => string
  title: string
  highlightPeak?: boolean
}) {
  const [selected, setSelected] = useState<string>()
  const container = useRef<HTMLElement>(null)
  const [availableWidth, setAvailableWidth] = useState(320)
  const hasPoints = points.length > 0
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      if (entries[0])
        setAvailableWidth(Math.floor(entries[0].contentRect.width))
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [hasPoints])
  if (!points.length) return <p>Chưa có dữ liệu trong kỳ.</p>
  const multi = !!series?.length
  // Một mốc thì đường không có hướng: vẽ cột để không gây hiểu nhầm là "xu hướng".
  const mode = !multi && points.length === 1 ? "bar" : requestedMode
  const values = multi ? series!.flatMap((s) => s.values) : points.map((p) => p.value)
  const peak = Math.max(0, ...values)
  const ticks = niceTicks(Math.min(0, ...values), peak)
  const low = ticks[0]
  const high = ticks[ticks.length - 1] || 1
  const width = Math.max(320, availableWidth, points.length * 16)
  const step = (width - 90) / points.length
  const x = (i: number) => 68 + (i + 0.5) * step
  const y = (v: number) => 18 + (134 * (high - v)) / (high - low)
  const current = points.find((p) => p.key === selected)
  const currentIndex = current ? points.indexOf(current) : -1
  const singlePeak = Math.max(0, ...points.map((p) => p.value))
  return (
    <figure ref={container} style={{ margin: "12px 0 0" }} aria-label={title}>
      {multi && (
        <div data-testid="chart-legend" style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12.5, marginBottom: 4 }}>
          {series!.map((s, i) => (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden style={{ width: 14, height: 3, borderRadius: 2, background: seriesColor(i) }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} 184`}
          style={{
            width: "100%",
            minWidth: width,
            height: 184,
            display: "block",
          }}
          aria-label={title}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={60}
                x2={width - 8}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? palette.textSubtle : palette.line}
              />
              <text x={55} y={y(t) + 4} textAnchor="end" fontSize={11} fill={palette.textMuted}>
                {format(t)}
              </text>
            </g>
          ))}
          {multi
            ? series!.map((s, si) => (
                <g key={s.key} data-series={s.key}>
                  <polyline
                    fill="none"
                    stroke={seriesColor(si)}
                    strokeWidth={2}
                    points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                  />
                  {s.values.map((v, i) => (
                    <circle key={i} cx={x(i)} cy={y(v)} r={i === currentIndex ? 4.5 : 2.5} fill={seriesColor(si)} />
                  ))}
                </g>
              ))
            : mode === "line" && (
                <polyline
                  fill="none"
                  stroke={palette.brandPrimary}
                  strokeWidth={2.5}
                  points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
                />
              )}
          {points.map((p, i) => (
            <g
              key={p.key}
              data-key={p.key}
              data-value={p.value}
              data-negative={p.value < 0}
              tabIndex={0}
              role="button"
              aria-label={p.detail}
              onFocus={() => setSelected(p.key)}
              onMouseEnter={() => setSelected(p.key)}
              onClick={() => setSelected(p.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelected(p.key)
                }
              }}
            >
              <title>{p.detail}</title>
              <rect
                x={x(i) - step / 2}
                y={8}
                width={step}
                height={152}
                fill="transparent"
              />
              {multi ? null : mode === "line" ? (
                <circle
                  cx={x(i)}
                  cy={y(p.value)}
                  r={selected === p.key ? 5 : 3}
                  fill={palette.brandPrimary}
                />
              ) : (
                <rect
                  x={x(i) - step * 0.32}
                  y={Math.min(y(0), y(p.value))}
                  width={step * 0.64}
                  height={Math.abs(y(p.value) - y(0))}
                  fill={
                    p.value < 0
                      ? palette.error.text
                      : highlightPeak && p.value === singlePeak && singlePeak > 0
                        ? palette.success.text
                        : palette.brandPrimary
                  }
                />
              )}
              {(i % Math.max(1, Math.ceil(54 / step)) === 0 ||
                points.length === 1) && (
                <text x={x(i)} y={176} textAnchor="middle" fontSize={10} fill={palette.textMuted}>
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <figcaption style={{ minHeight: 20, fontSize: 13 }}>
        {current?.detail ??
          (highlightPeak && singlePeak > 0
            ? "Cao điểm: " +
              points
                .filter((p) => p.value === singlePeak)
                .map((p) => p.label)
                .join(", ") +
              " · " +
              format(singlePeak) +
              " đơn"
            : "Chọn một mốc để xem chi tiết.")}
      </figcaption>
    </figure>
  )
}
