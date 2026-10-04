import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "../../config";

export type CustomerDisplayItem = {
  key: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  options: string[];
  note?: string;
};

export type CustomerDisplaySnapshot = {
  state: "IDLE" | "CART" | "PAYMENT_PENDING" | "PAYMENT_QR" | "PAID";
  items: CustomerDisplayItem[];
  totalAmount: number;
  orderCode?: string;
  callNumber?: number;
  paymentMethod?: string;
  qrCode?: string;
  qrExpiresAt?: string;
};

export type CustomerDisplayContext = {
  station: { id: string; name: string };
  branch: { id: string; name: string };
  currency: string;
  branding: {
    displayName: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  version: number;
  snapshot: CustomerDisplaySnapshot;
};

export type PairingRequest = {
  pairingId: string;
  code: string;
  deviceToken: string;
  expiresAt: string;
};

export class DisplayApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as { message?: string } | T | null;
  if (!response.ok) {
    throw new DisplayApiError(
      response.status,
      body && "message" in body && typeof body.message === "string" ? body.message : "Không thể kết nối màn hình",
    );
  }
  return body as T;
}

export async function createCustomerDisplayPairing(): Promise<PairingRequest> {
  const response = await fetch(`${API_BASE_URL}/device-pairing/codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceType: "CUSTOMER_DISPLAY" }),
  });
  return responseJson(response);
}

export async function getCustomerDisplayContext(token: string): Promise<CustomerDisplayContext> {
  const response = await fetch(`${API_BASE_URL}/public/customer-display/context`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return responseJson(response);
}

export function connectCustomerDisplay(
  token: string,
  onUpdate: (data: CustomerDisplaySnapshot & { stationId: string; version: number }) => void,
  onRevoked: () => void,
): Socket {
  const origin = new URL(API_BASE_URL, window.location.origin).origin;
  const socket = io(`${origin}/operations`, {
    path: import.meta.env.VITE_REALTIME_PATH || "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  socket.on("operations.updated", (event: { data?: unknown }) => {
    if (event.data && typeof event.data === "object") {
      onUpdate(event.data as CustomerDisplaySnapshot & { stationId: string; version: number });
    }
  });
  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") onRevoked();
  });
  return socket;
}

export function resolveDisplayAsset(url: string | null): string | null {
  if (!url) return null;
  return new URL(url, new URL(API_BASE_URL, window.location.origin).origin).toString();
}
