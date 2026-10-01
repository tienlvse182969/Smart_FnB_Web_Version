/** Nhận diện thương hiệu theo doanh nghiệp (OW-07). */
import type { Branding } from "../../types";
import { brandingApi, type BrandingInput } from "../../api";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface BrandingSlice {
  tenantBranding: Branding | null;

  /** Owner lưu nhận diện riêng (BR-41, BR-43) — phát broadcast cho các tab cùng doanh nghiệp. */
  updateBranding: (data: BrandingInput) => Promise<void>;
  /** Owner khôi phục về nhận diện mặc định của nền tảng. */
  resetBranding: () => Promise<void>;
}

export const createBrandingSlice: SliceCreator<BrandingSlice> = (set, get) => ({
  tenantBranding: null,

  updateBranding: async (data) => {
    const { chainId } = get();
    if (!chainId) return;

    const branding = await brandingApi.updateBranding(chainId, data);
    set({ tenantBranding: branding });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: chainId });
  },

  resetBranding: async () => {
    const { chainId } = get();
    if (!chainId) return;

    const branding = await brandingApi.resetBranding(chainId);
    set({ tenantBranding: branding });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: chainId });
  },
});
