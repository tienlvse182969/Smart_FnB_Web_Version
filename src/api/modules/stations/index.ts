/**
 * Module stations — quầy thu tiền và máy in của chi nhánh (BM-01, đặc tả 11.10).
 * Đặt riêng (không gộp vào `branch`/`account`): quầy là đối tượng vận hành của chi nhánh với vòng đời riêng (máy in, thiết bị
 * ghép, sau này đổi tên/ngừng dùng) và 5.6 sẽ mở rộng cùng module này (ghép/thu hồi màn hình).
 * Real: `GET/POST /stations` (role MANAGER; CASHIER cũng GET để chọn quầy trên POS). Đổi tên, ngừng dùng, sửa máy in chờ BE (#27).
 */
import type { Station, StationInput } from "../../../types";
import { defineApi } from "../../define";
import { stationsMock } from "./mock";
import { stationsReal } from "./real";

export interface StationsApi {
  /**
   * Quầy của chi nhánh, kèm thiết bị đã ghép. Real: BE lấy chi nhánh từ token nên `branchId` không gửi đi; mock dùng nó để
   * tách dữ liệu theo chi nhánh.
   */
  listStations(branchId: string): Promise<Station[]>;
  /** Tạo quầy (mặc định ACTIVE). Lỗi: 400 máy in thiếu địa chỉ, trùng tên, 403 hết hạn gói. */
  createStation(branchId: string, input: StationInput): Promise<Station>;
}

export const stationsApi = defineApi<StationsApi>("stations", { real: stationsReal, mock: stationsMock });
