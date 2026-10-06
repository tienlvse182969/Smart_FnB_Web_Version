import type { Branding } from "../../../types";
import { PLATFORM_BRAND, createDefaultBranding } from "../../../theme";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockFeature, assertMockWritable } from "../../mock/guards";
import { getChainState } from "../../mock/store";
import { mockPlanBase } from "../plan/source";
import type { BrandingApi } from "./index";
import { loadPersistedBranding, savePersistedBranding } from "./persist";
import { validateBrandingFields } from "./validate";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

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
    // Nhận diện đã lưu (chỉ khi cờ branding = mock) là "máy chủ" của mock: đọc lại từ localStorage MỖI lần, nên một tab khác của cùng trình duyệt
    // lưu xong thì tab này thấy ở lần nạp kế tiếp (như BE thật), và nó sống qua F5.
    const saved = loadPersistedBranding(chainId);
    if (saved) state.branding = saved;
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
    // Như real (`mapBranding`): phần "giao diện" tuỳ biến = có logo hoặc màu khác mặc định nền tảng; chỉ đổi tên thì lookCustom = false.
    next.lookCustom = !!next.logoUrl || !same(next.primaryColor, PLATFORM_BRAND.primary) || !same(next.accentColor, PLATFORM_BRAND.accent);
    state.branding = next;
    savePersistedBranding(chainId, next);
    return { ...next };
  },

  async resetBranding(chainId) {
    await mockDelay();
    assertMockWritable();
    assertMockFeature("branding");
    const state = getChainState(chainId);
    state.branding = createDefaultBranding(chainId, state.profile.name);
    // Khôi phục mặc định cũng là một trạng thái phải sống qua F5 (nếu không, bản đã lưu cũ sẽ hiện lại).
    savePersistedBranding(chainId, state.branding);
    return { ...state.branding };
  },
};
