/**
 * Logic thuần của bảng số gọi (QĐ 109–113), tách khỏi `CallScreen` để test đơn vị.
 * Nguồn dữ liệu: `GET /public/calling-display/context` — `preparing` = SUBMITTED + PREPARING (BE gộp, `stations.service.ts:141`),
 * `ready` = READY; mỗi cột tối đa 30 số, sắp CŨ trước (`submittedAt`/`readyAt` tăng dần).
 */
import type { CallingOrder } from "../api/modules/callingDisplay"
import { backoffDelay } from "../api/device/session"

/** Số nhiều nhất hiện ở mỗi cột (kể cả ô "+N số khác"): theo lưới 5×3 và 4×2 của `CallScreen`. */
export const PREPARING_CAPACITY = 15
export const READY_CAPACITY = 8
/** Số vừa chuyển sang "Mời nhận" được nhấn mạnh trong khoảng này (QĐ 112). */
export const HIGHLIGHT_MS = 10_000
/** Sau chừng này mã hết hạn liên tiếp mà chưa ai ghép thì giãn nhịp tạo mã (QĐ 113). */
export const EXPIRED_STREAK_LIMIT = 3
export const SLOW_CODE_MS = 5 * 60_000

/** 007, 042, 123; ≥ 1000 hiện đủ ("1234"), không cắt. */
export function formatCallNumber(value: number): string {
  return String(value).padStart(3, "0")
}

/** Hệ số co chữ để số dài không vỡ ô: 1–3 chữ số giữ nguyên, 4 chữ số ×0.75, 5 ×0.6… */
export function digitScale(text: string): number {
  return text.length <= 3 ? 1 : 3 / text.length
}

/** Bỏ đơn chưa có số gọi; số MỚI NHẤT ở trên (QĐ 109). `field` = cột thời gian của cột đang xếp. */
export function boardOrders(
  orders: CallingOrder[],
  field: "submittedAt" | "readyAt",
): CallingOrder[] {
  const time = (order: CallingOrder) => {
    const at = Date.parse(order[field] ?? "")
    return Number.isNaN(at) ? 0 : at
  }
  return orders
    .filter((order) => order.callNumber !== null)
    .map((order, index) => ({ order, index }))
    .sort((a, b) => time(b.order) - time(a.order) || b.index - a.index)
    .map(({ order }) => order)
}

/**
 * Vừa đủ ô: vượt `capacity` thì dành MỘT ô cuối cho "+N số khác" (N tính cả số bị ẩn), nên hiện `capacity - 1` số.
 */
export function fitToCapacity<T>(
  items: T[],
  capacity: number,
  /**
   * Tổng số BE đếm được (`counts`, #71, BE `fb7cae9`) — BE chỉ trả tối đa `pageLimit` (30) số mỗi cột, nên tổng thật có thể lớn hơn
   * `items.length`. Thiếu hoặc nhỏ hơn số đang có thì bỏ qua (BE cũ).
   */
  total?: number,
): { shown: T[]; hidden: number } {
  const all = Math.max(items.length, typeof total === "number" && Number.isFinite(total) ? Math.trunc(total) : 0)
  if (all <= capacity) return { shown: items, hidden: 0 }
  const shown = items.slice(0, Math.max(0, capacity - 1))
  return { shown, hidden: all - shown.length }
}

/** Số có mặt ở `next` mà chưa ở `previous`. `previous` null = lần nạp đầu: không số nào là "mới gọi". */
export function newlyReady(
  previous: ReadonlySet<number> | null,
  next: readonly number[],
): number[] {
  if (previous === null) return []
  return next.filter((value) => !previous.has(value))
}

/** Số → thời điểm hết nhấn mạnh (ms). */
export type Highlights = Record<number, number>

export function addHighlights(
  lit: Highlights,
  numbers: readonly number[],
  now: number,
): Highlights {
  if (!numbers.length) return lit
  const next = { ...lit }
  for (const value of numbers) next[value] = now + HIGHLIGHT_MS
  return next
}

export function pruneHighlights(lit: Highlights, now: number): Highlights {
  const entries = Object.entries(lit).filter(([, until]) => until > now)
  return entries.length === Object.keys(lit).length
    ? lit
    : Object.fromEntries(entries)
}

/** Thời điểm hết hạn gần nhất, hoặc null khi không còn số nào được nhấn mạnh. */
export function nextHighlightExpiry(lit: Highlights): number | null {
  const times = Object.values(lit)
  return times.length ? Math.min(...times) : null
}

/** Chờ bao lâu trước khi tự tạo mã mới: lỗi thì giãn 5s→60s; đã 3 mã hết hạn liên tiếp thì 5 phút (QĐ 113). */
export function nextCodeDelay({
  failures,
  expiredStreak,
}: {
  failures: number
  expiredStreak: number
}): number {
  const backoff = failures > 0 ? backoffDelay(failures) : 0
  const slow = expiredStreak >= EXPIRED_STREAK_LIMIT ? SLOW_CODE_MS : 0
  return Math.max(backoff, slow)
}
