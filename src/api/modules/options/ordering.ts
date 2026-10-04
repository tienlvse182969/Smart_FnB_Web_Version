/**
 * Đổi chỗ bằng nút lên/xuống (quyết định 15, 17). `list` PHẢI theo thứ tự đang hiển thị (`displayOrder`, rồi tên).
 *   - `displayOrder` không trùng: đổi giá trị của hai dòng → đúng 2 lệnh.
 *   - Có trùng ở bất kỳ đâu trong danh sách: lần đổi này đánh số lại cả danh sách 0..n-1 (sau khi đổi chỗ) và chỉ trả các dòng
 *     có giá trị thay đổi, theo thứ tự gửi.
 * Trả `null` khi ra ngoài danh sách.
 */
export type OrderChange = { id: string; displayOrder: number };

export function planReorder(list: readonly OrderChange[], index: number, delta: -1 | 1): OrderChange[] | null {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return null;
  const hasTies = new Set(list.map((x) => x.displayOrder)).size !== list.length;
  if (!hasTies) {
    const a = list[index];
    const b = list[target];
    return [
      { id: a.id, displayOrder: b.displayOrder },
      { id: b.id, displayOrder: a.displayOrder },
    ];
  }
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((x, i) => ({ id: x.id, displayOrder: i, was: x.displayOrder })).filter((x) => x.displayOrder !== x.was).map(({ id, displayOrder }) => ({ id, displayOrder }));
}

/** Gửi tuần tự từng thay đổi; dù thành công hay lỗi giữa chừng đều nạp lại từ nguồn (`reload`), lỗi được ném tiếp cho nơi gọi báo. */
export async function applyReorder(changes: readonly OrderChange[], patch: (change: OrderChange) => Promise<unknown>, reload: () => Promise<void>): Promise<void> {
  try {
    for (const change of changes) await patch(change);
  } finally {
    await reload();
  }
}
