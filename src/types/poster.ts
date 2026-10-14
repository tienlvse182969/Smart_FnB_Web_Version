/** Poster hiển thị trên màn hình phụ (backscreen) của thu ngân; Owner quản lý, áp cho mọi chi nhánh trong chuỗi. */
export interface Poster {
  id: string;
  /** URL tuyệt đối (real) hoặc data URL (mock). */
  imageUrl: string;
  /** Luôn có (BE đặt "Poster" khi tải lên), 1–120 ký tự. */
  title: string;
  /** false = tạm ẩn, màn hình sau bỏ qua khi xoay vòng. */
  enabled: boolean;
  /** Thứ tự xoay vòng tăng dần, 0–10000. KHÔNG đảm bảo liên tục hay khác nhau (BE xếp hoà theo `createdAt`, rồi `id`). */
  sortOrder: number;
  /** Thời gian poster hiện trước khi chuyển sang ảnh kế, 3–60 giây (mặc định 8). */
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
}
