import type { Poster } from "../../../types";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";
import { genId, nowISO } from "../../mock/util";
import type { PostersApi } from "./index";
import { loadPersistedPosters, savePersistedPosters } from "./persist";
import { DEFAULT_POSTER_DURATION, DEFAULT_POSTER_TITLE, MAX_POSTERS, comparePosters, validatePosterFile, validatePosterPatch } from "./validate";

/** Mock giữ ảnh dạng data URL (không có máy chủ lưu tệp). */
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ApiError(400, "Không đọc được ảnh"));
    reader.readAsDataURL(file);
  });

/** "Máy chủ" của mock: bộ nhớ phiên, nạp lại từ localStorage mỗi lần (tab khác lưu thì tab này thấy ở lần gọi sau, và sống qua F5). */
const stores = new Map<string, Poster[]>();

/** Bỏ bộ nhớ phiên (dùng cho test; localStorage xoá riêng bằng `clearPersistedPosters`). */
export function resetMockPosters(): void {
  stores.clear();
}

function load(chainId: string): Poster[] {
  const saved = loadPersistedPosters(chainId);
  if (saved) stores.set(chainId, saved);
  const list = stores.get(chainId) ?? [];
  stores.set(chainId, list);
  return list;
}

function commit(chainId: string, list: Poster[]): void {
  stores.set(chainId, list);
  savePersistedPosters(chainId, list);
}

const find = (list: Poster[], id: string): number => {
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) throw new ApiError(404, "Poster not found in this chain");
  return i;
};

// Mock phản chiếu BE: thêm đặt `sortOrder` = số poster hiện có (nên sau khi xoá có thể trùng), PATCH chỉ đặt một dòng, xoá không đánh số lại.
export const postersMock: PostersApi = {
  async listPosters(chainId) {
    await mockDelay();
    return load(chainId)
      .map((p) => ({ ...p }))
      .sort(comparePosters);
  },

  async addPoster(chainId, input) {
    await mockDelay();
    assertMockWritable();
    const problem = validatePosterFile(input.file);
    if (problem) throw new ApiError(400, problem, [problem]);
    const list = load(chainId);
    if (list.length >= MAX_POSTERS) throw new ApiError(409, `A chain may have at most ${MAX_POSTERS} posters; remove one before uploading`);
    const now = nowISO();
    const poster: Poster = {
      id: genId("poster"),
      imageUrl: await readAsDataUrl(input.file),
      title: DEFAULT_POSTER_TITLE,
      enabled: true,
      sortOrder: list.length,
      durationSeconds: DEFAULT_POSTER_DURATION,
      createdAt: now,
      updatedAt: now,
    };
    commit(chainId, [...list, poster]);
    return { ...poster };
  },

  async updatePoster(chainId, id, patch) {
    await mockDelay();
    assertMockWritable();
    const problem = validatePosterPatch(patch);
    if (problem) throw new ApiError(400, problem, [problem]);
    const list = load(chainId);
    const i = find(list, id);
    const next = [...list];
    next[i] = {
      ...next[i],
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.enabled !== undefined && { enabled: patch.enabled }),
      ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
      ...(patch.durationSeconds !== undefined && { durationSeconds: patch.durationSeconds }),
      updatedAt: nowISO(),
    };
    commit(chainId, next);
    return { ...next[i] };
  },

  async deletePoster(chainId, id) {
    await mockDelay();
    assertMockWritable();
    const list = load(chainId);
    const i = find(list, id);
    commit(
      chainId,
      list.filter((_, idx) => idx !== i),
    );
  },
};
