/**
 * Hai thao tác BE `4b81e48` CHƯA có endpoint riêng (#82) được GHÉP từ endpoint hiện có. Dùng chung cho real và mock để cùng một thứ tự lệnh.
 *
 * - `replaceImage` (đặc tả 20.2 "Đổi ảnh: giữ nguyên vị trí, tên, bật/tắt; xoá tệp cũ"): `POST` ảnh mới (BE thêm vào cuối, tên "Poster",
 *   đang bật) → `PATCH` chép lại tên, bật/tắt và `sortOrder` của áp phích cũ → `DELETE` áp phích cũ. KHÔNG nguyên tử: nếu `PATCH` lỗi thì
 *   cố `DELETE` bản mới (không để thừa một áp phích) rồi ném lỗi; áp phích cũ còn nguyên. Cần còn chỗ trống (BE đếm cả áp phích cũ khi `POST`).
 * - `reorder` (BE không có `PUT …/order`): `PATCH sortOrder` cho từng áp phích bị đổi chỗ, tuần tự (xem `moveOrder`).
 */
import type { Poster, PosterPatch } from "../../../types";
import type { SortPatch } from "./rules";

export interface PosterPrimitives {
  upload(chainId: string, file: File): Promise<Poster>;
  update(chainId: string, id: string, patch: PosterPatch): Promise<Poster>;
  remove(chainId: string, id: string): Promise<void>;
}

export async function replaceImage(api: PosterPrimitives, chainId: string, current: Poster, file: File): Promise<Poster> {
  const created = await api.upload(chainId, file);
  let restored: Poster;
  try {
    restored = await api.update(chainId, created.id, { title: current.title, enabled: current.enabled, sortOrder: current.sortOrder });
  } catch (err) {
    await api.remove(chainId, created.id).catch(() => undefined);
    throw err;
  }
  await api.remove(chainId, current.id);
  return restored;
}

export async function reorder(api: PosterPrimitives, chainId: string, patches: SortPatch[]): Promise<void> {
  for (const patch of patches) await api.update(chainId, patch.id, { sortOrder: patch.sortOrder });
}
