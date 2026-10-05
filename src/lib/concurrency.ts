/**
 * Chạy `fn` cho từng phần tử, tối đa `limit` lời gọi cùng lúc; kết quả giữ đúng thứ tự đầu vào.
 * Một lời gọi lỗi thì dừng nhận việc mới và ném lỗi đầu tiên (các lời gọi đang chạy vẫn chạy nốt).
 */
export async function mapWithLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await fn(items[index], index);
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}
