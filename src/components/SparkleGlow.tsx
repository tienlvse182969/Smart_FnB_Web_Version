import { Sparkle } from "lucide-react";

/**
 * Hiệu ứng "AI đang xử lý": vầng sáng nhiều màu (conic-gradient xoay + mờ, cùng bảng màu với
 * Aesthetic Space) quanh ô chứa icon Sparkle. Chỉ trang trí nên ẩn khỏi trình đọc màn hình;
 * câu chữ mô tả trạng thái do nơi dùng tự hiển thị. Style nằm ở index.css (.sparkle-glow*).
 */
export default function SparkleGlow({ size = 56 }: { size?: number }) {
  return (
    <div className="sparkle-glow" style={{ width: size, height: size }} aria-hidden data-testid="sparkle-glow">
      <span className="sparkle-glow__aura" />
      <span className="sparkle-glow__tile">
        <Sparkle size={Math.round(size * 0.43)} className="sparkle-glow__icon" />
      </span>
    </div>
  );
}
