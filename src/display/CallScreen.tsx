import { useCallback, useEffect, useRef, useState } from "react"
import { Volume2, Wifi, WifiOff } from "lucide-react"
import {
  CALLING_EVENT_PREFIX,
  createCallingDisplayPairing,
  getCallingDisplayContext,
  type CallingDisplayContext,
} from "../api/modules/callingDisplay"
import { resolveDisplayAsset } from "../api/modules/customerDisplay"
import { describeApiError } from "../api/http/errors"
import {
  backoffDelay,
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

function call(value: number | null) {
  return value === null ? "---" : String(value).padStart(3, "0")
}
function beep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const audio = new AudioContextClass()
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()
  oscillator.frequency.value = 880
  gain.gain.setValueAtTime(0.2, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6)
  oscillator.connect(gain).connect(audio.destination)
  // Màn chạy cả ngày: mỗi tiếng bíp tạo một AudioContext, không đóng thì trình duyệt chặn sau vài lần (QĐ 108).
  oscillator.onended = () => void audio.close()
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.6)
}

/**
 * Màn hình gọi số (TV/tablet ở khu nhận món, không đăng nhập). Giữ token thiết bị riêng (`api/device/session.ts`), gọi API qua client
 * thiết bị (`api/http/deviceClient.ts`) và nhận sự kiện qua kết nối `/operations` dùng chung (`useDeviceRealtime`). Quyết định 105–108.
 */
export default function CallScreen() {
  const [pairing, setPairing] = useState<StoredPairing | null>(() =>
    loadPairing(),
  )
  const [context, setContext] = useState<CallingDisplayContext | null>(null)
  const [sound, setSound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [codeFailures, setCodeFailures] = useState(0)
  const soundRef = useRef(sound)
  soundRef.current = sound
  const readyNumbers = useRef(new Set<number>())
  const creating = useRef(false)
  /** Tải lại ngữ cảnh ngay (do vòng hỏi trong effect đăng ký); socket và tab hiện lại gọi qua đây. */
  const refreshRef = useRef<() => void>(() => undefined)
  const liveRef = useRef(false)

  const createCode = useCallback(async () => {
    if (creating.current) return
    creating.current = true
    try {
      const next = await createCallingDisplayPairing()
      const stored: StoredPairing = { ...next, issuedAt: Date.now(), paired: false }
      savePairing(stored)
      setPairing(stored)
      setContext(null)
      setError(null)
      setCodeFailures(0)
    } catch (reason) {
      setError(describeApiError(reason))
      setCodeFailures((count) => count + 1)
    } finally {
      creating.current = false
    }
  }, [])

  // Chưa có mã: tạo mã; lỗi thì thử lại giãn cách 5s, 10s, 20s… tối đa 60s (QĐ 107), không dồn dập.
  useEffect(() => {
    if (pairing) return
    const timer = window.setTimeout(
      () => void createCode(),
      codeFailures === 0 ? 0 : backoffDelay(codeFailures),
    )
    return () => window.clearTimeout(timer)
  }, [createCode, pairing, codeFailures])

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
    const back = (text: string) => {
      stopped = true
      savePairing(null)
      readyNumbers.current = new Set()
      setNotice(text)
      setContext(null)
      setPairing(null)
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
        back(CODE_EXPIRED_TEXT)
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
        }
        const nextReady = new Set(
          next.ready.flatMap((order) =>
            order.callNumber === null ? [] : [order.callNumber],
          ),
        )
        if (
          soundRef.current &&
          [...nextReady].some((number) => !readyNumbers.current.has(number))
        )
          beep()
        readyNumbers.current = nextReady
        setContext(next)
        setError(null)
        setNotice(null)
      } catch (reason) {
        if (stopped) return
        const verdict = classifyContextFailure(reason, current)
        if (verdict === "revoked") {
          back(REVOKED_TEXT)
          return
        }
        if (verdict === "code-expired") {
          back(CODE_EXPIRED_TEXT)
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
    if (realtime.rejected || (wasOnline.current && realtime.status === "disconnected"))
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

  if (!context)
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
            <p data-testid="call-error" className="mt-4 text-red-600">
              {error}
            </p>
          ) : null}
          {error && !pairing ? (
            <button
              className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-white"
              onClick={() => void createCode()}
            >
              Thử lại
            </button>
          ) : null}
        </section>
      </main>
    )
  const { branding, branch } = context
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <header className="mb-6 flex items-center justify-between rounded-2xl bg-white px-7 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          {branding.logoUrl ? (
            <img
              className="h-14 w-14 object-contain"
              src={resolveDisplayAsset(branding.logoUrl) ?? ""}
              alt=""
            />
          ) : null}
          <div>
            <h1 className="text-2xl font-black">{branding.displayName}</h1>
            <p className="text-slate-500">{branch.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-xl border px-4 py-2"
            onClick={() => {
              beep()
              setSound(true)
            }}
          >
            <Volume2 size={18} />
            {sound ? "Âm thanh đã bật" : "Bật âm thanh"}
          </button>
          <span
            data-testid="call-status"
            data-status={realtime.status}
            data-exhausted={realtime.exhausted}
            className={`flex items-center gap-2 ${
              online ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {online ? <Wifi size={18} /> : <WifiOff size={18} />}
            {online
              ? "Trực tuyến"
              : realtime.exhausted
                ? "Mất kết nối, đang thử lại"
                : "Đang kết nối"}
          </span>
        </div>
      </header>
      {error ? (
        <div
          data-testid="call-error"
          className="mb-5 rounded-xl bg-red-50 p-4 text-red-700"
        >
          {error}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-6">
        <section className="min-h-[70vh] rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="mb-6 text-center text-3xl font-black text-slate-600">
            ĐANG PHA
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {context.preparing.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-slate-100 p-5 text-center text-5xl font-black"
              >
                {call(order.callNumber)}
              </div>
            ))}
          </div>
          {!context.preparing.length ? (
            <p className="mt-20 text-center text-xl text-slate-400">
              Chưa có đơn đang pha
            </p>
          ) : null}
        </section>
        <section className="min-h-[70vh] rounded-3xl bg-emerald-50 p-7 shadow-sm">
          <h2 className="mb-6 text-center text-3xl font-black text-emerald-700">
            MỜI NHẬN
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {context.ready.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl bg-emerald-600 p-6 text-center text-6xl font-black text-white shadow-lg"
              >
                {call(order.callNumber)}
              </div>
            ))}
          </div>
          {!context.ready.length ? (
            <p className="mt-20 text-center text-xl text-emerald-700/50">
              Chưa có đơn sẵn sàng
            </p>
          ) : null}
        </section>
      </div>
    </main>
  )
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}
