/**
 * Âm báo gọi số (QĐ 112). Web Audio, không file âm, không thư viện.
 *  - MỘT AudioContext cho cả đời trang (tạo mới mỗi tiếng sẽ bị Chrome chặn sau vài cái);
 *  - trình duyệt chỉ cho phát sau một cú chạm: `unlock()` gọi từ nút "Bật âm thanh" hoặc cú chạm bất kỳ; đã bật thì nhớ ở
 *    `localStorage` (sau F5 thử mở lại, nếu trình duyệt vẫn chặn thì hiện "Âm thanh tắt" cho tới cú chạm kế tiếp);
 *  - nhiều số gọi cùng lúc/liên tiếp trong `minGapMs` chỉ kêu MỘT lần, không chồng tiếng.
 */
export const SOUND_STORAGE_KEY = "smartfnb.callingDisplay.sound"

export function isSoundRemembered(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function remember(on: boolean): void {
  try {
    if (on) localStorage.setItem(SOUND_STORAGE_KEY, "1")
    else localStorage.removeItem(SOUND_STORAGE_KEY)
  } catch {
    // Storage bị chặn: chỉ không nhớ được sau F5.
  }
}

/** Phần của AudioContext mà chime dùng (để test thay bằng giả). */
export interface ChimeContext {
  state: string
  currentTime: number
  destination: unknown
  resume(): Promise<void>
  createOscillator(): {
    frequency: { value: number }
    connect(node: unknown): unknown
    start(at?: number): void
    stop(at?: number): void
  }
  createGain(): {
    gain: {
      setValueAtTime(value: number, at: number): unknown
      exponentialRampToValueAtTime(value: number, at: number): unknown
    }
    connect(node: unknown): unknown
  }
}

export interface ChimeOptions {
  makeContext?: () => ChimeContext
  now?: () => number
  minGapMs?: number
}

export interface Chime {
  /** Cú chạm của người dùng: tạo/mở context. Trả true nếu đang chạy được. */
  unlock(): Promise<boolean>
  /** Thử mở lại khi đã nhớ "bật" (chưa có cú chạm): có thể vẫn bị chặn. */
  restore(): Promise<boolean>
  /** Kêu một tiếng (hai nốt). false = đang tắt/bị chặn, hoặc còn trong khoảng giãn (không chồng). */
  ring(): boolean
  isRunning(): boolean
  onChange(listener: (running: boolean) => void): () => void
}

export function createChime({
  makeContext = () => {
    const w = window as unknown as {
      AudioContext?: new () => unknown
      webkitAudioContext?: new () => unknown
    }
    const Ctor = w.AudioContext ?? w.webkitAudioContext
    if (!Ctor) throw new Error("Trình duyệt không có Web Audio")
    return new Ctor() as ChimeContext
  },
  now = () => Date.now(),
  minGapMs = 1500,
}: ChimeOptions = {}): Chime {
  let context: ChimeContext | null = null
  let lastRing = Number.NEGATIVE_INFINITY
  let last: boolean | null = null
  const listeners = new Set<(running: boolean) => void>()
  const running = () => context?.state === "running"
  const emit = () => {
    const value = running()
    if (value === last) return
    last = value
    for (const listener of [...listeners]) listener(value)
  }
  const open = async (): Promise<boolean> => {
    try {
      context ??= makeContext()
      if (context.state !== "running") await context.resume()
    } catch {
      // Không có Web Audio hoặc bị chặn.
    }
    emit()
    return running()
  }
  return {
    async unlock() {
      const ok = await open()
      if (ok) remember(true)
      return ok
    },
    restore: open,
    ring() {
      if (!context || !running()) return false
      const at = now()
      if (at - lastRing < minGapMs) return false
      lastRing = at
      const t = context.currentTime
      const gain = context.createGain()
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
      gain.connect(context.destination)
      for (const [index, frequency] of [880, 1175].entries()) {
        const osc = context.createOscillator()
        osc.frequency.value = frequency
        osc.connect(gain)
        osc.start(t + index * 0.28)
        osc.stop(t + index * 0.28 + 0.4)
      }
      return true
    },
    isRunning: running,
    onChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/** Dùng chung cho cả trang. */
export const callChime: Chime = createChime()
