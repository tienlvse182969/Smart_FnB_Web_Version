/**
 * Kiểu dùng chung của store. `AppState` là hợp của mọi slice — mỗi slice nằm
 * trong một file riêng theo domain, nhưng vẫn gộp thành MỘT `useAppStore` để
 * các hành động liên domain (đăng nhập → nạp phạm vi → nạp dữ liệu) tiếp tục
 * gọi nhau qua `get()` như trước.
 */
import type { StateCreator } from "zustand";
import type { AuthSlice } from "./slices/auth";
import type { BrandingSlice } from "./slices/branding";
import type { PlanSlice } from "./slices/plan";
import type { BranchSlice } from "./slices/branches";
import type { MenuSlice } from "./slices/menu";
import type { OperationalSlice } from "./slices/operational";
import type { LegacyV7Slice } from "./legacy-v7";

export type ScopeStatus = "idle" | "loading" | "ready" | "error";
export type LoadStatus = "idle" | "loading" | "ready" | "error";

/** Địa chỉ gửi lên backend theo hai cấp: không còn `district`. */
export interface BranchFormData {
  code: string;
  name: string;
  addressLine1: string;
  ward: string;
  city: string;
  phone: string;
  openTime?: string;
  closeTime?: string;
}

export type AppState = AuthSlice &
  BrandingSlice &
  PlanSlice &
  BranchSlice &
  MenuSlice &
  OperationalSlice &
  LegacyV7Slice;

/** Hàm tạo một slice — nhìn thấy toàn bộ `AppState` qua `get()`. */
export type SliceCreator<T> = StateCreator<AppState, [], [], T>;
