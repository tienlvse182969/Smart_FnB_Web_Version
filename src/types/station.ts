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

/** Loại màn hình ghép bằng mã 6 số (BE `DisplayDeviceType`): màn hình khách gắn quầy, màn hình gọi số gắn chi nhánh (BR-45). */
export type DisplayKind = "CUSTOMER_DISPLAY" | "CALLING_DISPLAY";

/** Màn hình đã ghép vào quầy (không có token). */
export type StationDevice = {
  id: string;
  type: DisplayKind;
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

/**
 * Màn hình đã ghép của chi nhánh (`GET /display-devices`, MANAGER; BE `fb7cae9`, #28): cả màn hình khách (gắn quầy) lẫn màn hình gọi số
 * (không quầy), KỂ CẢ máy đã thu hồi. Không có token thiết bị.
 */
export type BranchDevice = {
  id: string;
  type: DisplayKind;
  name: string | null;
  /** Tên quầy (màn hình khách); null với màn hình gọi số. */
  stationName: string | null;
  pairedAt: string;
  lastSeenAt: string | null;
  /** Hạn token (30 ngày kể từ lúc ghép); null nếu BE không trả. */
  tokenExpiresAt: string | null;
  revokedAt: string | null;
};

/** Trạng thái hiển thị của một màn hình: đang dùng, đã thu hồi, hoặc token hết hạn (cần ghép lại). */
export type BranchDeviceState = "ACTIVE" | "REVOKED" | "EXPIRED";

/** Thân `PATCH /stations/:stationId` (`UpdateStationDto`, BE `fb7cae9`, #27). Chỉ gửi trường đổi. */
export type StationPatch = {
  name?: string;
  status?: StationStatus;
  printerConnection?: PrinterConnection;
  /** Không gửi khi `printerConnection = NONE` (BE đặt null). */
  printerAddress?: string;
};

/** Dữ liệu tạo quầy (`POST /stations`, `CreateStationDto`). `printerAddress` chỉ gửi khi có máy in. */
export type StationInput = {
  name: string;
  printerConnection: PrinterConnection;
  printerAddress?: string;
};
