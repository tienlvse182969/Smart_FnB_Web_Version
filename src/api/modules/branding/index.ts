/** Module branding — nhận diện thương hiệu theo doanh nghiệp (OW-07, đặc tả mục 10). Real từ 6.4; mock giữ cùng giao diện. */
import type { Branding } from "../../../types";
import { defineApi } from "../../define";
import { ApiError } from "../../http/errors";
import { brandingMock } from "./mock";
import { brandingReal } from "./real";

/**
 * Chỉ các trường ĐÃ ĐỔI (so với bản đã lưu): real gửi PUT cho tên/màu có mặt và POST logo riêng cho `logoFile`;
 * không có gì thì không gọi BE. Logo là `File` (web kiểm PNG/JPG ≤ 1 MB trước khi gửi, quyết định 4).
 */
export interface BrandingInput {
  primaryColor?: string;
  accentColor?: string;
  displayName?: string;
  logoFile?: File;
}

export interface BrandingReadOptions {
  /** Nạp nền (quyết định 29): lỗi KHÔNG báo toàn cục (không toast, không khối lỗi); nơi gọi tự giữ bản cũ. */
  silent?: boolean;
}

export interface BrandingApi {
  /** Gói Cơ bản luôn nhận bộ mặc định (BR-41), dù đã có cấu hình lưu (mock). Real: `null` nếu vai trò không đọc được (403) → giao diện nền tảng. */
  getBranding(chainId: string, options?: BrandingReadOptions): Promise<Branding | null>;
  /** Chỉ Owner, chỉ khi gói có tính năng (BR-43). Thứ tự lệnh real: tải logo (POST) trước, rồi PUT tên/màu; lỗi giữa chừng ném lỗi, nơi gọi nạp lại. */
  updateBranding(chainId: string, input: BrandingInput): Promise<Branding>;
  /** `DELETE` — đặt lại tên, màu và logo về mặc định (không có "bỏ logo giữ màu", quyết định 5). */
  resetBranding(chainId: string): Promise<Branding>;
}

/**
 * `getBranding(..., { silent: true })`: đánh dấu lỗi là ĐÃ báo (`reported`) để lớp báo lỗi toàn cục (`defineApi`) bỏ qua; lỗi vẫn được ném
 * để nơi gọi biết mà giữ bản cũ.
 */
function withSilentReads(impl: BrandingApi): BrandingApi {
  return {
    ...impl,
    async getBranding(chainId, options) {
      try {
        return await impl.getBranding(chainId);
      } catch (err) {
        if (options?.silent && err instanceof ApiError) err.reported = true;
        throw err;
      }
    },
  };
}

export const brandingApi = defineApi<BrandingApi>("branding", { real: withSilentReads(brandingReal), mock: withSilentReads(brandingMock) });
