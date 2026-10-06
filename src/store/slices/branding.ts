/** Nhận diện thương hiệu theo doanh nghiệp (OW-07). */
import type { Branding } from "../../types";
import { brandingApi, type BrandingInput } from "../../api";
import { applyChainName } from "../../api/modules/branding/mapper";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

/** Chỉ nạp lại nhận diện khi điều hướng nếu lần nạp trước cách quá chừng này (quyết định 29). */
export const BRANDING_REFRESH_INTERVAL_MS = 60_000;
/** Trang công khai luôn dùng nhận diện nền tảng (BR-44) nên không nạp nhận diện doanh nghiệp. */
export const PLATFORM_BRAND_PATHS = ["/setup-password", "/login"];

export interface BrandingSlice {
  tenantBranding: Branding | null;
  /** Thời điểm (ms) nạp/lưu nhận diện gần nhất; để giới hạn nạp lại khi điều hướng. */
  brandingFetchedAt: number;

  /** Owner lưu nhận diện riêng (BR-41, BR-43) — phát broadcast cho các tab cùng doanh nghiệp. */
  updateBranding: (data: BrandingInput) => Promise<void>;
  /** Owner khôi phục về nhận diện mặc định của nền tảng. */
  resetBranding: () => Promise<void>;
  /** Nạp lại nhận diện từ nguồn (sau lỗi giữa chừng khi lưu nhiều lệnh). */
  reloadBranding: () => Promise<void>;
  /**
   * Tài khoản không phải Admin điều hướng sang route khác: nạp lại nhận diện, TỐI ĐA 1 lần mỗi 60 giây; lỗi thì im lặng giữ bản cũ
   * (không toast, không khối lỗi). Admin, /login, /setup-password không nạp (quyết định 29). Trả `true` nếu đã gọi BE.
   */
  refreshBrandingOnNavigate: (pathname: string, now?: number) => Promise<boolean>;
}

export const createBrandingSlice: SliceCreator<BrandingSlice> = (set, get) => ({
  tenantBranding: null,
  brandingFetchedAt: 0,

  updateBranding: async (data) => {
    const { chainId } = get();
    if (!chainId) return;

    const branding = applyChainName(await brandingApi.updateBranding(chainId, data), get().chainName);
    set({ tenantBranding: branding, brandingFetchedAt: Date.now() });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: chainId });
  },

  reloadBranding: async () => {
    const { chainId } = get();
    if (!chainId) return;
    set({ tenantBranding: applyChainName(await brandingApi.getBranding(chainId), get().chainName), brandingFetchedAt: Date.now() });
  },

  resetBranding: async () => {
    const { chainId } = get();
    if (!chainId) return;

    const branding = applyChainName(await brandingApi.resetBranding(chainId), get().chainName);
    set({ tenantBranding: branding, brandingFetchedAt: Date.now() });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: chainId });
  },

  refreshBrandingOnNavigate: async (pathname, now = Date.now()) => {
    const { chainId, currentUser, scopeStatus, brandingFetchedAt } = get();
    if (!chainId || !currentUser || currentUser.role === "admin" || scopeStatus !== "ready") return false;
    if (PLATFORM_BRAND_PATHS.includes(pathname)) return false;
    if (now - brandingFetchedAt < BRANDING_REFRESH_INTERVAL_MS) return false;
    // Đánh dấu TRƯỚC khi gọi: điều hướng liên tiếp không dồn thêm lệnh, lỗi cũng không bị gọi lại ngay.
    set({ brandingFetchedAt: now });
    try {
      const fresh = applyChainName(await brandingApi.getBranding(chainId, { silent: true }), get().chainName);
      // Chuỗi/phiên đã đổi trong lúc chờ thì bỏ kết quả.
      if (get().chainId === chainId) set({ tenantBranding: fresh });
    } catch {
      // Im lặng: giữ bản cũ.
    }
    return true;
  },
});
