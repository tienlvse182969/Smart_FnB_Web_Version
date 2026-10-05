/**
 * Global Zustand Store cho Smart FnB.
 * Quản lý Auth, phạm vi chuỗi/chi nhánh, gói, nhận diện, menu và nhân sự.
 * Đồng bộ real-time giữa các tab qua BroadcastChannel.
 *
 * Một store duy nhất, ghép từ các slice theo domain:
 *   slices/auth        phiên đăng nhập, phạm vi chuỗi/chi nhánh (CM-01)
 *   slices/branding    nhận diện thương hiệu (OW-07)
 *   slices/plan        gói dịch vụ và hạn mức (OW-10)
 *   slices/branches    chi nhánh và chi nhánh đang chọn (OW-01)
 *   slices/menu        menu chuỗi, món tại chi nhánh (OW-02..04, BM-02)
 */
import { create } from "zustand";
import type { AppState } from "./types";
import { createAuthSlice } from "./slices/auth";
import { createBrandingSlice } from "./slices/branding";
import { createPlanSlice } from "./slices/plan";
import { createBranchSlice } from "./slices/branches";
import { createMenuSlice } from "./slices/menu";
import { createRefreshSlice } from "./slices/refresh";

export type { AppState, BranchFormData, ScopeStatus } from "./types";

export const useAppStore = create<AppState>()((...args) => ({
  ...createAuthSlice(...args),
  ...createBrandingSlice(...args),
  ...createPlanSlice(...args),
  ...createBranchSlice(...args),
  ...createMenuSlice(...args),
  ...createRefreshSlice(...args),
}));
