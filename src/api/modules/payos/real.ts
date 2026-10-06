/**
 * Bản REAL của module payos — BE `payos-channel.controller.ts` (`restaurant-chains/:chainId/payos-channel`, chỉ OWNER `:15`): GET `:20`,
 * PUT `:30`, DELETE `:41`. Body PUT CHỈ gồm 3 trường của `SavePayosChannelDto` (`dto/payos-channel.dto.ts:5-17`: clientId, apiKey,
 * checksumKey, mỗi trường `@IsString @MinLength(1)`); `forbidNonWhitelisted` trả 400 nếu thêm trường lạ. BE tự `trim()` (`payos-channel.service.ts:28-30`).
 * Phản hồi không bao giờ chứa khoá. PUT cần `PAYOS_MASTER_KEY` trên máy chủ, không có thì 503 (`payos-cipher.service.ts:35`).
 */
import { ApiError } from "../../http/errors";
import { request } from "../../http/client";
import { mapPayosChannel, type RawPayosChannel } from "./mapper";
import type { PayosApi } from "./index";

const base = (chainId: string) => `/restaurant-chains/${chainId}/payos-channel`;

export const payosReal: PayosApi = {
  async getChannel(chainId) {
    return mapPayosChannel(await request<RawPayosChannel>(base(chainId)));
  },

  async saveKeys(chainId, keys) {
    // Chặn sớm trước khi gửi (không có request): BE cũng chặn bằng @MinLength(1) nhưng web báo đúng ô.
    const missing = (["clientId", "apiKey", "checksumKey"] as const).filter((k) => !keys[k]?.trim());
    if (missing.length) throw new ApiError(400, "Chưa nhập đủ 3 khoá PayOS.", missing.map((k) => `${k} should not be empty`));
    const body = { clientId: keys.clientId.trim(), apiKey: keys.apiKey.trim(), checksumKey: keys.checksumKey.trim() };
    return mapPayosChannel(await request<RawPayosChannel>(base(chainId), { method: "PUT", body }));
  },

  async unlink(chainId) {
    return mapPayosChannel(await request<RawPayosChannel>(base(chainId), { method: "DELETE" }));
  },
};
