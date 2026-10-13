/**
 * Module posters — áp phích màn hình phía khách (OW-11, đặc tả 9.2 mục 20, BR-51). Chỉ Owner; danh sách dùng chung cho cả doanh nghiệp.
 * Real: `GET/POST/PATCH/DELETE /restaurant-chains/:chainId/display-posters` (BE `4b81e48`). Hợp đồng lệch đặc tả 20.4 (#82): xem `rules.ts`.
 */
import type { Poster, PosterPatch } from "../../../types";
import { defineApi } from "../../define";
import { postersMock } from "./mock";
import { postersReal } from "./real";
import type { SortPatch } from "./rules";

export interface PostersApi {
  /** Mọi áp phích chưa xoá (kể cả đang tắt), đúng thứ tự xoay vòng. Mọi vai trò khác Owner → 403. */
  listPosters(chainId: string): Promise<Poster[]>;
  /** Thêm vào cuối, mặc định bật, tên "Poster". 400 định dạng/dung lượng, 409 đủ số lượng, 403 chỉ đọc. */
  uploadPoster(chainId: string, file: File): Promise<Poster>;
  /** Đổi tên, bật/tắt hoặc vị trí. */
  updatePoster(chainId: string, id: string, patch: PosterPatch): Promise<Poster>;
  /** Xoá mềm; không khôi phục (BE giữ tệp ảnh). */
  deletePoster(chainId: string, id: string): Promise<void>;
  /** GHÉP: tải ảnh mới, chép tên/bật/vị trí, xoá cũ (xem `compose.ts`). */
  replaceImage(chainId: string, current: Poster, file: File): Promise<Poster>;
  /** GHÉP: `PATCH sortOrder` từng áp phích (xem `moveOrder` ở `rules.ts`). */
  reorder(chainId: string, patches: SortPatch[]): Promise<void>;
}

export const postersApi = defineApi<PostersApi>("posters", { real: postersReal, mock: postersMock });
