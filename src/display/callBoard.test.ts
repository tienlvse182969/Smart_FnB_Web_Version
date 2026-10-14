import { describe, expect, it } from "vitest"
import type { CallingOrder } from "../api/modules/callingDisplay"
import {
  HIGHLIGHT_MS,
  addHighlights,
  boardOrders,
  digitScale,
  fitToCapacity,
  formatCallNumber,
  newlyReady,
  nextCodeDelay,
  nextHighlightExpiry,
  pruneHighlights,
  SLOW_CODE_MS,
} from "./callBoard"

const order = (id: string, callNumber: number | null, at: string): CallingOrder => ({
  id,
  callNumber,
  status: "READY",
  submittedAt: at,
  readyAt: at,
})

describe("số gọi (QĐ 111)", () => {
  it("đệm 3 chữ số, ≥ 1000 hiện đủ", () => {
    expect(formatCallNumber(7)).toBe("007")
    expect(formatCallNumber(123)).toBe("123")
    expect(formatCallNumber(1234)).toBe("1234")
    expect(formatCallNumber(100000)).toBe("100000")
  })
  it("số dài co chữ để không vỡ ô", () => {
    expect(digitScale("007")).toBe(1)
    expect(digitScale("1234")).toBe(0.75)
    expect(digitScale("12345")).toBeCloseTo(0.6)
  })
})

describe("thứ tự: số mới nhất ở trên (QĐ 109)", () => {
  it("sắp theo thời gian giảm dần, bỏ đơn chưa có số, ổn định khi trùng giờ", () => {
    const list = [
      order("a", 1, "2026-10-11T08:00:00Z"),
      order("b", null, "2026-10-11T08:09:00Z"),
      order("c", 3, "2026-10-11T08:05:00Z"),
      order("d", 4, "2026-10-11T08:05:00Z"),
    ]
    expect(boardOrders(list, "readyAt").map((o) => o.id)).toEqual(["d", "c", "a"])
  })
  it("giờ hỏng/null xếp cuối, không ném lỗi", () => {
    const list = [{ ...order("x", 9, "không phải ngày"), readyAt: null }, order("y", 2, "2026-10-11T08:00:00Z")]
    expect(boardOrders(list, "readyAt").map((o) => o.id)).toEqual(["y", "x"])
  })
})

describe("tràn: '+N số khác' (QĐ 111)", () => {
  it("vừa thì hiện hết", () => {
    expect(fitToCapacity([1, 2, 3], 8)).toEqual({ shown: [1, 2, 3], hidden: 0 })
    expect(fitToCapacity([1, 2, 3, 4, 5, 6, 7, 8], 8)).toEqual({ shown: [1, 2, 3, 4, 5, 6, 7, 8], hidden: 0 })
  })
  it("vượt thì dành một ô cuối cho '+N' (N gồm cả số bị ẩn)", () => {
    const items = Array.from({ length: 60 }, (_, i) => i)
    const r = fitToCapacity(items, 8)
    expect(r.shown).toHaveLength(7)
    expect(r.hidden).toBe(53)
    expect(r.shown.length + r.hidden).toBe(60)
    expect(fitToCapacity([1, 2, 3, 4, 5, 6, 7, 8, 9], 8)).toEqual({ shown: [1, 2, 3, 4, 5, 6, 7], hidden: 2 })
  })
})

describe("nhấn mạnh số mới gọi (QĐ 112)", () => {
  it("lần nạp đầu không số nào là mới; sau đó chỉ số chưa có ở lần trước", () => {
    expect(newlyReady(null, [1, 2, 3])).toEqual([])
    expect(newlyReady(new Set([1, 2]), [1, 2, 3, 4])).toEqual([3, 4])
    expect(newlyReady(new Set([1, 2]), [2])).toEqual([])
  })
  it("hết sau HIGHLIGHT_MS (10 giây); số cũ không bị đụng", () => {
    const t = 1_000_000
    let lit = addHighlights({}, [3], t)
    lit = addHighlights(lit, [], t + 1)
    expect(lit).toEqual({ 3: t + HIGHLIGHT_MS })
    expect(HIGHLIGHT_MS).toBe(10_000)
    lit = addHighlights(lit, [5], t + 4000)
    expect(nextHighlightExpiry(lit)).toBe(t + HIGHLIGHT_MS)
    expect(pruneHighlights(lit, t + HIGHLIGHT_MS - 1)).toBe(lit)
    expect(pruneHighlights(lit, t + HIGHLIGHT_MS)).toEqual({ 5: t + 4000 + HIGHLIGHT_MS })
    expect(pruneHighlights(lit, t + 99_999)).toEqual({})
    expect(nextHighlightExpiry({})).toBeNull()
  })
})

describe("nhịp tạo mã (QĐ 113)", () => {
  it("bình thường tạo ngay; lỗi giãn 5s…60s; 3 mã hết hạn liên tiếp thì 5 phút", () => {
    expect(nextCodeDelay({ failures: 0, expiredStreak: 0 })).toBe(0)
    expect(nextCodeDelay({ failures: 0, expiredStreak: 2 })).toBe(0)
    expect(nextCodeDelay({ failures: 2, expiredStreak: 0 })).toBe(10_000)
    expect(nextCodeDelay({ failures: 0, expiredStreak: 3 })).toBe(SLOW_CODE_MS)
    expect(nextCodeDelay({ failures: 9, expiredStreak: 5 })).toBe(SLOW_CODE_MS)
  })
})
