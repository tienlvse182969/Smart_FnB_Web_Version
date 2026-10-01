/**
 * Các kiểm tra mô phỏng lớp chặn của BE (BR-08, BR-09) bên trong mock, để đường báo lỗi của màn hình
 * thử được. BE mới là nơi chặn thật; FE chỉ báo sớm (usePlan, useReadOnly).
 */
import { ApiError } from "../http/errors";
import { mockPlanBase } from "../modules/plan/source";

/** BR-09: doanh nghiệp hết hạn/tạm ngưng ở chế độ chỉ đọc — mọi thao tác GHI bị chặn. */
export function assertMockWritable(): void {
  if (mockPlanBase().status !== "active") {
    throw new ApiError(
      403,
      "Doanh nghiệp đang ở chế độ chỉ đọc (hết hạn hoặc tạm ngưng) — không thể thay đổi cấu hình.",
      [],
      "SUBSCRIPTION_READ_ONLY",
    );
  }
}

/** BR-08: gói không có tính năng thì BE chặn dù FE có ẩn nút hay không. */
export function assertMockFeature(feature: "branding" | "multiBranchCompare" | "aiAssistant"): void {
  const f = mockPlanBase().features[feature];
  if (!f.enabled) {
    throw new ApiError(403, "Gói hiện tại không có tính năng này.", [], "PLAN_FEATURE_UNAVAILABLE");
  }
}
