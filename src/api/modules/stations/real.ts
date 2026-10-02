import { request } from "../../http/client";
import { mapStation, type RawStation } from "./mapper";
import { toCreateBody } from "./rules";
import type { StationsApi } from "./index";

export const stationsReal: StationsApi = {
  async listStations() {
    return (await request<RawStation[]>("/stations")).map(mapStation);
  },

  async createStation(_branchId, input) {
    // Thân gửi đúng `CreateStationDto` (station.dto.ts:5-21); BE tạo quầy ACTIVE.
    return mapStation(await request<RawStation>("/stations", { method: "POST", body: toCreateBody(input) }));
  },
};
