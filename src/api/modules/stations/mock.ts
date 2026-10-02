import type { Station } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { genId, nowISO } from "../../mock/util";
import type { StationsApi } from "./index";
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
        devices: [{ id: genId("mock-dv"), type: "CUSTOMER_DISPLAY", name: "Tablet khách quầy 1", pairedAt: nowISO(), lastSeenAt: nowISO() }],
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
};
