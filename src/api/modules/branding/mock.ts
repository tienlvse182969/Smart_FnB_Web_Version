import type { Branding } from "../../../types";
import { createDefaultBranding } from "../../../theme";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockFeature, assertMockWritable } from "../../mock/guards";
import { getChainState } from "../../mock/store";
import { mockPlanBase } from "../plan/source";
import type { BrandingApi } from "./index";
import { validateBrandingFields } from "./validate";

/** Mock giữ logo dạng data URL (không có máy chủ lưu tệp). */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError(400, "Không đọc được ảnh"));
    reader.readAsDataURL(file);
  });

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
    const errors = validateBrandingFields(input);
    if (errors.length) throw new ApiError(400, errors[0], errors);
    const state = getChainState(chainId);
    const next: Branding = {
      ...state.branding,
      ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
      ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
      ...(input.displayName !== undefined && { displayName: input.displayName.trim() }),
      isCustom: true,
    };
    if (input.logoFile) next.logoUrl = await readAsDataUrl(input.logoFile);
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
