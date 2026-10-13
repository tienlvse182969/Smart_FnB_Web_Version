/**
 * Áp phích màn hình phía khách (OW-11, đặc tả 9.2 mục 20, BR-51, BR-52). Một danh sách cho cả doanh nghiệp, không theo chi nhánh/quầy.
 * Hình dạng theo `GET /restaurant-chains/:chainId/display-posters` của BE `4b81e48` (`display-poster.dto.ts`).
 */
export type Poster = {
  id: string;
  /** Tên để Owner phân biệt, không hiện cho khách. BE đặt "Poster" khi tải lên. */
  title: string;
  /** URL tuyệt đối (BE trả đường dẫn tương đối `/uploads/posters/…`, ghép với gốc máy chủ). */
  imageUrl: string;
  enabled: boolean;
  /** Tăng dần; trùng thì theo ngày tạo rồi id (BE sắp). Web chỉ dựa vào thứ tự mảng đã được BE sắp. */
  sortOrder: number;
  /** Thời lượng mỗi ảnh (giây), BE 3–60, mặc định 8 (đặc tả cố định 8, #82). */
  durationSeconds: number;
  updatedAt: string | null;
};

/** Trường đổi được qua `PATCH` (BE `UpdateDisplayPosterDto`). */
export type PosterPatch = {
  title?: string;
  enabled?: boolean;
  sortOrder?: number;
};
