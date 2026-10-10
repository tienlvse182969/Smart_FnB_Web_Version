import { useEffect, useRef, useState } from "react"
import { Bell, CheckCircle2, Clock3, Volume2, XCircle } from "lucide-react"
import { useParams } from "react-router-dom"
import {
  getPublicOrderStatus,
  TrackingApiError,
  type PublicOrderStatus,
} from "../api/modules/orderTracking"
import { resolveDisplayAsset } from "../api/modules/customerDisplay"

function beep() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const audio = new AudioContextClass()
  const oscillator = audio.createOscillator()
  oscillator.frequency.value = 880
  oscillator.connect(audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.45)
}

export default function OrderTrackingScreen() {
  const { token = "" } = useParams()
  const [order, setOrder] = useState<PublicOrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const notified = useRef(false)
  useEffect(() => {
    let active = true
    let timer = 0
    const poll = async () => {
      try {
        const next = await getPublicOrderStatus(token)
        if (!active) return
        setOrder(next)
        setError(null)
        if (
          enabled &&
          next.displayStatus === "READY_FOR_PICKUP" &&
          !notified.current
        ) {
          notified.current = true
          beep()
          navigator.vibrate?.([400, 150, 400])
        }
        if (["DELIVERED", "CANCELLED"].includes(next.displayStatus)) return
        timer = window.setTimeout(
          poll,
          Math.max(3, next.pollAfterSeconds) * 1_000,
        )
      } catch (reason) {
        if (!active) return
        setError(
          reason instanceof TrackingApiError && reason.status === 410
            ? "Link theo dõi đã hết hạn."
            : "Không thể tải trạng thái đơn. Đang thử lại…",
        )
        if (
          !(reason instanceof TrackingApiError) ||
          ![404, 410].includes(reason.status)
        )
          timer = window.setTimeout(poll, 8_000)
      }
    }
    void poll()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [enabled, token])
  const enable = async () => {
    beep()
    setEnabled(true)
    try {
      await (navigator as Navigator & {
        wakeLock?: { request(type: "screen"): Promise<unknown> }
      }).wakeLock?.request("screen")
    } catch {
      /* best effort */
    }
  }
  const status = order?.displayStatus
  const ready = status === "READY_FOR_PICKUP"
  const delivered = status === "DELIVERED"
  const cancelled = status === "CANCELLED"
  return (
    <main
      className={`flex min-h-screen items-center justify-center p-5 ${
        ready ? "bg-emerald-600" : "bg-slate-100"
      }`}
    >
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl">
        {order?.branding.logoUrl ? (
          <img
            className="mx-auto mb-3 h-16 w-16 object-contain"
            src={resolveDisplayAsset(order.branding.logoUrl) ?? ""}
            alt=""
          />
        ) : null}
        <h1 className="text-2xl font-black">
          {order?.branding.displayName ?? "Theo dõi đơn"}
        </h1>
        {order ? <p className="text-slate-500">{order.branch.name}</p> : null}
        <div className="my-7 text-sm font-bold tracking-widest text-slate-500">
          ĐƠN SỐ
        </div>
        <div
          className={`text-8xl font-black ${
            ready ? "text-emerald-600" : "text-slate-900"
          }`}
        >
          {order?.callNumber == null
            ? "---"
            : String(order.callNumber).padStart(3, "0")}
        </div>
        <div className="my-8 flex flex-col items-center gap-3">
          {ready ? (
            <>
              <Bell className="text-emerald-600" size={48} />
              <h2 className="text-3xl font-black text-emerald-700">
                Mời nhận món
              </h2>
            </>
          ) : delivered ? (
            <>
              <CheckCircle2 className="text-emerald-600" size={48} />
              <h2 className="text-2xl font-bold">Đã nhận món</h2>
            </>
          ) : cancelled ? (
            <>
              <XCircle className="text-red-600" size={48} />
              <h2 className="text-2xl font-bold text-red-700">Đơn đã huỷ</h2>
            </>
          ) : (
            <>
              <Clock3 className="text-amber-500" size={48} />
              <h2 className="text-2xl font-bold">Đang pha</h2>
            </>
          )}
        </div>
        {!enabled && !delivered && !cancelled ? (
          <button
            className="mx-auto flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-4 font-semibold text-white"
            onClick={() => void enable()}
          >
            <Volume2 size={20} />
            Bấm để bật thông báo
          </button>
        ) : null}
        {enabled && !delivered && !cancelled ? (
          <p className="text-sm text-slate-500">
            Đã bật âm báo. Vui lòng giữ trang này mở.
          </p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>
        ) : null}
      </section>
    </main>
  )
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}
