/**
 * Module posters — poster màn hình phụ (backscreen) của thu ngân; Owner quản lý, áp cho mọi chi nhánh trong chuỗi (OW-11).
 * Real: BE `display-posters.controller.ts` (`restaurant-chains/:chainId/display-posters`). BE KHÔNG có đổi ảnh tại chỗ và không có sắp xếp
 * hàng loạt: đổi ảnh = thêm mới rồi xoá cái cũ; đổi thứ tự = PATCH `sortOrder` từng poster.
 */
import type { Poster } from "../../../types";
import { defineApi } from "../../define";
import { postersMock } from "./mock";
import { postersReal } from "./real";

export interface PosterAddInput {
  file: File;
}

/** Chỉ các trường ĐÃ ĐỔI; rỗng bị từ chối (BE trả 400). */
export interface PosterPatch {
  title?: string;
  enabled?: boolean;
  sortOrder?: number;
  durationSeconds?: number;
}

export interface PostersApi {
  /** Trả theo thứ tự xoay vòng (`sortOrder`, rồi `createdAt`, rồi `id`), gồm cả poster đang tắt. Chưa có poster nào = màn hình sau dùng ảnh mặc định. */
  listPosters(chainId: string): Promise<Poster[]>;
  /** BE đặt tên "Poster", thời lượng 8 giây, `sortOrder` = số poster hiện có. Vượt `MAX_POSTERS` thì 409. */
  addPoster(chainId: string, input: PosterAddInput): Promise<Poster>;
  updatePoster(chainId: string, id: string, patch: PosterPatch): Promise<Poster>;
  /** Xoá mềm: tệp ảnh vẫn nằm trên máy chủ, nhưng poster biến mất khỏi danh sách và màn hình sau. */
  deletePoster(chainId: string, id: string): Promise<void>;
}

export const postersApi = defineApi<PostersApi>("posters", { real: postersReal, mock: postersMock });
