/** Nhận diện thương hiệu theo doanh nghiệp (OW-07). */
import type { Branding } from "../../types";
import {
  updateBranding as serviceUpdateBranding,
  resetBranding as serviceResetBranding,
} from "../../services";
import { broadcast } from "../broadcast";
import type { SliceCreator } from "../types";

export interface BrandingSlice {
  tenantBranding: Branding | null;

  /** Owner lưu nhận diện riêng (BR-28/29) — phát broadcast cho các tab cùng tenant. */
  updateBranding: (data: { primaryColor: string; accentColor: string; displayName: string; logoUrl?: string }) => Promise<void>;
  /** Owner khôi phục về theme đơn sắc mặc định của nền tảng. */
  resetBranding: () => Promise<void>;
}

export const createBrandingSlice: SliceCreator<BrandingSlice> = (set, get) => ({
  tenantBranding: null,

  updateBranding: async (data) => {
    const { currentUser } = get();
    if (!currentUser?.tenantId) return;

    const branding = await serviceUpdateBranding(currentUser.tenantId, data, currentUser.email);
    set({ tenantBranding: branding });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: currentUser.tenantId });
  },

  resetBranding: async () => {
    const { currentUser } = get();
    if (!currentUser?.tenantId) return;

    const branding = await serviceResetBranding(currentUser.tenantId, currentUser.email);
    set({ tenantBranding: branding });
    broadcast.send({ type: "BRANDING_UPDATED", tenantId: currentUser.tenantId });
  },
});
