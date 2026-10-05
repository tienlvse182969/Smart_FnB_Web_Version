/**
 * Ánh xạ nhận diện của BE (`business_branding`, `branding.service.ts`) sang kiểu web theo WHITELIST.
 * - `logoUrl` BE trả đường dẫn TƯƠNG ĐỐI `/uploads/branding/…` (`branding.service.ts:114`, phục vụ ở `main.ts:20` — KHÔNG nằm dưới `/api/v1`):
 *   ghép với GỐC máy chủ (origin của `VITE_API_BASE_URL`).
 * - BE không có `isCustom`/`version` (#39): suy `isCustom` bằng cách so với bộ mặc định của BE (`branding.service.ts:21-25`), không phân biệt hoa thường.
 */
import { API_BASE_URL } from "../../../config";
import { BE_DEFAULT_BRANDING } from "../../../theme";
import type { Branding } from "../../../types";

export interface RawBranding {
  chainId: string;
  displayName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string;
  accentColor: string;
}

const same = (a: string | undefined, b: string) => (a ?? "").toLowerCase() === b.toLowerCase();

/** Gốc máy chủ API (không có `/api/v1`). Cho phép truyền gốc khác để test. */
export function serverOrigin(base: string = API_BASE_URL): string {
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
}

/** Đường dẫn tương đối → URL tuyệt đối; URL tuyệt đối, `data:` và `blob:` giữ nguyên; rỗng → `undefined`. */
export function absoluteLogoUrl(logoUrl: string | null | undefined, origin: string = serverOrigin()): string | undefined {
  if (!logoUrl) return undefined;
  if (/^(https?:|data:|blob:)/i.test(logoUrl)) return logoUrl;
  return `${origin}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
}

export function mapBranding(raw: RawBranding, origin?: string): Branding {
  const isCustom =
    !!raw.logoUrl ||
    !same(raw.primaryColor, BE_DEFAULT_BRANDING.primaryColor) ||
    !same(raw.secondaryColor ?? BE_DEFAULT_BRANDING.secondaryColor, BE_DEFAULT_BRANDING.secondaryColor) ||
    !same(raw.accentColor, BE_DEFAULT_BRANDING.accentColor);
  return {
    tenantId: raw.chainId,
    displayName: raw.displayName,
    logoUrl: absoluteLogoUrl(raw.logoUrl, origin),
    primaryColor: raw.primaryColor,
    accentColor: raw.accentColor,
    isCustom,
  };
}
