import { describe, expect, it } from "vitest";
import { relativeTime } from "./relativeTime";

const NOW = Date.parse("2026-10-02T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("relativeTime", () => {
  it("vừa xong, phút, giờ, ngày", () => {
    expect(relativeTime(ago(10_000), NOW)).toBe("vừa xong");
    expect(relativeTime(ago(59_000), NOW)).toBe("vừa xong");
    expect(relativeTime(ago(60_000), NOW)).toBe("1 phút trước");
    expect(relativeTime(ago(5 * 60_000), NOW)).toBe("5 phút trước");
    expect(relativeTime(ago(59 * 60_000), NOW)).toBe("59 phút trước");
    expect(relativeTime(ago(3 * 3_600_000), NOW)).toBe("3 giờ trước");
    expect(relativeTime(ago(23 * 3_600_000), NOW)).toBe("23 giờ trước");
    expect(relativeTime(ago(2 * 86_400_000), NOW)).toBe("2 ngày trước");
  });

  it("chưa từng thấy / giá trị hỏng / thời điểm ở tương lai", () => {
    expect(relativeTime(null, NOW)).toBe("Chưa thấy");
    expect(relativeTime(undefined, NOW)).toBe("Chưa thấy");
    expect(relativeTime("không phải ngày", NOW)).toBe("Chưa thấy");
    expect(relativeTime(new Date(NOW + 60_000).toISOString(), NOW)).toBe("vừa xong");
  });
});
