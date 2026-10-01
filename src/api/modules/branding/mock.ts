import type { Branding } from "../../../types";
import { createDefaultBranding } from "../../../theme";
import { mockDelay } from "../../mock/control";
import { assertMockFeature, assertMockWritable } from "../../mock/guards";
import { getChainState } from "../../mock/store";
import { mockPlanBase } from "../plan/source";
import type { BrandingApi } from "./index";

export const brandingMock: BrandingApi = {
  async getBranding(chainId) {
    await mockDelay();
    const state = getChainState(chainId);
    // Gói không có tính năng nhận diện thì trả bộ mặc định, cấu hình đã lưu vẫn giữ (đặc tả 10.5).
    if (!mockPlanBase().features.branding.enabled) {
      return createDefaultBranding(chainId, state.profile.name);
    }
    return { ...state.branding };
  },

  async updateBranding(chainId, input) {
    await mockDelay();
    assertMockWritable();
    assertMockFeature("branding");
    const state = getChainState(chainId);
    const next: Branding = { ...state.branding, ...input, isCustom: true };
    state.branding = next;
    return { ...next };
  },

  async resetBranding(chainId) {
    await mockDelay();
    assertMockWritable();
    assertMockFeature("branding");
    const state = getChainState(chainId);
    state.branding = createDefaultBranding(chainId, state.profile.name);
    return { ...state.branding };
  },
};
