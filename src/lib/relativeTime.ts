/** Thời gian tương đối bằng tiếng Việt cho "lần cuối thấy" của thiết bị: "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước". */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "Chưa thấy";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "Chưa thấy";
  const seconds = Math.max(0, Math.floor((now - t) / 1000));
  if (seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}
