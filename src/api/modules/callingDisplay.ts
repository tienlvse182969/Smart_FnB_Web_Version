import { deviceRequest } from "../http/deviceClient"
import type { PairingRequest } from "./customerDisplay"

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

/** `POST /device-pairing/codes` (công khai, `stations.controller.ts:24-29`): mã 6 số hết hạn sau 5 phút + token thiết bị. */
export function createCallingDisplayPairing(): Promise<PairingRequest> {
  return deviceRequest("/device-pairing/codes", {
    method: "POST",
    body: { deviceType: "CALLING_DISPLAY" },
  })
}

/** `GET /public/calling-display/context` bằng token thiết bị (`stations.service.ts:103-180`). 403 = chưa ghép hoặc đã thu hồi. */
export function getCallingDisplayContext(
  token: string,
): Promise<CallingDisplayContext> {
  return deviceRequest("/public/calling-display/context", { token })
}

/** Sự kiện socket làm danh sách số thay đổi (`counter-operations.controller.ts:158-332`, `counter-payment-settlement.service.ts:235`). */
export const CALLING_EVENT_PREFIX = "calling.order."
