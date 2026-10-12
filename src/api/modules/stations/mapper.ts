/**
 * Mapper whitelist cho `GET /stations`. Chỉ chép trường của `Station`/`StationDevice`; mọi trường khác của BE
 * (`branchId`, `cartVersion`, `createdAt`, `updatedAt`, và bất cứ thứ gì BE thêm sau này, kể cả token thiết bị) bị bỏ.
 */
import type { PrinterConnection, Station, StationDevice, StationStatus } from "../../../types";

export interface RawStation {
  id: string;
  name: string;
  status: string;
  printerConnection: string;
  printerAddress: string | null;
  displayDevices?: { id: string; type: string; name: string | null; pairedAt: string; lastSeenAt: string | null }[];
}

export type RawDevice = NonNullable<RawStation["displayDevices"]>[number] & {
  tokenExpiresAt?: string;
  revokedAt?: string | null;
  stationId?: string | null;
  station?: { id: string; name: string; status: string } | null;
};

const CONNECTIONS: PrinterConnection[] = ["NONE", "WIFI", "BLUETOOTH"];

export function mapDevice(raw: RawDevice): StationDevice {
  return {
    id: raw.id,
    type: raw.type === "CALLING_DISPLAY" ? "CALLING_DISPLAY" : "CUSTOMER_DISPLAY",
    name: raw.name ?? null,
    pairedAt: raw.pairedAt,
    lastSeenAt: raw.lastSeenAt ?? null,
    ...(raw.tokenExpiresAt !== undefined ? { tokenExpiresAt: raw.tokenExpiresAt } : {}),
    ...(raw.revokedAt !== undefined ? { revokedAt: raw.revokedAt } : {}),
    ...(raw.stationId !== undefined ? { stationId: raw.stationId } : {}),
    ...(raw.station !== undefined
      ? { station: raw.station ? { id: raw.station.id, name: raw.station.name, status: raw.station.status === "ACTIVE" ? "ACTIVE" : "INACTIVE" } : null }
      : {}),
  };
}

export function mapStation(raw: RawStation): Station {
  return {
    id: raw.id,
    name: raw.name,
    // Trạng thái lạ coi như ngừng dùng (an toàn hơn là coi là đang dùng).
    status: (raw.status === "ACTIVE" ? "ACTIVE" : "INACTIVE") as StationStatus,
    printerConnection: CONNECTIONS.includes(raw.printerConnection as PrinterConnection) ? (raw.printerConnection as PrinterConnection) : "NONE",
    printerAddress: raw.printerAddress ?? null,
    devices: (raw.displayDevices ?? []).map(({ id, type, name, pairedAt, lastSeenAt }) =>
      mapDevice({ id, type, name, pairedAt, lastSeenAt }),
    ),
  };
}
