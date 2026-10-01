/**
 * Bộ token thương hiệu hiệu lực của phiên hiện tại. Thay cho `AccentContext` cũ: màn hình đọc
 * `useBrand()` thay vì tự suy ra màu từ branding trong store.
 */
import { createContext, useContext } from "react";
import { PLATFORM_BRAND_TOKENS, type BrandTokens } from "./tokens";

export const BrandContext = createContext<BrandTokens>(PLATFORM_BRAND_TOKENS);

export function useBrand(): BrandTokens {
  return useContext(BrandContext);
}
