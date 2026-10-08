import { useCallback, useEffect, useRef, useState } from "react"
import { Volume2, Wifi, WifiOff } from "lucide-react"
import type { Socket } from "socket.io-client"
import {
  connectCallingDisplay,
  createCallingDisplayPairing,
  getCallingDisplayContext,
  type CallingDisplayContext,
} from "../api/modules/callingDisplay"
import {
  DisplayApiError,
  resolveDisplayAsset,
  type PairingRequest,
} from "../api/modules/customerDisplay"

const STORAGE_KEY = "smartfnb.callingDisplay"
function storedPairing(): PairingRequest | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as PairingRequest | null
    return value?.deviceToken ? value : null
  } catch {
    return null
  }
}
function savePairing(value: PairingRequest | null) {
  if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  else localStorage.removeItem(STORAGE_KEY)
}
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
  oscillator.start()
  oscillator.stop(audio.currentTime + 0.6)
}

export default function CallScreen() {
  const [pairing, setPairing] = useState<PairingRequest | null>(() =>
    storedPairing(),
  )
  const [context, setContext] = useState<CallingDisplayContext | null>(null)
  const [online, setOnline] = useState(false)
  const [sound, setSound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const readyNumbers = useRef(new Set<number>())
  const creating = useRef(false)
  const socket = useRef<Socket | null>(null)
  const createCode = useCallback(async () => {
    if (creating.current) return
    creating.current = true
    try {
      const next = await createCallingDisplayPairing()
      savePairing(next)
      setPairing(next)
      setContext(null)
      setError(null)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tạo mã ghép nối",
      )
    } finally {
      creating.current = false
    }
  }, [])
  const refresh = useCallback(async () => {
    if (!pairing) return
    try {
      const next = await getCallingDisplayContext(pairing.deviceToken)
      const nextReady = new Set(
        next.ready.flatMap((order) =>
          order.callNumber === null ? [] : [order.callNumber],
        ),
      )
      if (
        sound &&
        [...nextReady].some((number) => !readyNumbers.current.has(number))
      )
        beep()
      readyNumbers.current = nextReady
      setContext(next)
      setError(null)
    } catch (reason) {
      const expired = Date.parse(pairing.expiresAt) <= Date.now()
      if (
        reason instanceof DisplayApiError &&
        reason.status === 403 &&
        expired
      ) {
        savePairing(null)
        setPairing(null)
      } else if (!(reason instanceof DisplayApiError) || reason.status !== 403)
        setError(
          reason instanceof Error
            ? reason.message
            : "Không thể tải màn hình gọi số",
        )
    }
  }, [pairing, sound])
  useEffect(() => {
    if (!pairing) void createCode()
  }, [createCode, pairing])
  useEffect(() => {
    if (!pairing) return
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5_000)
    return () => window.clearInterval(timer)
  }, [pairing, refresh])
  useEffect(() => {
    if (!pairing || !context) return
    socket.current?.disconnect()
    const active = connectCallingDisplay(
      pairing.deviceToken,
      () => void refresh(),
      () => {
        savePairing(null)
        setPairing(null)
        setContext(null)
      },
    )
    active.on("connect", () => setOnline(true))
    active.on("disconnect", () => setOnline(false))
    socket.current = active
    return () => active.disconnect()
  }, [context !== null, pairing, refresh])

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
          <div className="my-8 font-mono text-7xl font-black tracking-[0.18em]">
            {pairing?.code ?? "------"}
          </div>
          <p className="text-sm text-slate-500">Mã có hiệu lực trong 5 phút</p>
          {error ? <p className="mt-4 text-red-600">{error}</p> : null}
          {error ? (
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
            className={`flex items-center gap-2 ${
              online ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {online ? <Wifi size={18} /> : <WifiOff size={18} />}
            {online ? "Trực tuyến" : "Đang kết nối"}
          </span>
        </div>
      </header>
      {error ? (
        <div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">
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
