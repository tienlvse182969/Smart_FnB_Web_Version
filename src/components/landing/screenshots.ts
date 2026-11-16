import pos from "../../assets/landing/pos.webp";
import baristaQueue from "../../assets/landing/barista-queue.webp";
import baristaStarted from "../../assets/landing/barista-started.webp";
import options from "../../assets/landing/options.webp";
import reports from "../../assets/landing/reports.webp";
import type { Screenshot } from "./DeviceFrame";

/**
 * Ảnh chụp màn hình thật của sản phẩm cho landing (nguồn gốc: `assets/homepage/`,
 * đã cắt thanh trạng thái Android / sidebar web và chuyển sang webp).
 */
export const SCREENSHOTS = {
  pos: { src: pos, width: 1600, height: 999, alt: "Màn hình bán hàng của thu ngân: thực đơn có ảnh và đơn đang tạo với tuỳ chọn từng món" },
  baristaQueue: {
    src: baristaQueue,
    width: 1600,
    height: 999,
    alt: "Hàng đợi làm món của pha chế: mỗi thẻ một món kèm số phiếu, thẻ chờ lâu được viền vàng",
  },
  baristaStarted: {
    src: baristaStarted,
    width: 1600,
    height: 999,
    alt: "Pha chế đang làm từng ly và cột Sẵn sàng nhận với máy báo rung, nút Đã giao",
  },
  options: { src: options, width: 1400, height: 564, alt: "Trang Tuỳ chọn trên web: nhóm kích cỡ, mức đường, mức đá kèm giá cộng thêm" },
  reports: {
    src: reports,
    width: 1400,
    height: 894,
    alt: "Báo cáo doanh thu theo thời gian và theo chi nhánh trên web của chủ chuỗi",
  },
} satisfies Record<string, Screenshot>;
