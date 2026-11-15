import { useEffect, useRef, useState } from "react"
import { palette } from "../theme"

export interface ChartPoint {
  key: string
  label: string
  value: number
  detail: string
}

export default function ReportChart({
  points,
  mode = "bar",
  format,
  title,
  highlightPeak = false,
}: {
  points: ChartPoint[]
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
  const peak = Math.max(0, ...points.map((p) => p.value))
  const low = Math.min(0, ...points.map((p) => p.value))
  const high = peak || (low < 0 ? 0 : 1)
  const width = Math.max(320, availableWidth, points.length * 16)
  const step = (width - 90) / points.length
  const x = (i: number) => 68 + (i + 0.5) * step
  const y = (v: number) => 18 + (134 * (high - v)) / (high - low)
  const current = points.find((p) => p.key === selected)
  const ticks = peak === 0 && low === 0 ? [0] : [...new Set([high, 0, low])]
  return (
    <figure ref={container} style={{ margin: "12px 0 0" }} aria-label={title}>
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
              <text x={55} y={y(t) + 4} textAnchor="end" fontSize={11}>
                {format(t)}
              </text>
            </g>
          ))}
          {mode === "line" && (
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
              {mode === "line" ? (
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
                      : highlightPeak && p.value === peak && peak > 0
                        ? palette.success.text
                        : palette.brandPrimary
                  }
                />
              )}
              {(i % Math.max(1, Math.ceil(54 / step)) === 0 ||
                points.length === 1) && (
                <text x={x(i)} y={176} textAnchor="middle" fontSize={10}>
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <figcaption style={{ minHeight: 20, fontSize: 13 }}>
        {current?.detail ??
          (highlightPeak && peak > 0
            ? "Cao điểm: " +
              points
                .filter((p) => p.value === peak)
                .map((p) => p.label)
                .join(", ") +
              " · " +
              format(peak) +
              " đơn"
            : "Chọn một mốc để xem chi tiết.")}
      </figcaption>
    </figure>
  )
}
