import { beforeEach, describe, expect, it, vi } from "vitest"
import { SOUND_STORAGE_KEY, createChime, isSoundRemembered, type ChimeContext } from "./chime"

function fakeContext(initial = "suspended") {
  const oscillators: number[] = []
  const ctx: ChimeContext & { created: number } = {
    created: 0,
    state: initial,
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {
      ctx.state = "running"
    }),
    createOscillator: () => {
      const osc = { frequency: { value: 0 }, connect: () => undefined, start: () => oscillators.push(osc.frequency.value), stop: () => undefined }
      return osc
    },
    createGain: () => ({ gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined }, connect: () => undefined }),
  }
  return { ctx, oscillators }
}

describe("âm báo gọi số (QĐ 112)", () => {
  beforeEach(() => localStorage.clear())

  it("chưa chạm thì không kêu và chỉ báo tắt; chạm một lần thì chạy và được nhớ", async () => {
    const { ctx } = fakeContext()
    const chime = createChime({ makeContext: () => ctx })
    const seen: boolean[] = []
    chime.onChange((v) => seen.push(v))
    expect(chime.ring()).toBe(false)
    expect(isSoundRemembered()).toBe(false)
    expect(await chime.unlock()).toBe(true)
    expect(isSoundRemembered()).toBe(true)
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe("1")
    expect(seen).toEqual([true])
    expect(chime.ring()).toBe(true)
  })

  it("nhiều số gọi cùng lúc: MỘT âm, không chồng tiếng; sau khoảng giãn kêu lại được", async () => {
    let t = 10_000
    const { ctx, oscillators } = fakeContext()
    const chime = createChime({ makeContext: () => ctx, now: () => t, minGapMs: 1500 })
    await chime.unlock()
    expect(chime.ring()).toBe(true)
    t += 200
    expect(chime.ring()).toBe(false)
    t += 600
    expect(chime.ring()).toBe(false)
    expect(oscillators).toHaveLength(2) // đúng một tiếng (hai nốt)
    t += 1000
    expect(chime.ring()).toBe(true)
    expect(oscillators).toHaveLength(4)
  })

  it("dùng MỘT AudioContext cho mọi tiếng; trình duyệt chặn thì restore không bật được và không ném lỗi", async () => {
    let made = 0
    const blocked = fakeContext()
    blocked.ctx.resume = vi.fn(async () => undefined) // vẫn suspended
    const chime = createChime({
      makeContext: () => {
        made++
        return blocked.ctx
      },
    })
    expect(await chime.restore()).toBe(false)
    expect(await chime.restore()).toBe(false)
    expect(made).toBe(1)
    expect(await chime.unlock()).toBe(false)
    expect(isSoundRemembered()).toBe(false)
  })

  it("không có Web Audio: không ném lỗi", async () => {
    const chime = createChime({
      makeContext: () => {
        throw new Error("không có Web Audio")
      },
    })
    expect(await chime.unlock()).toBe(false)
    expect(chime.ring()).toBe(false)
  })
})
