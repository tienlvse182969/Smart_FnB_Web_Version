/**
 * Mọi slice của phân hệ v7 (bàn, phiên, đơn waiter/kitchen, ca, nhân sự v7,
 * thanh toán theo phiên bàn) gom về một chỗ. Bước xoá v7 chỉ cần gỡ thư mục này
 * và một dòng trong `store/index.ts`.
 */
import type { SliceCreator } from "../types";
import { createLegacyTablesSlice, type LegacyTablesSlice } from "./tables";
import { createLegacyPaymentsSlice, type LegacyPaymentsSlice } from "./payments";
import { createLegacyOperationsSlice, type LegacyOperationsSlice } from "./operations";
import { createLegacyStaffSlice, type LegacyStaffSlice } from "./staff";

export type LegacyV7Slice = LegacyTablesSlice &
  LegacyPaymentsSlice &
  LegacyOperationsSlice &
  LegacyStaffSlice;

export const createLegacyV7Slice: SliceCreator<LegacyV7Slice> = (...args) => ({
  ...createLegacyTablesSlice(...args),
  ...createLegacyPaymentsSlice(...args),
  ...createLegacyOperationsSlice(...args),
  ...createLegacyStaffSlice(...args),
});
