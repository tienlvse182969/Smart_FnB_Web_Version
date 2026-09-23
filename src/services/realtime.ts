import { io, type Socket } from "socket.io-client"
import { getAccessToken, getApiOrigin } from "./api"

export type OperationsEvent = {
  type: string
  branchId?: string
  chainId?: string
  occurredAt: string
  data?: unknown
}

let socket: Socket | null = null

export function connectOperationsRealtime(
  onUpdate: (event: OperationsEvent) => void,
): void {
  disconnectOperationsRealtime()
  const origin = getApiOrigin()
  const token = getAccessToken()
  if (!origin || !token) return

  socket = io(`${origin}/operations`, {
    path: import.meta.env.VITE_REALTIME_PATH || "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  })
  socket.on("operations.updated", onUpdate)
}

export function disconnectOperationsRealtime(): void {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
