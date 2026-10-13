/**
 * Ánh xạ `GET /restaurant-chains/:chainId/display-posters` (BE `4b81e48`, `display-posters.service.ts` `list`) sang `Poster` theo WHITELIST.
 * `imageUrl` BE trả đường dẫn TƯƠNG ĐỐI `/uploads/posters/<chainId>-<uuid>.<ext>` (phục vụ ở gốc máy chủ, KHÔNG dưới `/api/v1`) →
 * ghép với gốc máy chủ như logo. Bỏ `chainId`, `createdAt`, `deletedAt` và mọi trường lạ.
 */
import type { Poster } from "../../../types";
import { absoluteLogoUrl } from "../branding/mapper";
import { POSTER_LIMITS } from "./rules";

export interface RawPoster {
  id: string;
  title?: string | null;
  imageUrl?: string | null;
  enabled?: boolean;
  sortOrder?: number;
  durationSeconds?: number;
  updatedAt?: string | null;
}

export function mapPoster(raw: RawPoster, origin?: string): Poster {
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "",
    imageUrl: absoluteLogoUrl(raw.imageUrl, origin) ?? "",
    enabled: raw.enabled !== false,
    sortOrder: typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
    durationSeconds:
      typeof raw.durationSeconds === "number" && Number.isFinite(raw.durationSeconds) ? raw.durationSeconds : POSTER_LIMITS.defaultSeconds,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
  };
}

/** Danh sách đã sắp theo `sortOrder` rồi giữ thứ tự BE (BE đã sắp `sortOrder, createdAt, id`; sắp ổn định nên trùng vẫn đúng). */
export function mapPosterList(raw: unknown, origin?: string): Poster[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is RawPoster => !!r && typeof r === "object" && typeof (r as RawPoster).id === "string")
    .map((r) => mapPoster(r, origin));
}
