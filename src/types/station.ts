/**
 * Quầy thu tiền và máy in (BM-01, đặc tả 11.10), bám `GET /stations` của BE (stations.service.ts `list`).
 * Chỉ giữ trường màn hình cần: KHÔNG có `branchId`, `cartVersion`, ngày tạo/sửa, và KHÔNG bao giờ có token thiết bị
 * (mapper `api/modules/stations/mapper.ts` là whitelist).
 */

/** Kiểu kết nối máy in (BE `PrinterConnectionType`). */
export type PrinterConnection = "NONE" | "WIFI" | "BLUETOOTH";

export const PRINTER_CONNECTION_LABEL: Record<PrinterConnection, string> = {
  NONE: "Chưa khai báo",
  WIFI: "WiFi (IP)",
  BLUETOOTH: "Bluetooth (MAC)",
};

/** Trạng thái quầy (BE `PosStationStatus`): quầy mới tạo là ACTIVE (schema.prisma `PosStation.status @default(ACTIVE)`). */
export type StationStatus = "ACTIVE" | "INACTIVE";

/** Màn hình đã ghép vào quầy (không có token). */
export type StationDevice = {
  id: string;
  type: "CUSTOMER_DISPLAY" | "CALLING_DISPLAY";
  name: string | null;
  pairedAt: string;
  lastSeenAt: string | null;
};

export type Station = {
  id: string;
  name: string;
  status: StationStatus;
  printerConnection: PrinterConnection;
  printerAddress: string | null;
  devices: StationDevice[];
};

/** Dữ liệu tạo quầy (`POST /stations`, `CreateStationDto`). `printerAddress` chỉ gửi khi có máy in. */
export type StationInput = {
  name: string;
  printerConnection: PrinterConnection;
  printerAddress?: string;
};
