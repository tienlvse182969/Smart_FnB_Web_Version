/** Module branding — nhận diện thương hiệu theo doanh nghiệp (OW-07, đặc tả mục 10). Real từ 6.4; mock giữ cùng giao diện. */
import type { Branding } from "../../../types";
import { defineApi } from "../../define";
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

export interface BrandingApi {
  /** Gói Cơ bản luôn nhận bộ mặc định (BR-41), dù đã có cấu hình lưu (mock). Real: `null` nếu vai trò không đọc được (403) → giao diện nền tảng. */
  getBranding(chainId: string): Promise<Branding | null>;
  /** Chỉ Owner, chỉ khi gói có tính năng (BR-43). Thứ tự lệnh real: tải logo (POST) trước, rồi PUT tên/màu; lỗi giữa chừng ném lỗi, nơi gọi nạp lại. */
  updateBranding(chainId: string, input: BrandingInput): Promise<Branding>;
  /** `DELETE` — đặt lại tên, màu và logo về mặc định (không có "bỏ logo giữ màu", quyết định 5). */
  resetBranding(chainId: string): Promise<Branding>;
}

export const brandingApi = defineApi<BrandingApi>("branding", { real: brandingReal, mock: brandingMock });
