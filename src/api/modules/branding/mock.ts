import type { Branding } from "../../../types";
import { createDefaultBranding } from "../../../theme";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockFeature, assertMockWritable } from "../../mock/guards";
import { getChainState } from "../../mock/store";
import { mockPlanBase } from "../plan/source";
import type { BrandingApi } from "./index";
import { loadPersistedBranding, savePersistedBranding } from "./persist";
import { validateBrandingFields } from "./validate";

/** ChainState đã thử nạp nhận diện từ localStorage (gắn theo đối tượng: `resetMockStates` tạo ChainState mới thì nạp lại, như tải lại trang). */
const loadedFromStorage = new WeakSet<object>();

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
    // Nhận diện đã lưu qua F5 (chỉ khi cờ branding = mock): nạp một lần vào ChainState rồi dùng bản trong bộ nhớ.
    if (!loadedFromStorage.has(state)) {
      loadedFromStorage.add(state);
      const saved = loadPersistedBranding(chainId);
      if (saved) state.branding = saved;
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
