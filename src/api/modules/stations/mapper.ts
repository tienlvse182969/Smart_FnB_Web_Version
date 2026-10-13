/**
 * Mapper whitelist cho `GET /stations`. Chỉ chép trường của `Station`/`StationDevice`; mọi trường khác của BE
 * (`branchId`, `cartVersion`, `createdAt`, `updatedAt`, và bất cứ thứ gì BE thêm sau này, kể cả token thiết bị) bị bỏ.
 */
import type { BranchDevice, BranchDeviceState, PrinterConnection, Station, StationDevice, StationStatus } from "../../../types";

export interface RawStation {
  id: string;
  name: string;
  status: string;
  printerConnection: string;
  printerAddress: string | null;
  displayDevices?: { id: string; type: string; name: string | null; pairedAt: string; lastSeenAt: string | null }[];
}

const CONNECTIONS: PrinterConnection[] = ["NONE", "WIFI", "BLUETOOTH"];

export function mapDevice(raw: NonNullable<RawStation["displayDevices"]>[number]): StationDevice {
  return {
    id: raw.id,
    type: raw.type === "CALLING_DISPLAY" ? "CALLING_DISPLAY" : "CUSTOMER_DISPLAY",
    name: raw.name ?? null,
    pairedAt: raw.pairedAt,
    lastSeenAt: raw.lastSeenAt ?? null,
  };
}

/** Một dòng của `GET /display-devices` (BE `stations.service.ts` `listDisplayDevices`). */
export interface RawBranchDevice {
  id: string;
  type: string;
  name: string | null;
  station?: { id: string; name: string; status?: string } | null;
  pairedAt: string;
  lastSeenAt: string | null;
  tokenExpiresAt?: string | null;
  revokedAt: string | null;
}

export function mapBranchDevice(raw: RawBranchDevice): BranchDevice {
  return {
    id: raw.id,
    type: raw.type === "CALLING_DISPLAY" ? "CALLING_DISPLAY" : "CUSTOMER_DISPLAY",
    name: raw.name ?? null,
    stationName: raw.station?.name ?? null,
    pairedAt: raw.pairedAt,
    lastSeenAt: raw.lastSeenAt ?? null,
    tokenExpiresAt: raw.tokenExpiresAt ?? null,
    revokedAt: raw.revokedAt ?? null,
  };
}

/** Thu hồi trước, rồi hết hạn token; còn lại là đang dùng. */
export function branchDeviceState(d: Pick<BranchDevice, "revokedAt" | "tokenExpiresAt">, now: number = Date.now()): BranchDeviceState {
  if (d.revokedAt) return "REVOKED";
  if (d.tokenExpiresAt) {
    const at = Date.parse(d.tokenExpiresAt);
    if (Number.isFinite(at) && at <= now) return "EXPIRED";
  }
  return "ACTIVE";
}

export function mapStation(raw: RawStation): Station {
  return {
    id: raw.id,
    name: raw.name,
    // Trạng thái lạ coi như ngừng dùng (an toàn hơn là coi là đang dùng).
    status: (raw.status === "ACTIVE" ? "ACTIVE" : "INACTIVE") as StationStatus,
    printerConnection: CONNECTIONS.includes(raw.printerConnection as PrinterConnection) ? (raw.printerConnection as PrinterConnection) : "NONE",
    printerAddress: raw.printerAddress ?? null,
    devices: (raw.displayDevices ?? []).map(mapDevice),
  };
}
