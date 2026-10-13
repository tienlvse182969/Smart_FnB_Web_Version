/**
 * Quy tắc nhập quầy và máy in — việc kiểm ĐỊNH DẠNG là của web vì BE chỉ kiểm địa chỉ không rỗng khi có máy in
 * (stations.service.ts:51-52). Một nguồn cho form, mock và (sau này) kiểm trước khi gửi.
 *
 * Đặc tả 11.10 (dòng 1104): Bluetooth là "chọn máy đã ghép Bluetooth trên tablet POS", không phải gõ ở web. BE lại BẮT BUỘC
 * có địa chỉ cho Bluetooth nên web tạm có ô nhập MAC; khi POS chọn máy thì bỏ ô này (api-contract-plan #34).
 */
import type { PrinterConnection, Station, StationInput, StationPatch } from "../../../types";

export const STATION_NAME_MAX = 100; // CreateStationDto.name @MaxLength(100)
export const PRINTER_ADDRESS_MAX = 255; // CreateStationDto.printerAddress @MaxLength(255)

/** IPv4 `a.b.c.d`, mỗi số 0–255, có thể kèm cổng `:1–65535` (máy in nhiệt hay dùng 9100). */
export function isIpv4(value: string): boolean {
  const m = value.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/);
  if (!m) return false;
  if (![m[1], m[2], m[3], m[4]].every((o) => String(Number(o)) === o && Number(o) <= 255)) return false;
  return m[5] === undefined || (Number(m[5]) >= 1 && Number(m[5]) <= 65535);
}

/** MAC `XX:XX:XX:XX:XX:XX` (hex, dấu hai chấm). */
export function isMac(value: string): boolean {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(value.trim());
}

/** Địa chỉ gửi đi: bỏ khoảng trắng, MAC viết hoa. */
export function normalizeAddress(connection: PrinterConnection, address: string): string {
  const trimmed = address.trim();
  return connection === "BLUETOOTH" ? trimmed.toUpperCase() : trimmed;
}

/**
 * Lỗi nhập quầy (rỗng = hợp lệ). `existing` là các quầy hiện có của chi nhánh, dùng báo trùng tên sớm: BE có ràng buộc duy nhất
 * (chi nhánh, tên) nhưng không bắt lỗi trùng ở `create` nên trả 500 (api-contract-plan #34) — web chặn trước.
 */
export function validateStationInput(input: { name: string; printerConnection: PrinterConnection; printerAddress?: string }, existing: Pick<Station, "name">[] = []): string[] {
  const errors: string[] = [];
  const name = input.name.trim();
  if (!name) errors.push("Nhập tên quầy");
  else if (name.length > STATION_NAME_MAX) errors.push(`Tên quầy tối đa ${STATION_NAME_MAX} ký tự`);
  else if (existing.some((s) => s.name.trim() === name)) errors.push("Tên quầy đã có trong chi nhánh");

  const address = (input.printerAddress ?? "").trim();
  if (input.printerConnection === "WIFI") {
    if (!address) errors.push("Nhập địa chỉ IP của máy in");
    else if (!isIpv4(address)) errors.push("Địa chỉ IP không hợp lệ (ví dụ 192.168.1.50 hoặc 192.168.1.50:9100)");
  } else if (input.printerConnection === "BLUETOOTH") {
    if (!address) errors.push("Nhập địa chỉ MAC của máy in");
    else if (!isMac(address)) errors.push("Địa chỉ MAC không hợp lệ (dạng XX:XX:XX:XX:XX:XX)");
  }
  if (address.length > PRINTER_ADDRESS_MAX) errors.push(`Địa chỉ máy in tối đa ${PRINTER_ADDRESS_MAX} ký tự`);
  return errors;
}

/**
 * Thân `PATCH /stations/:stationId` đúng `UpdateStationDto`: chỉ trường có trong `patch`; tên trim; địa chỉ chuẩn hoá theo kiểu máy in
 * và KHÔNG gửi khi chuyển sang `NONE` (BE đặt null). Đổi sang WiFi/Bluetooth mà thiếu địa chỉ thì BE trả 400.
 */
export function toPatchBody(patch: StationPatch): StationPatch {
  const body: StationPatch = {};
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.printerConnection !== undefined) {
    body.printerConnection = patch.printerConnection;
    if (patch.printerConnection !== "NONE" && patch.printerAddress !== undefined) {
      body.printerAddress = normalizeAddress(patch.printerConnection, patch.printerAddress);
    }
  } else if (patch.printerAddress !== undefined) {
    body.printerAddress = patch.printerAddress.trim();
  }
  return body;
}

/**
 * Lỗi nhập khi SỬA quầy (rỗng = hợp lệ): cùng luật với tạo, nhưng tên trùng chỉ tính với quầy KHÁC. `existing` gồm cả quầy đang sửa.
 */
export function validateStationPatch(
  current: Pick<Station, "id" | "name">,
  next: { name: string; printerConnection: PrinterConnection; printerAddress?: string },
  existing: Pick<Station, "id" | "name">[] = [],
): string[] {
  return validateStationInput(next, existing.filter((s) => s.id !== current.id));
}

/** Thân `POST /stations` đúng DTO của BE: không gửi `printerAddress` khi không có máy in. */
export function toCreateBody(input: StationInput): { name: string; printerConnection: PrinterConnection; printerAddress?: string } {
  const body: { name: string; printerConnection: PrinterConnection; printerAddress?: string } = {
    name: input.name.trim(),
    printerConnection: input.printerConnection,
  };
  if (input.printerConnection !== "NONE") body.printerAddress = normalizeAddress(input.printerConnection, input.printerAddress ?? "");
  return body;
}
