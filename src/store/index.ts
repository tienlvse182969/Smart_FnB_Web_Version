/**
 * Global Zustand Store cho Smart FnB.
 * Quản lý Auth, Branch context, và Dữ liệu vận hành (bàn, order, menu, thanh toán).
 * Đồng bộ real-time giữa các tab qua BroadcastChannel.
 *
 * Một store duy nhất, ghép từ các slice theo domain:
 *   slices/auth        phiên đăng nhập, phạm vi chuỗi/chi nhánh (CM-01)
 *   slices/branding    nhận diện thương hiệu (OW-07)
 *   slices/plan        gói dịch vụ và hạn mức (OW-10)
 *   slices/branches    chi nhánh và chi nhánh đang chọn (OW-01)
 *   slices/menu        menu chuỗi, món tại chi nhánh (OW-02..04, BM-02)
 *   slices/operational nạp dữ liệu vận hành theo chi nhánh
 *   legacy-v7/         phục vụ tại bàn của v7 — sẽ gỡ ở bước xoá v7
 */
import { create } from "zustand";
import type { AppState } from "./types";
import { createAuthSlice } from "./slices/auth";
import { createBrandingSlice } from "./slices/branding";
import { createPlanSlice } from "./slices/plan";
import { createBranchSlice } from "./slices/branches";
import { createMenuSlice } from "./slices/menu";
import { createOperationalSlice } from "./slices/operational";
import { createLegacyV7Slice } from "./legacy-v7";

export type { AppState, BranchFormData, LoadStatus, ScopeStatus } from "./types";

export const useAppStore = create<AppState>()((...args) => ({
  ...createAuthSlice(...args),
  ...createBrandingSlice(...args),
  ...createPlanSlice(...args),
  ...createBranchSlice(...args),
  ...createMenuSlice(...args),
  ...createOperationalSlice(...args),
  ...createLegacyV7Slice(...args),
}));
