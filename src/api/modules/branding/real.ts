/**
 * Bản REAL của module branding — BE `branding.controller.ts` (`restaurant-chains/:chainId/branding`): GET `:51`, PUT `:62`, POST `logo` `:75`
 * (multipart, field `file`), DELETE `:111`; ghi chỉ OWNER. Body PUT CHỈ gồm trường nằm trong `UpdateBrandingDto` (`dto/branding.dto.ts`):
 * `forbidNonWhitelisted` (`app.setup.ts:21-22`) trả 400 nếu gửi trường lạ. KHÔNG bao giờ gửi `logoUrl` (BE trả đường dẫn tương đối nhưng
 * `@IsUrl` ở `branding.dto.ts:13` từ chối nó, #39); logo đi qua `POST logo`, BE tự gán `logoUrl` (`branding.service.ts:119-132`).
 */
import { ApiError } from "../../http/errors";
import { request } from "../../http/client";
import { mapBranding, type RawBranding } from "./mapper";
import { validateBrandingFields } from "./validate";
import type { BrandingApi } from "./index";

const base = (chainId: string) => `/restaurant-chains/${chainId}/branding`;

export const brandingReal: BrandingApi = {
  async getBranding(chainId) {
    try {
      return mapBranding(await request<RawBranding>(base(chainId)));
    } catch (err) {
      // Vai trò không đọc được (BE `branding.controller.ts:51`: BARISTA không có trong danh sách; Admin bị từ chối ở `branding.service.ts:184`)
      // → giao diện nền tảng, không phải lỗi (BR-44).
      if (err instanceof ApiError && err.status === 403) return null;
      throw err;
    }
  },

  async updateBranding(chainId, input) {
    const errors = validateBrandingFields(input);
    if (errors.length) throw new ApiError(400, errors[0], errors);

    // PUT: chỉ trường có mặt (đã đổi). `secondaryColor` web không dùng nên không gửi.
    const patch: Record<string, string> = {};
    if (input.displayName !== undefined) patch.displayName = input.displayName.trim();
    if (input.primaryColor !== undefined) patch.primaryColor = input.primaryColor;
    if (input.accentColor !== undefined) patch.accentColor = input.accentColor;

    let latest: RawBranding | null = null;
    // Thứ tự: tải logo TRƯỚC (hay lỗi nhất: dung lượng, định dạng) để lỗi không để lại tên/màu đã đổi nửa chừng; rồi PUT. Ít lệnh nhất:
    // chỉ logo = 1 lệnh, chỉ tên/màu = 1 lệnh, cả hai = 2 lệnh (POST rồi PUT), không đổi gì = 0 lệnh.
    if (input.logoFile) {
      const form = new FormData();
      form.append("file", input.logoFile); // field `file` (`FileInterceptor('file')`, branding.controller.ts:78)
      latest = await request<RawBranding>(`${base(chainId)}/logo`, { method: "POST", body: form });
    }
    if (Object.keys(patch).length > 0) {
      latest = await request<RawBranding>(base(chainId), { method: "PUT", body: patch });
    }
    if (latest) return mapBranding(latest);
    const current = await brandingReal.getBranding(chainId);
    if (!current) throw new ApiError(403, "Bạn không đủ quyền thực hiện thao tác này.");
    return current;
  },

  async resetBranding(chainId) {
    // DELETE đặt lại tên (= tên chuỗi), ba màu và logo về mặc định, xoá tệp logo đã tải (`branding.service.ts:142-156`).
    return mapBranding(await request<RawBranding>(base(chainId), { method: "DELETE" }));
  },
};
