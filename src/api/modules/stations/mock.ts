import type { Station, StationDevice } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { genId, nowISO } from "../../mock/util";
import type { StationsApi } from "./index";
import { BE_PAIRING_INVALID } from "./pairing";
import { consumeMockPairingCode } from "./pairingMock";
import { toCreateBody } from "./rules";

/** Quầy mock theo chi nhánh; lần đầu gặp một chi nhánh thì có sẵn 2 quầy mẫu (một quầy có màn hình khách đã ghép). */
const byBranch = new Map<string, Station[]>();

function stationsOf(branchId: string): Station[] {
  let list = byBranch.get(branchId);
  if (!list) {
    list = [
      {
        id: genId("mock-st"),
        name: "Quầy 1",
        status: "ACTIVE",
        printerConnection: "WIFI",
        printerAddress: "192.168.1.50:9100",
        devices: [
          {
            id: genId("mock-dv"),
            type: "CUSTOMER_DISPLAY",
            name: "Tablet khách quầy 1",
            pairedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
            lastSeenAt: new Date(Date.now() - 5 * 60_000).toISOString(),
          },
        ],
      },
      { id: genId("mock-st"), name: "Quầy 2", status: "ACTIVE", printerConnection: "NONE", printerAddress: null, devices: [] },
    ];
    byBranch.set(branchId, list);
  }
  return list;
}

export const stationsMock: StationsApi = {
  async listStations(branchId) {
    await mockDelay();
    return stationsOf(branchId)
      .map((s) => ({ ...s, devices: [...s.devices] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async createStation(branchId, input) {
    await mockDelay();
    assertMockWritable();
    const body = toCreateBody(input);
    // Cùng lỗi như BE: máy in WiFi/Bluetooth thiếu địa chỉ → 400 (stations.service.ts:51-52).
    if (body.printerConnection !== "NONE" && !body.printerAddress) throw new ApiError(400, "Printer address is required for WiFi or Bluetooth");
    const list = stationsOf(branchId);
    // BE có ràng buộc duy nhất (chi nhánh, tên) nhưng `create` không bắt lỗi trùng nên thật ra trả 500 (api-contract-plan #34);
    // mock trả 409 như BE nên làm. Web đã báo trùng tên trước khi gọi.
    if (list.some((s) => s.name === body.name)) throw new ApiError(409, "A station with this name already exists in the branch");
    const station: Station = {
      id: genId("mock-st"),
      name: body.name,
      status: "ACTIVE",
      printerConnection: body.printerConnection,
      printerAddress: body.printerAddress ?? null,
      devices: [],
    };
    list.push(station);
    return { ...station };
  },

  async pairCustomerDisplay(branchId, stationId, code, deviceName) {
    await mockDelay();
    assertMockWritable();
    const station = stationsOf(branchId).find((s) => s.id === stationId && s.status === "ACTIVE");
    if (!station) throw new ApiError(404, "Active station was not found in your branch");
    // Mã sai, hết hạn, đã dùng hay sai loại đều cùng một lỗi như BE (stations.service.ts:116-124).
    if (!consumeMockPairingCode(code, "CUSTOMER_DISPLAY")) throw new ApiError(400, BE_PAIRING_INVALID);
    // BR-45: mỗi quầy tối đa một màn hình khách — máy cũ tự bị thu hồi khi ghép máy mới.
    const device = { id: genId("mock-dv"), type: "CUSTOMER_DISPLAY" as const, name: deviceName?.trim() || null, pairedAt: nowISO(), lastSeenAt: null };
    station.devices = [device];
    return { deviceId: device.id };
  },

  async pairCallingDisplay(branchId, code, deviceName) {
    await mockDelay();
    assertMockWritable();
    if (!consumeMockPairingCode(code, "CALLING_DISPLAY")) throw new ApiError(400, BE_PAIRING_INVALID);
    // Màn hình gọi số gắn chi nhánh, không có quầy nên BE không liệt kê được (#28); máy gọi số cũ của chi nhánh bị thu hồi.
    const device = { id: genId("mock-dv"), type: "CALLING_DISPLAY" as const, name: deviceName?.trim() || null, pairedAt: nowISO(), lastSeenAt: null };
    callingByBranch.set(branchId, [device]);
    return { deviceId: device.id };
  },

  async revokeDevice(branchId, deviceId) {
    await mockDelay();
    assertMockWritable();
    for (const s of stationsOf(branchId)) {
      if (s.devices.some((d) => d.id === deviceId)) {
        s.devices = s.devices.filter((d) => d.id !== deviceId);
        return;
      }
    }
    const calling = callingByBranch.get(branchId) ?? [];
    if (calling.some((d) => d.id === deviceId)) {
      callingByBranch.set(branchId, calling.filter((d) => d.id !== deviceId));
      return;
    }
    throw new ApiError(404, "Active display device was not found in your branch");
  },
};

/** Máy gọi số đã ghép theo chi nhánh — chỉ để mock thu hồi/thay máy; KHÔNG có hàm liệt kê vì BE chưa có (api-contract-plan #28). */
const callingByBranch = new Map<string, StationDevice[]>();
