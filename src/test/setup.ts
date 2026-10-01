import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Đồng hồ cố định cho TOÀN BỘ bộ test: dữ liệu mock (đơn theo ngày, hạn dùng, khoảng ngày báo cáo) phụ thuộc "bây giờ", nên test
// không được phụ thuộc giờ chạy. Chỉ giả `Date`; setTimeout/độ trễ mock vẫn chạy thật. Đặt TEST_NOW=<ISO> để thử giờ khác.
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date(process.env.TEST_NOW ?? "2026-10-15T10:30:00+07:00"));

// Không bật globals nên Testing Library không tự dọn DOM sau mỗi test.
afterEach(() => cleanup());
