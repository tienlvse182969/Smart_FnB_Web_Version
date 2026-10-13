import { useCallback, useEffect, useRef, useState } from "react"
import { Volume2, VolumeX, Wifi, WifiOff } from "lucide-react"
import {
  CALLING_EVENT_PREFIX,
  createCallingDisplayPairing,
  getCallingDisplayContext,
  type CallingDisplayContext,
  type CallingOrder,
} from "../api/modules/callingDisplay"
import { resolveDisplayAsset } from "../api/modules/customerDisplay"
import { ApiError, describeApiError } from "../api/http/errors"
import {
  classifyContextFailure,
  CODE_EXPIRED_TEXT,
  isCodeExpired,
  loadPairing,
  nextPollDelay,
  RECONNECT_AFTER_EXHAUSTED_MS,
  REVOKED_TEXT,
  savePairing,
  type StoredPairing,
} from "../api/device/session"
import { useDeviceRealtime } from "../api/realtime/useDeviceRealtime"
import { pickReadableTextColor } from "../theme"
import {
  addHighlights,
  boardOrders,
  digitScale,
  EXPIRED_STREAK_LIMIT,
  fitToCapacity,
  formatCallNumber,
  nextCodeDelay,
  nextHighlightExpiry,
  newlyReady,
  PREPARING_CAPACITY,
  pruneHighlights,
  READY_CAPACITY,
  type Highlights,
} from "./callBoard"
import { callChime, isSoundRemembered } from "./chime"

const HEX = /^#[0-9a-fA-F]{6}$/

function useChimeRunning(): boolean {
  const [running, setRunning] = useState(callChime.isRunning())
  useEffect(() => {
    const off = callChime.onChange(setRunning)
    if (isSoundRemembered()) void callChime.restore()
    return off
  }, [])
  return running
}

/**
 * Màn hình gọi số (TV/tablet ở khu nhận món, không đăng nhập). Giữ token thiết bị riêng (`api/device/session.ts`), gọi API qua client
 * thiết bị (`api/http/deviceClient.ts`) và nhận sự kiện qua kết nối `/operations` dùng chung (`useDeviceRealtime`). Quyết định 105–114.
 * Bố cục/logic hiển thị: `callBoard.ts`; âm báo: `chime.ts`.
 */
export default function CallScreen() {
  const [pairing, setPairing] = useState<StoredPairing | null>(() =>
    loadPairing(),
  )
  const [context, setContext] = useState<CallingDisplayContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [codeFailures, setCodeFailures] = useState(0)
  const [expiredStreak, setExpiredStreak] = useState(0)
  const [lit, setLit] = useState<Highlights>({})
  const soundOn = useChimeRunning()
  /** Tập số "Mời nhận" của lần nạp trước; null = chưa nạp (lần đầu không số nào là "mới gọi"). */
  const readyNumbers = useRef<Set<number> | null>(null)
  const creating = useRef(false)
  /** Tải lại ngữ cảnh ngay (do vòng hỏi trong effect đăng ký); socket và tab hiện lại gọi qua đây. */
  const refreshRef = useRef<() => void>(() => undefined)
  const liveRef = useRef(false)

  const createCode = useCallback(async () => {
    if (creating.current) return
    creating.current = true
    try {
      const next = await createCallingDisplayPairing()
      const stored: StoredPairing = {
        ...next,
        issuedAt: Date.now(),
        paired: false,
      }
      savePairing(stored)
      setPairing(stored)
      setContext(null)
      setError(null)
      setCodeFailures(0)
    } catch (reason) {
      setError(describeApiError(reason))
      // 429 (#70: BE giới hạn 10 mã/phút/địa chỉ): nhảy thẳng tới nhịp 60 giây, không lặp dồn dập.
      const tooMany = reason instanceof ApiError && reason.status === 429
      setCodeFailures((count) => (tooMany ? Math.max(count + 1, 5) : count + 1))
    } finally {
      creating.current = false
    }
  }, [])

  // Chưa có mã: tạo mã; lỗi thì thử lại giãn cách 5s…60s (QĐ 107); 3 mã hết hạn liên tiếp thì mỗi 5 phút một mã (QĐ 113).
  useEffect(() => {
    if (pairing) return
    const timer = window.setTimeout(
      () => void createCode(),
      nextCodeDelay({ failures: codeFailures, expiredStreak }),
    )
    return () => window.clearTimeout(timer)
  }, [createCode, pairing, codeFailures, expiredStreak])

  // Vòng hỏi ngữ cảnh: chờ ghép (3s) → đã ghép (10s, 30s khi socket đang nối); lỗi thì giãn cách tăng dần.
  const token = pairing?.deviceToken ?? null
  useEffect(() => {
    if (!pairing) return
    let current = pairing
    let stopped = false
    let inFlight = false
    let again = false
    let failures = 0
    let timer: number | undefined
    const back = (text: string, expired: boolean) => {
      stopped = true
      savePairing(null)
      readyNumbers.current = null
      setNotice(text)
      setContext(null)
      setPairing(null)
      if (expired) setExpiredStreak((count) => count + 1)
    }
    const schedule = () => {
      if (stopped) return
      window.clearTimeout(timer)
      timer = window.setTimeout(
        () => void run(),
        nextPollDelay({
          failures,
          paired: !!current.paired,
          live: liveRef.current,
        }),
      )
    }
    const run = async (): Promise<void> => {
      if (stopped) return
      if (inFlight) {
        again = true
        return
      }
      window.clearTimeout(timer)
      // Chưa ghép mà mã đã hết hạn: token này không bao giờ dùng được nữa, không cần hỏi BE.
      if (!current.paired && isCodeExpired(current)) {
        back(CODE_EXPIRED_TEXT, true)
        return
      }
      inFlight = true
      try {
        const next = await getCallingDisplayContext(current.deviceToken)
        if (stopped) return
        failures = 0
        if (!current.paired) {
          current = { ...current, paired: true }
          savePairing(current)
          setExpiredStreak(0)
        }
        const readyNow = boardOrders(next.ready, "readyAt").map(
          (order) => order.callNumber as number,
        )
        const fresh = newlyReady(readyNumbers.current, readyNow)
        readyNumbers.current = new Set(readyNow)
        if (fresh.length) {
          const now = Date.now()
          setLit((prev) => addHighlights(pruneHighlights(prev, now), fresh, now))
          callChime.ring() // một âm cho mọi số mới của lần nạp này; chime tự chặn chồng tiếng
        }
        setContext(next)
        setError(null)
        setNotice(null)
      } catch (reason) {
        if (stopped) return
        const verdict = classifyContextFailure(reason, current)
        if (verdict === "revoked") {
          back(REVOKED_TEXT, false)
          return
        }
        if (verdict === "code-expired") {
          back(CODE_EXPIRED_TEXT, true)
          return
        }
        if (verdict === "waiting") failures = 0
        else {
          failures += 1
          setError(describeApiError(reason))
        }
      } finally {
        inFlight = false
      }
      if (again) {
        again = false
        void run()
      } else schedule()
    }
    refreshRef.current = () => void run()
    void run()
    return () => {
      stopped = true
      window.clearTimeout(timer)
      refreshRef.current = () => undefined
    }
  }, [pairing?.deviceToken])

  // Tắt nhấn mạnh khi hết 10 giây (một bộ đếm cho cả tập).
  useEffect(() => {
    const expiry = nextHighlightExpiry(lit)
    if (expiry === null) return
    const timer = window.setTimeout(
      () => setLit((prev) => pruneHighlights(prev, Date.now())),
      Math.max(50, expiry - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [lit])

  // Chưa bật âm: cú chạm bất kỳ trên màn hình mở khoá (nhân viên chạm một lần khi lắp đặt).
  useEffect(() => {
    if (soundOn) return
    const unlock = () => void callChime.unlock()
    window.addEventListener("pointerdown", unlock)
    window.addEventListener("keydown", unlock)
    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [soundOn])

  const realtime = useDeviceRealtime(() => refreshRef.current(), {
    token,
    enabled: context !== null,
    isRelevant: (event) => !!event.type?.startsWith(CALLING_EVENT_PREFIX),
  })
  const online = realtime.status === "connected"
  liveRef.current = online
  // Socket rớt hoặc bị máy chủ ngắt: kiểm tra bằng REST ngay (403 = đã thu hồi → về bước ghép), đồng thời nhịp hỏi ngắn lại.
  const wasOnline = useRef(false)
  useEffect(() => {
    if (context === null) {
      wasOnline.current = false
      return
    }
    if (online) {
      wasOnline.current = true
      return
    }
    if (
      realtime.rejected ||
      (wasOnline.current && realtime.status === "disconnected")
    )
      refreshRef.current()
  }, [online, realtime.rejected, realtime.status, context !== null])
  // Hết lượt tự nối: trên TV không có ai bấm "Kết nối lại" nên tự thử lại theo nhịp 30s.
  useEffect(() => {
    if (!realtime.exhausted) return
    const timer = window.setTimeout(
      () => realtime.reconnect(),
      RECONNECT_AFTER_EXHAUSTED_MS,
    )
    return () => window.clearTimeout(timer)
  }, [realtime.exhausted, realtime.reconnect])

  if (!context) {
    const slow = !pairing && expiredStreak >= EXPIRED_STREAK_LIMIT
    return (
      <main className="mx-auto flex min-h-screen w-full items-center justify-center bg-slate-950 p-8 text-white">
        <section className="w-full max-w-xl rounded-3xl bg-white p-10 text-center text-slate-900 shadow-2xl">
          <p className="font-semibold tracking-widest text-slate-500">
            MÀN HÌNH GỌI SỐ
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            Ghép màn hình với chi nhánh
          </h1>
          <p className="mt-2 text-slate-500">
            Nhập mã này trong phần quản lý màn hình gọi số.
          </p>
          {notice ? (
            <p
              data-testid="call-notice"
              className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-800"
            >
              {notice}
            </p>
          ) : null}
          {pairing?.paired ? (
            // Đã ghép từ trước (F5 / khởi động lại): chưa đọc được ngữ cảnh thì KHÔNG hiện mã cũ, chỉ báo đang nối lại.
            <p
              data-testid="call-loading"
              className="my-8 text-2xl font-semibold text-slate-600"
            >
              Đang kết nối lại với chi nhánh…
            </p>
          ) : (
            <>
              <div
                data-testid="call-pairing-code"
                className="my-8 font-mono text-7xl font-black tracking-[0.18em]"
              >
                {pairing?.code ?? "------"}
              </div>
              <p className="text-sm text-slate-500">
                Mã có hiệu lực trong 5 phút
              </p>
            </>
          )}
          {error ? (
            <p data-testid="call-error" className="mt-4 text-red-700">
              {error}
            </p>
          ) : null}
          {slow ? (
            <button
              data-testid="call-refetch"
              className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-4 text-lg font-semibold text-white"
              onClick={() => void createCode()}
            >
              Chạm để lấy mã mới
            </button>
          ) : null}
          {error && !pairing && !slow ? (
            <button
              className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-white"
              onClick={() => void createCode()}
            >
              Thử lại
            </button>
          ) : null}
          <button
            data-testid="call-sound-enable"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-400 px-4 py-2 text-slate-800"
            onClick={() => void callChime.unlock()}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {soundOn ? "Âm thanh đã bật" : "Bật âm thanh"}
          </button>
        </section>
      </main>
    )
  }

  const { branding, branch } = context
  const primary = HEX.test(branding.primaryColor) ? branding.primaryColor : null
  const headerStyle = primary
    ? { background: primary, color: pickReadableTextColor(primary) }
    : undefined
  const preparing = fitToCapacity(
    boardOrders(context.preparing, "submittedAt"),
    PREPARING_CAPACITY,
    context.counts?.preparing,
  )
  const ready = fitToCapacity(
    boardOrders(context.ready, "readyAt"),
    READY_CAPACITY,
    context.counts?.ready,
  )
  // Lỗi REST (mất mạng/5xx) hoặc socket hết lượt nối: GIỮ bảng cuối, chỉ đổi chỉ báo (QĐ 114).
  const offline = error !== null || (!online && realtime.exhausted)
  const nowMs = Date.now()
  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      <header
        data-testid="call-header"
        style={headerStyle}
        className={`flex h-[12vh] shrink-0 items-center justify-between px-[2vw] ${primary ? "" : "bg-slate-800 text-white"}`}
      >
        <div className="flex min-w-0 items-center gap-[1.5vw]">
          {branding.logoUrl ? (
            <img
              className="h-[8vh] w-[8vh] object-contain"
              src={resolveDisplayAsset(branding.logoUrl) ?? ""}
              alt=""
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-[4.4vh] leading-tight font-black">
              {branding.displayName}
            </h1>
            <p className="truncate text-[2.4vh] opacity-90">{branch.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-[1.5vw] text-[2.2vh] font-semibold">
          {!soundOn ? (
            <span
              data-testid="call-sound-off"
              className="flex items-center gap-[0.6vw] rounded-full bg-slate-950/70 px-[1.2vw] py-[0.6vh] text-white"
            >
              <VolumeX size={18} /> Âm thanh tắt
            </span>
          ) : null}
          <span
            data-testid="call-status"
            data-status={realtime.status}
            data-exhausted={realtime.exhausted}
            data-offline={offline}
            className={`flex items-center gap-[0.6vw] rounded-full px-[1.2vw] py-[0.6vh] ${
              offline
                ? "bg-amber-300 text-slate-950"
                : "bg-slate-950/70 text-white"
            }`}
          >
            {online && !offline ? <Wifi size={18} /> : <WifiOff size={18} />}
            {offline
              ? "Mất kết nối, đang thử lại"
              : online
                ? "Trực tuyến"
                : "Đang kết nối"}
          </span>
        </div>
      </header>
      {error ? (
        <p data-testid="call-error" className="sr-only">
          {error}
        </p>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-[4fr_5fr] gap-[1.5vw] p-[1.5vw]">
        <section
          data-testid="call-preparing"
          className="flex min-h-0 flex-col rounded-[2vh] bg-slate-800 p-[1.5vh]"
        >
          <h2 className="mb-[1vh] text-center text-[3.2vh] font-black tracking-wide text-slate-100">
            ĐANG CHUẨN BỊ
          </h2>
          {preparing.shown.length === 0 && preparing.hidden === 0 ? (
            <p className="m-auto text-[2.6vh] text-slate-300">
              Chưa có đơn đang chuẩn bị
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-5 gap-[1vh]">
              {preparing.shown.map((order: CallingOrder) => {
                const text = formatCallNumber(order.callNumber as number)
                return (
                  <div
                    key={order.id}
                    data-testid="call-cell"
                    data-number={order.callNumber}
                    className="flex items-center justify-center overflow-hidden rounded-[1.4vh] bg-white font-black text-slate-950 tabular-nums"
                    style={{
                      fontSize: `calc(min(7vh, 4.4vw) * ${digitScale(text)})`,
                    }}
                  >
                    {text}
                  </div>
                )
              })}
              {preparing.hidden > 0 ? (
                <div
                  data-testid="call-more"
                  className="flex items-center justify-center rounded-[1.4vh] border-2 border-slate-300 text-[2.4vh] font-bold text-slate-100"
                >
                  +{preparing.hidden} số khác
                </div>
              ) : null}
            </div>
          )}
        </section>
        <section
          data-testid="call-ready"
          className="flex min-h-0 flex-col rounded-[2vh] bg-emerald-950 p-[1.5vh] ring-[0.5vh] ring-emerald-400"
        >
          <h2 className="mb-[1vh] text-center text-[4.4vh] font-black tracking-wide text-emerald-200">
            MỜI NHẬN MÓN
          </h2>
          {ready.shown.length === 0 && ready.hidden === 0 ? (
            <p className="m-auto text-[2.8vh] text-emerald-200">
              Chưa có đơn sẵn sàng
            </p>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-[1.2vh]">
              {ready.shown.map((order: CallingOrder) => {
                const text = formatCallNumber(order.callNumber as number)
                const isLit = (lit[order.callNumber as number] ?? 0) > nowMs
                return (
                  <div
                    key={order.id}
                    data-testid="call-cell"
                    data-number={order.callNumber}
                    data-lit={isLit}
                    className={`flex items-center justify-center overflow-hidden rounded-[1.6vh] bg-emerald-800 font-black text-white tabular-nums transition-transform ${
                      isLit
                        ? "call-lit z-10 ring-[0.8vh] ring-amber-300"
                        : ""
                    }`}
                    style={{
                      fontSize: `calc(min(10vh, 7vw) * ${digitScale(text)})`,
                    }}
                  >
                    {text}
                  </div>
                )
              })}
              {ready.hidden > 0 ? (
                <div
                  data-testid="call-more"
                  className="flex items-center justify-center rounded-[1.6vh] border-2 border-emerald-300 text-[3vh] font-bold text-emerald-100"
                >
                  +{ready.hidden} số khác
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
