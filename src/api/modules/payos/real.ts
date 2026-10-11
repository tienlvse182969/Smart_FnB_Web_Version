/**
 * Bản REAL của module payos — BE `de4f55c` `payos-channel.controller.ts` (`restaurant-chains/:chainId/payos-channel`, chỉ OWNER `:23`): GET `:28`,
 * PUT `:39`, DELETE `:58`. Body PUT CHỈ gồm 3 trường của `SavePayosChannelDto` (`dto/payos-channel.dto.ts:5-20`: clientId, apiKey, checksumKey, mỗi
 * trường `@IsString @MinLength(1)`); `forbidNonWhitelisted` trả 400 nếu thêm trường lạ. BE tự `trim()` (`payos-channel.service.ts:49-53`).
 * Phản hồi không bao giờ chứa khoá, chỉ 4 ký tự cuối. `PUT` giờ XÁC MINH với PayOS trước khi lưu (`payos-channel.service.ts:74`):
 * PayOS từ chối → 422, PayOS tạm lỗi → 502, thiếu `PAYOS_MASTER_KEY` hoặc `PAYOS_WEBHOOK_BASE_URL` → 503. Không lưu khi xác minh lỗi.
 */
import { ApiError, PAYOS_UNREACHABLE_TEXT, PAYOS_VERIFY_REJECTED_TEXT } from "../../http/errors";
import { request } from "../../http/client";
import { mapPayosChannel, type RawPayosChannel } from "./mapper";
import type { PayosApi } from "./index";

const base = (chainId: string) => `/restaurant-chains/${chainId}/payos-channel`;

/** Đổi câu thô của PayOS (422, 502) sang câu tiếng Việt cố định; giữ `method` để lớp lỗi phân loại đúng (ghi). Không đưa câu thô lên giao diện. */
function reword(err: ApiError, text: string): ApiError {
  const next = new ApiError(err.status, text, [], err.code, err.body);
  next.method = err.method;
  return next;
}

export const payosReal: PayosApi = {
  async getChannel(chainId) {
    return mapPayosChannel(await request<RawPayosChannel>(base(chainId)));
  },

  async saveKeys(chainId, keys) {
    // Chặn sớm trước khi gửi (không có request): BE cũng chặn bằng @MinLength(1) nhưng web báo đúng ô.
    const missing = (["clientId", "apiKey", "checksumKey"] as const).filter((k) => !keys[k]?.trim());
    if (missing.length) throw new ApiError(400, "Chưa nhập đủ 3 khoá PayOS.", missing.map((k) => `${k} should not be empty`));
    const body = { clientId: keys.clientId.trim(), apiKey: keys.apiKey.trim(), checksumKey: keys.checksumKey.trim() };
    try {
      return mapPayosChannel(await request<RawPayosChannel>(base(chainId), { method: "PUT", body }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) throw reword(err, PAYOS_VERIFY_REJECTED_TEXT);
      if (err instanceof ApiError && err.status === 502) throw reword(err, PAYOS_UNREACHABLE_TEXT);
      throw err;
    }
  },

  async unlink(chainId) {
    return mapPayosChannel(await request<RawPayosChannel>(base(chainId), { method: "DELETE" }));
  },
};
