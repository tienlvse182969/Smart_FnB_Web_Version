/** Module branding — nhận diện thương hiệu theo doanh nghiệp (OW-07, đặc tả mục 10). Mock cho tới giai đoạn 6. */
import type { Branding } from "../../../types";
import { defineApi } from "../../define";
import { brandingMock } from "./mock";

export interface BrandingInput {
  primaryColor: string;
  accentColor: string;
  displayName: string;
  logoUrl?: string;
}

export interface BrandingApi {
  /** Gói Cơ bản luôn nhận bộ mặc định (BR-41), dù đã có cấu hình lưu. */
  getBranding(chainId: string): Promise<Branding | null>;
  /** Chỉ Owner, chỉ khi gói có tính năng (BR-43). */
  updateBranding(chainId: string, input: BrandingInput): Promise<Branding>;
  resetBranding(chainId: string): Promise<Branding>;
}

// CHỜ BE: BE có /restaurant-chains/{id}/branding (GET/PUT/DELETE) nhưng web chưa nối — giai đoạn 6.
export const brandingApi = defineApi<BrandingApi>("branding", { mock: brandingMock });
