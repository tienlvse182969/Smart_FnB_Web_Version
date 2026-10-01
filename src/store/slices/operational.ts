/**
 * Nạp dữ liệu vận hành theo chi nhánh đang chọn.
 *
 * Hàm này đang trộn dữ liệu còn dùng ở v9 (menu, món tại chi nhánh) với dữ liệu
 * v7 (bàn, phiên, dòng món waiter/kitchen, nhân sự, ca). Giữ nguyên ở bước tách
 * store; phần v7 gỡ ở bước xoá v7.
 */
import type {
  BranchMenuItem,
  FloorTable,
  MenuItem,
  TableSession,
  WorkSession,
} from "../../types";
import {
  getFloorTables,
  listMenuItems,
  listBranchMenuItems,
  listSessions,
  listBranchOrderLines,
  type BranchOrderLine,
  listStaff,
  type StaffLegacy,
  listWorkSessions,
} from "../../services";
import { ENABLE_STAFF_APPS } from "../../config";
import { toMockBranchId } from "../../services/mockBridge";
import { loadOperationalData } from "../../services/operational-api";
import type { SliceCreator } from "../types";

export interface OperationalSlice {
  refreshOperationalData: () => Promise<void>;
}

export const createOperationalSlice: SliceCreator<OperationalSlice> = (set, get) => ({
  refreshOperationalData: async () => {
    const { currentUser, currentBranchId } = get();
    if (!currentUser) return;

    // Luồng Waiter/Kitchen của nhánh main. Đăng nhập hiện tại không đặt
    // `apiBacked` nên nhánh này không chạy — giữ lại để bật lại dễ khi mở
    // lại hai phân hệ đó trên web.
    if (currentUser.apiBacked) {
      const data = await loadOperationalData(currentUser);
      set({ ...data, currentBranchId: currentUser.branchId });
      return;
    }

    // Chi nhánh giờ lấy từ API thật (loadScope), không đọc mock nữa. Các phân
    // hệ bên dưới còn mock nên phải đổi sang ID mock qua cầu nối.
    const activeBranchId = toMockBranchId(currentBranchId);

    let tables: FloorTable[] = [];
    let sessions: TableSession[] = [];
    let menu: MenuItem[] = [];
    let branchMenu: BranchMenuItem[] = [];
    let lines: BranchOrderLine[] = [];
    let staff: StaffLegacy[] = [];
    let workSessions: WorkSession[] = [];

    if (currentUser.tenantId) {
      menu = await listMenuItems(currentUser.tenantId, currentUser.role);
    }

    if (activeBranchId) {
      branchMenu = await listBranchMenuItems(activeBranchId);
      lines = await listBranchOrderLines(activeBranchId, currentUser.role);
      staff = await listStaff(activeBranchId);
      workSessions = await listWorkSessions(activeBranchId);

      // Bàn và phiên bàn dạng mock giờ chỉ phục vụ màn Waiter/Kitchen — hai
      // phân hệ đã chuyển sang tablet và đang bị ẩn sau cờ. Màn Branch Manager
      // đọc bàn thật qua `apiTables`; thanh toán mock đã bỏ hẳn vì
      // `branchPayments` lấy từ API thật.
      if (ENABLE_STAFF_APPS) {
        tables = await getFloorTables(activeBranchId);
        sessions = await listSessions(activeBranchId);
      }
    }

    set({
      tables,
      sessions,
      menuItems: menu,
      branchMenuItems: branchMenu,
      orderLines: lines,
      staff,
      workSessions,
    });
  },
});
