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
