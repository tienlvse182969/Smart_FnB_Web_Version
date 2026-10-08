import { API_BASE_URL } from "../../config"

export type PublicOrderStatus = {
  callNumber: number | null
  status: string
  displayStatus: "PREPARING" | "READY_FOR_PICKUP" | "DELIVERED" | "CANCELLED"
  branch: { name: string }
  branding: { displayName: string logoUrl: string | null primaryColor: string }
  readyAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  updatedAt: string
  pollAfterSeconds: number
}
export class TrackingApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export async function getPublicOrderStatus(
  token: string,
): Promise<PublicOrderStatus> {
  const response = await fetch(
    `${API_BASE_URL}/public/track/${encodeURIComponent(token)}`,
    { cache: "no-store" },
  )
  const body = (await response
    .json()
    .catch(() => null)) as PublicOrderStatus | { message?: string } | null
  if (!response.ok)
    throw new TrackingApiError(
      response.status,
      body && "message" in body && typeof body.message === "string"
        ? body.message
        : "Không thể tải trạng thái đơn",
    )
  return body as PublicOrderStatus
}
