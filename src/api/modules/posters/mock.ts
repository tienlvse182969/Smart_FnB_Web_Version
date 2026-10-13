/**
 * Bản MOCK của module posters (OW-11): đủ để kiểm giao diện không cần BE. Cùng quy tắc kiểm và cùng mã lỗi như BE `4b81e48`
 * (tối đa `POSTER_LIMITS.maxCount`, PNG/JPG/WebP ≤ 5 MB, tên 1–120). Dữ liệu nằm trong bộ nhớ theo doanh nghiệp, mất khi tải lại trang.
 * Ảnh mẫu là SVG nhúng (data URI) nên không cần mạng.
 */
import type { Poster, PosterPatch } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { genId, nowISO } from "../../mock/util";
import { MOCK_POSTER_IMAGES } from "../../../theme/posterAssets";
import { replaceImage, reorder, type PosterPrimitives } from "./compose";
import { POSTER_LIMITS, validatePosterImage, validatePosterTitle } from "./rules";
import type { PostersApi } from "./index";

const byChain = new Map<string, Poster[]>();

function listOf(chainId: string): Poster[] {
  let list = byChain.get(chainId);
  if (!list) {
    const at = nowISO();
    list = [
      { id: genId("mock-po"), title: "Khuyến mãi tháng 10", imageUrl: MOCK_POSTER_IMAGES.promo, enabled: true, sortOrder: 0, durationSeconds: 8, updatedAt: at },
      { id: genId("mock-po"), title: "Món mới: Trà vải", imageUrl: MOCK_POSTER_IMAGES.newItem, enabled: true, sortOrder: 1, durationSeconds: 8, updatedAt: at },
      { id: genId("mock-po"), title: "Poster dọc (tắt)", imageUrl: MOCK_POSTER_IMAGES.portrait, enabled: false, sortOrder: 2, durationSeconds: 8, updatedAt: at },
    ];
    byChain.set(chainId, list);
  }
  return list;
}

/** Dành cho test: xoá dữ liệu mock. */
export function resetPostersMock(): void {
  byChain.clear();
}

const find = (chainId: string, id: string): Poster => {
  const poster = listOf(chainId).find((p) => p.id === id);
  if (!poster) throw new ApiError(404, "Poster not found in this chain");
  return poster;
};

const ordered = (list: Poster[]): Poster[] => [...list].sort((a, b) => a.sortOrder - b.sortOrder);

const primitives: PosterPrimitives = {
  async upload(chainId, file) {
    await mockDelay();
    assertMockWritable();
    const list = listOf(chainId);
    const error = validatePosterImage(file);
    if (error) throw new ApiError(400, error, [error]);
    if (list.length >= POSTER_LIMITS.maxCount) {
      throw new ApiError(409, `A chain may have at most ${POSTER_LIMITS.maxCount} posters; remove one before uploading`);
    }
    const poster: Poster = {
      id: genId("mock-po"),
      title: "Poster",
      imageUrl: typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : MOCK_POSTER_IMAGES.uploaded,
      enabled: true,
      sortOrder: list.length,
      durationSeconds: POSTER_LIMITS.defaultSeconds,
      updatedAt: nowISO(),
    };
    list.push(poster);
    return { ...poster };
  },
  async update(chainId, id, patch: PosterPatch) {
    await mockDelay();
    assertMockWritable();
    const poster = find(chainId, id);
    if (patch.title === undefined && patch.enabled === undefined && patch.sortOrder === undefined) {
      throw new ApiError(400, "At least one poster field is required");
    }
    if (patch.title !== undefined) {
      const error = validatePosterTitle(patch.title);
      if (error) throw new ApiError(400, error, [error]);
      poster.title = patch.title.trim();
    }
    if (patch.enabled !== undefined) poster.enabled = patch.enabled;
    if (patch.sortOrder !== undefined) poster.sortOrder = patch.sortOrder;
    poster.updatedAt = nowISO();
    return { ...poster };
  },
  async remove(chainId, id) {
    await mockDelay();
    assertMockWritable();
    find(chainId, id);
    byChain.set(
      chainId,
      listOf(chainId).filter((p) => p.id !== id),
    );
  },
};

export const postersMock: PostersApi = {
  async listPosters(chainId) {
    await mockDelay();
    return ordered(listOf(chainId)).map((p) => ({ ...p }));
  },
  uploadPoster: (chainId, file) => primitives.upload(chainId, file),
  updatePoster: (chainId, id, patch) => primitives.update(chainId, id, patch),
  deletePoster: (chainId, id) => primitives.remove(chainId, id),
  replaceImage: (chainId, current, file) => replaceImage(primitives, chainId, current, file),
  reorder: (chainId, patches) => reorder(primitives, chainId, patches),
};
