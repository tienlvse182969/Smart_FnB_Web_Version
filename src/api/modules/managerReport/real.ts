/**
 * Bản real của module managerReport — báo cáo chi nhánh của Branch Manager (BM-03): `GET /manager/reports`. Chỉ MANAGER gọi được
 * (Owner/Cashier nhận 403; báo cáo Owner ở module `report` gọi `/reports/*`, không đụng ở đây); chi nhánh lấy từ token. Chỉ đọc.
 */
import { request } from "../../http/client";
import { mapManagerReport } from "./mapper";
import { buildManagerReportQueryString } from "./query";
import type { ManagerReportApi } from "./index";

export const managerReportReal: ManagerReportApi = {
  async getReport(_scope, query) {
    const raw = await request<unknown>(`/manager/reports${buildManagerReportQueryString(query)}`);
    return mapManagerReport(raw, query);
  },
};
