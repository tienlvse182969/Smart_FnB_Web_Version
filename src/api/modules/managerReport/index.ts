/**
 * Module managerReport — báo cáo chi nhánh của Branch Manager (BM-03), `GET /manager/reports` (GĐ7, 7.3). Tách khỏi module `report`
 * (báo cáo của Owner, `/reports/*`). Cờ `VITE_API_MANAGER_REPORT=mock` dùng dữ liệu giả cùng giao diện.
 */
import type { ManagerReport, ManagerReportQuery } from "../../../types";
import { defineApi } from "../../define";
import { managerReportMock } from "./mock";
import { managerReportReal } from "./real";

/** Phạm vi của người gọi. Real: BE lấy chi nhánh từ token nên không gửi đi; mock dùng để tách dữ liệu theo chi nhánh. */
export interface ManagerReportScope {
  chainId: string;
  branchId: string;
}

export interface ManagerReportApi {
  /** Lỗi: 400 tham số sai (khoảng quá 366 ngày, từ sau đến, kiểu kỳ lạ), 403 không phải Manager. */
  getReport(scope: ManagerReportScope, query: ManagerReportQuery): Promise<ManagerReport>;
}

export const managerReportApi = defineApi<ManagerReportApi>("manager_report", { real: managerReportReal, mock: managerReportMock });
