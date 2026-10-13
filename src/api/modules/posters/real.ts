/**
 * Bản REAL của module posters — BE `display-posters.controller.ts` (`restaurant-chains/:chainId/display-posters`), chỉ OWNER:
 *   GET    /                (cả poster đang tắt, theo thứ tự xoay vòng)
 *   POST   /                (multipart, field `file` DUY NHẤT; BE đặt tên "Poster", 8 giây; ≤ 5 MB; tối đa 10, vượt thì 409)
 *   PATCH  /:posterId       (`title` 1–120, `enabled`, `sortOrder` 0–10000, `durationSeconds` 3–60; trường lạ hoặc rỗng thì 400)
 *   DELETE /:posterId       (xoá mềm, trả 200 `{ deleted: true }`)
 * `imageUrl` BE trả là đường dẫn tương đối `/uploads/posters/...` (ngoài `/api/v1`); web ghép với origin máy chủ như logo nhận diện.
 * Ghi lúc doanh nghiệp hết hạn/tạm ngưng thì 403; đọc vẫn được. Không có endpoint đổi ảnh hay sắp xếp (xem `index.ts`).
 */
import type { Poster } from "../../../types";
import { request } from "../../http/client";
import { ApiError } from "../../http/errors";
import { absoluteLogoUrl } from "../branding/mapper";
import type { PostersApi } from "./index";
import { comparePosters, validatePosterFile, validatePosterPatch } from "./validate";

export interface RawPoster {
  id: string;
  chainId?: string;
  title: string;
  imageUrl: string;
  enabled: boolean;
  sortOrder: number;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

const base = (chainId: string) => `/restaurant-chains/${chainId}/display-posters`;

export function mapPoster(raw: RawPoster, origin?: string): Poster {
  return {
    id: raw.id,
    imageUrl: absoluteLogoUrl(raw.imageUrl, origin) ?? "",
    title: raw.title,
    enabled: raw.enabled,
    sortOrder: raw.sortOrder,
    durationSeconds: raw.durationSeconds,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const postersReal: PostersApi = {
  async listPosters(chainId) {
    const list = await request<RawPoster[]>(base(chainId));
    return list.map((raw) => mapPoster(raw)).sort(comparePosters);
  },

  async addPoster(chainId, input) {
    const problem = validatePosterFile(input.file);
    if (problem) throw new ApiError(400, problem, [problem]);
    const form = new FormData();
    form.append("file", input.file); // field `file` (`FileInterceptor('file')`); BE không nhận trường nào khác (forbidNonWhitelisted)
    return mapPoster(await request<RawPoster>(base(chainId), { method: "POST", body: form }));
  },

  async updatePoster(chainId, id, patch) {
    const problem = validatePosterPatch(patch);
    if (problem) throw new ApiError(400, problem, [problem]);
    // Chỉ gửi khoá có mặt: BE từ chối trường lạ và `null`.
    const body: Record<string, string | number | boolean> = {};
    if (patch.title !== undefined) body.title = patch.title.trim();
    if (patch.enabled !== undefined) body.enabled = patch.enabled;
    if (patch.sortOrder !== undefined) body.sortOrder = patch.sortOrder;
    if (patch.durationSeconds !== undefined) body.durationSeconds = patch.durationSeconds;
    return mapPoster(await request<RawPoster>(`${base(chainId)}/${id}`, { method: "PATCH", body }));
  },

  async deletePoster(chainId, id) {
    await request<unknown>(`${base(chainId)}/${id}`, { method: "DELETE" });
  },
};
