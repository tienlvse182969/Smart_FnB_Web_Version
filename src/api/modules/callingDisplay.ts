import { io, type Socket } from "socket.io-client"
import { API_BASE_URL } from "../../config"
import { DisplayApiError, type PairingRequest } from "./customerDisplay"

export type CallingOrder = {
  id: string
  callNumber: number | null
  status: "SUBMITTED" | "PREPARING" | "READY"
  submittedAt: string
  readyAt: string | null
}
export type CallingDisplayContext = {
  branch: { name: string }
  branding: {
    displayName: string
    logoUrl: string | null
    primaryColor: string
    secondaryColor: string
    accentColor: string
  }
  preparing: CallingOrder[]
  ready: CallingOrder[]
  serverTime: string
}

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    const text = (body as { message?: unknown } | null)?.message
    throw new DisplayApiError(
      response.status,
      typeof text === "string" ? text : "Không thể kết nối màn hình gọi số",
    )
  }
  return body as T
}

export async function createCallingDisplayPairing(): Promise<PairingRequest> {
  return json(
    await fetch(`${API_BASE_URL}/device-pairing/codes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceType: "CALLING_DISPLAY" }),
    }),
  )
}

export async function getCallingDisplayContext(
  token: string,
): Promise<CallingDisplayContext> {
  return json(
    await fetch(`${API_BASE_URL}/public/calling-display/context`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  )
}

export function connectCallingDisplay(
  token: string,
  onUpdate: () => void,
  onRevoked: () => void,
): Socket {
  const origin = new URL(API_BASE_URL, window.location.origin).origin
  const socket = io(`${origin}/operations`, {
    path: import.meta.env.VITE_REALTIME_PATH || "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  })
  socket.on("operations.updated", (event: { type?: string }) => {
    if (event.type?.startsWith("calling.order.")) onUpdate()
  })
  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") onRevoked()
  })
  return socket
}
