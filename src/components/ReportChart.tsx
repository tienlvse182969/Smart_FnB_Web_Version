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

const HEIGHT = 184
const LEFT = 68
const PLOT_TOP = 8
const PLOT_HEIGHT = 152

/**
 * Biểu đồ cột/đường dùng chung của các báo cáo. Rê chuột tới đâu thì hiện ngay đường dóng ở mốc gần nhất và hộp số liệu
 * đi theo con trỏ (không dùng `<title>` của trình duyệt vì luôn trễ ~1 giây). Bàn phím: Tab vào biểu đồ rồi ← → để đi qua
 * từng mốc; số liệu được đọc qua vùng `aria-live`.
 */
export default function ReportChart({
  points,
  series,
  mode: requestedMode = "bar",
  format,
  formatFull,
  title,
  highlightPeak = false,
}: {
  points: ChartPoint[]
  /** Có `series` thì vẽ nhiều đường (bỏ qua `points[].value`), kèm chú thích màu. */
  series?: ChartSeries[]
  mode?: "line" | "bar"
  /** Nhãn trục (gọn, vd. "1,5 tr"). */
  format: (value: number) => string
  /** Số đầy đủ trong hộp số liệu khi vẽ nhiều đường (vd. "140.000 ₫"). Mặc định dùng `format`. */
  formatFull?: (value: number) => string
  title: string
  highlightPeak?: boolean
}) {
  const [active, setActive] = useState<number | null>(null)
  const [pointerY, setPointerY] = useState<number | null>(null)
  const container = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [availableWidth, setAvailableWidth] = useState(320)
  const [renderedWidth, setRenderedWidth] = useState(0)
  const hasPoints = points.length > 0
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setAvailableWidth(Math.floor(entries[0].contentRect.width))
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [hasPoints])
  useEffect(() => {
    if (active !== null && active >= points.length) setActive(null)
  }, [active, points.length])
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
  const x = (i: number) => LEFT + (i + 0.5) * step
  const y = (v: number) => 18 + (134 * (high - v)) / (high - low)
  const singlePeak = Math.max(0, ...points.map((p) => p.value))
  const full = formatFull ?? format

  /** Mốc gần nhất với vị trí ngang của con trỏ: cả cột dọc là vùng bắt, không cần trỏ trúng điểm. */
  const indexAt = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    const svgX = ((clientX - rect.left) * width) / rect.width
    return Math.min(points.length - 1, Math.max(0, Math.floor((svgX - LEFT) / step)))
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const index = indexAt(e.clientX)
    if (index === null || !rect) return
    setActive(index)
    setPointerY(e.clientY - rect.top)
    if (rect.width !== renderedWidth) setRenderedWidth(rect.width)
  }
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const move = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "Home" ? -points.length : e.key === "End" ? points.length : 0
    if (!move) {
      if (e.key === "Escape") setActive(null)
      return
    }
    e.preventDefault()
    setPointerY(null)
    setActive((current) => Math.min(points.length - 1, Math.max(0, (current ?? (move > 0 ? -1 : points.length)) + move)))
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect && rect.width !== renderedWidth) setRenderedWidth(rect.width)
  }

  const current = active === null ? null : points[active]
  const rows =
    active === null
      ? []
      : multi
        ? series!
            .map((s, si) => ({ key: s.key, name: s.name, color: seriesColor(si), value: s.values[active] ?? 0 }))
            .sort((a, b) => b.value - a.value)
        : []
  // Hộp số liệu: bám theo con trỏ theo chiều dọc, lật sang trái khi gần mép phải để không tràn khỏi biểu đồ.
  const scale = renderedWidth > 0 ? renderedWidth / width : 1
  const anchorX = active === null ? 0 : x(active) * scale
  const flip = active !== null && x(active) > width * 0.6
  const topValue = active === null ? 0 : multi ? Math.max(...series!.map((s) => s.values[active] ?? 0)) : points[active].value
  const anchorY = Math.min(HEIGHT - 24, Math.max(24, pointerY ?? y(topValue)))
  const [header, ...lines] = current ? current.detail.split(" · ") : []

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
        <div style={{ position: "relative", minWidth: width }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            style={{ width: "100%", minWidth: width, height: HEIGHT, display: "block", outline: "none", cursor: "crosshair", touchAction: "pan-x" }}
            aria-label={`${title}. Dùng phím mũi tên trái, phải để xem từng mốc.`}
            role="group"
            tabIndex={0}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setActive(null)}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            data-testid="report-chart"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={60} x2={width - 8} y1={y(t)} y2={y(t)} stroke={t === 0 ? palette.textSubtle : palette.line} />
                <text x={55} y={y(t) + 4} textAnchor="end" fontSize={11} fill={palette.textMuted}>
                  {format(t)}
                </text>
              </g>
            ))}
            {active !== null && (
              <line
                data-testid="chart-guide"
                x1={x(active)}
                x2={x(active)}
                y1={PLOT_TOP}
                y2={PLOT_TOP + PLOT_HEIGHT}
                stroke={palette.textSubtle}
                strokeDasharray="4 3"
                pointerEvents="none"
              />
            )}
            {multi
              ? series!.map((s, si) => (
                  <g key={s.key} data-series={s.key} pointerEvents="none">
                    <polyline fill="none" stroke={seriesColor(si)} strokeWidth={2} strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
                    {s.values.map((v, i) => (
                      <circle
                        key={i}
                        cx={x(i)}
                        cy={y(v)}
                        r={i === active ? 5 : 2.5}
                        fill={seriesColor(si)}
                        stroke={i === active ? palette.surface : "none"}
                        strokeWidth={2}
                      />
                    ))}
                  </g>
                ))
              : mode === "line" && (
                  <polyline
                    fill="none"
                    stroke={palette.brandPrimary}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    pointerEvents="none"
                    points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
                  />
                )}
            {points.map((p, i) => (
              <g key={p.key} data-key={p.key} data-value={p.value} data-negative={p.value < 0} data-active={i === active || undefined} pointerEvents="none">
                {multi ? null : mode === "line" ? (
                  <circle
                    cx={x(i)}
                    cy={y(p.value)}
                    r={i === active ? 5.5 : 3}
                    fill={palette.brandPrimary}
                    stroke={i === active ? palette.surface : "none"}
                    strokeWidth={2}
                  />
                ) : (
                  <rect
                    x={x(i) - step * 0.32}
                    y={Math.min(y(0), y(p.value))}
                    width={step * 0.64}
                    height={Math.abs(y(p.value) - y(0))}
                    rx={Math.min(3, step * 0.1)}
                    opacity={active === null || i === active ? 1 : 0.45}
                    fill={
                      p.value < 0
                        ? palette.error.text
                        : highlightPeak && p.value === singlePeak && singlePeak > 0
                          ? palette.success.text
                          : palette.brandPrimary
                    }
                  />
                )}
                {(i % Math.max(1, Math.ceil(54 / step)) === 0 || points.length === 1 || i === active) && (
                  <text
                    x={x(i)}
                    y={176}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={i === active ? 700 : 400}
                    fill={i === active ? palette.textStrong : palette.textMuted}
                  >
                    {p.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
          {current && (
            <div
              data-testid="chart-tooltip"
              role="presentation"
              style={{
                position: "absolute",
                left: anchorX,
                top: anchorY,
                transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, -50%)`,
                transition: "left 90ms ease-out, top 90ms ease-out",
                pointerEvents: "none",
                background: palette.surface,
                border: `1px solid ${palette.line}`,
                borderRadius: 10,
                boxShadow: `0 6px 18px color-mix(in srgb, ${palette.ink} 16%, transparent)`,
                padding: "8px 10px",
                fontSize: 12.5,
                lineHeight: 1.55,
                whiteSpace: "nowrap",
                zIndex: 2,
              }}
            >
              {multi ? (
                <>
                  <div style={{ fontWeight: 700, color: palette.textStrong, marginBottom: 2 }}>{current.label}</div>
                  {rows.map((row) => (
                    <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: row.color }} />
                      <span style={{ color: palette.textMuted, flex: 1 }}>{row.name}</span>
                      <b style={{ color: palette.textStrong, marginLeft: 12 }}>{full(row.value)}</b>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, color: palette.textStrong, marginBottom: 2 }}>{header}</div>
                  {lines.map((line, i) => (
                    <div key={i} style={{ color: i === 0 ? palette.textStrong : palette.textMuted, fontWeight: i === 0 ? 600 : 400 }}>
                      {line}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <figcaption style={{ minHeight: 20, fontSize: 13, color: palette.textMuted }}>
        {highlightPeak && singlePeak > 0
          ? "Cao điểm: " +
            points
              .filter((p) => p.value === singlePeak)
              .map((p) => p.label)
              .join(", ") +
            " · " +
            format(singlePeak) +
            " đơn"
          : "Rê chuột lên biểu đồ để xem số liệu từng mốc."}
        <span aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          {current?.detail ?? ""}
        </span>
      </figcaption>
    </figure>
  )
}
