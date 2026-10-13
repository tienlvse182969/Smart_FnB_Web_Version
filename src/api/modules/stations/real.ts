import { request } from "../../http/client";
import { mapBranchDevice, mapStation, type RawBranchDevice, type RawStation } from "./mapper";
import { toCreateBody, toPatchBody } from "./rules";
import type { StationsApi } from "./index";

export const stationsReal: StationsApi = {
  async listStations() {
    return (await request<RawStation[]>("/stations")).map(mapStation);
  },

  async createStation(_branchId, input) {
    // Thân gửi đúng `CreateStationDto` (station.dto.ts:5-21); BE tạo quầy ACTIVE.
    return mapStation(await request<RawStation>("/stations", { method: "POST", body: toCreateBody(input) }));
  },

  async updateStation(_branchId, stationId, patch) {
    // `PATCH /stations/:stationId` (`UpdateStationDto`, `forbidNonWhitelisted`): chỉ gửi trường đổi; chi nhánh lấy từ token.
    return mapStation(await request<RawStation>(`/stations/${encodeURIComponent(stationId)}`, { method: "PATCH", body: toPatchBody(patch) }));
  },

  async listDisplayDevices() {
    return (await request<RawBranchDevice[]>("/display-devices")).map(mapBranchDevice);
  },

  async pairCustomerDisplay(_branchId, stationId, code, deviceName) {
    // PairCustomerDisplayDto (station.dto.ts:29-44). Response `{ deviceId, stationId, branchId }` — chỉ lấy deviceId.
    const body: { stationId: string; code: string; deviceName?: string } = { stationId, code };
    if (deviceName?.trim()) body.deviceName = deviceName.trim();
    const raw = await request<{ deviceId: string }>("/stations/pair-customer-display", { method: "POST", body });
    return { deviceId: raw.deviceId };
  },

  async pairCallingDisplay(_branchId, code, deviceName) {
    // PairCallingDisplayDto (station.dto.ts:46-56). Response `{ deviceId, branchId }`.
    const body: { code: string; deviceName?: string } = { code };
    if (deviceName?.trim()) body.deviceName = deviceName.trim();
    const raw = await request<{ deviceId: string }>("/stations/pair-calling-display", { method: "POST", body });
    return { deviceId: raw.deviceId };
  },

  async revokeDevice(_branchId, deviceId) {
    await request(`/display-devices/${deviceId}`, { method: "DELETE" });
  },
};
