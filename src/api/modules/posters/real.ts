/**
 * Bản REAL của module posters — BE `display-posters.controller.ts` (`restaurant-chains/:chainId/display-posters`, `@Roles(OWNER)`):
 * GET `:42`, POST `:54` (multipart, field `file`, giới hạn 5 MB ở Multer), PATCH `:80`, DELETE `:94`. Thân PATCH chỉ gồm
 * `title`, `enabled`, `sortOrder`, `durationSeconds` (`UpdateDisplayPosterDto`; `forbidNonWhitelisted` → 400 nếu thêm trường lạ);
 * web chỉ gửi ba trường đầu. Ghi bị chặn khi gói hết hạn (`assertCanManageChain`, 403 "read-only").
 */
import { request } from "../../http/client";
import type { Poster, PosterPatch } from "../../../types";
import { ApiError } from "../../http/errors";
import { replaceImage, reorder, type PosterPrimitives } from "./compose";
import { mapPoster, mapPosterList, type RawPoster } from "./mapper";
import { validatePosterImage, validatePosterTitle } from "./rules";
import type { PostersApi } from "./index";

const base = (chainId: string) => `/restaurant-chains/${encodeURIComponent(chainId)}/display-posters`;

/** Thân PATCH đúng DTO: chỉ trường có mặt; tên được trim. */
export function toPatchBody(patch: PosterPatch): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title.trim();
  if (patch.enabled !== undefined) body.enabled = patch.enabled;
  if (patch.sortOrder !== undefined) body.sortOrder = patch.sortOrder;
  return body;
}

const primitives: PosterPrimitives = {
  async upload(chainId, file) {
    const error = validatePosterImage(file);
    if (error) throw new ApiError(400, error, [error]);
    const form = new FormData();
    form.append("file", file); // field `file` (`FileInterceptor('file')`, display-posters.controller.ts:55)
    return mapPoster(await request<RawPoster>(base(chainId), { method: "POST", body: form }));
  },
  async update(chainId, id, patch) {
    if (patch.title !== undefined) {
      const error = validatePosterTitle(patch.title);
      if (error) throw new ApiError(400, error, [error]);
    }
    const body = toPatchBody(patch);
    return mapPoster(await request<RawPoster>(`${base(chainId)}/${encodeURIComponent(id)}`, { method: "PATCH", body }));
  },
  async remove(chainId, id) {
    await request(`${base(chainId)}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};

export const postersReal: PostersApi = {
  async listPosters(chainId) {
    return mapPosterList(await request<unknown>(base(chainId)));
  },
  uploadPoster: (chainId, file): Promise<Poster> => primitives.upload(chainId, file),
  updatePoster: (chainId, id, patch): Promise<Poster> => primitives.update(chainId, id, patch),
  deletePoster: (chainId, id) => primitives.remove(chainId, id),
  replaceImage: (chainId, current, file) => replaceImage(primitives, chainId, current, file),
  reorder: (chainId, patches) => reorder(primitives, chainId, patches),
};
