import { Card, Progress, Skeleton, Tag } from "antd";
import { Check, X } from "lucide-react";
import { SectionTitle } from "../../components/bits";
import { usePlan } from "../../plan/usePlan";
import { palette } from "../../theme";
import type { FeatureKey, PlanStatus, QuotaResource } from "../../types";

/** Câu cho mọi dữ liệu gói mà máy chủ chưa trả (quyết định 36; api-contract-plan #38). */
export const PLAN_PENDING_TEXT = "Chưa có dữ liệu từ máy chủ (chờ BE #38)";
/** Dòng liên hệ (quyết định 37): không có nút gia hạn hay đổi gói, BR-10. */
export const PLAN_CONTACT_TEXT = "Liên hệ quản trị nền tảng để đổi gói hoặc gia hạn.";

/** Tên tính năng theo bảng gói của đặc tả v9 mục 13.1 (`Smart-FnB-Dac-ta-v9.md:1214-1226`). Mọi khoá của `FeatureKey` phải có mặt. */
export const FEATURE_LABEL: Record<FeatureKey, string> = {
  branding: "Nhận diện thương hiệu",
  multiBranchCompare: "So sánh đa chi nhánh",
  aiAssistant: "Trợ lý AI",
};
/** Cờ BE thật sự trả trên gói (`plan-quota.service.ts:23-24`); cờ AI chưa có ở BE (#30). */
const BACKEND_FLAGS: FeatureKey[] = ["branding", "multiBranchCompare"];

const RESOURCE_LABEL: Record<QuotaResource, string> = { branches: "Chi nhánh", accounts: "Tài khoản" };
const STATUS_LABEL: Record<PlanStatus, string> = { active: "Đang hoạt động", expired: "Đã hết hạn", suspended: "Tạm ngưng" };

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

/**
 * "Gói của tôi" (OW-10, đặc tả `:309`): tên gói, hạn mức đã dùng/tối đa, tính năng có và chưa có. Không có nút gia hạn/đổi gói và không
 * so sánh các gói (quyết định 37, 39). Dữ liệu lấy từ gói đã nạp cùng phạm vi làm việc (`GET /restaurant-chains`), nên lỗi đọc
 * hiện ở màn lỗi nạp khu vực (có nút Thử lại), không phải ở màn này.
 */
export default function MyPlan() {
  const { plan, loading } = usePlan();

  if (!plan) {
    return (
      <div>
        <SectionTitle title="Gói của tôi" />
        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
      </div>
    );
  }

  if (plan.noActivePlan) {
    return (
      <div>
        <SectionTitle title="Gói của tôi" />
        <Card data-testid="myplan-none" style={{ borderRadius: 14, maxWidth: 560 }} styles={{ body: { padding: 22 } }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Không có gói đang hoạt động</div>
          <div data-testid="myplan-contact" style={{ fontSize: 13.5, color: palette.textMuted }}>
            {PLAN_CONTACT_TEXT}
          </div>
        </Card>
      </div>
    );
  }

  const fromBackend = plan.source.features === "real";
  return (
    <div>
      <SectionTitle title="Gói của tôi" sub="Gói dịch vụ, hạn mức và tính năng của doanh nghiệp (chỉ xem)" />
      <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
          <div style={{ fontSize: 12.5, color: palette.textMuted, marginBottom: 4 }}>Gói đang dùng</div>
          <div data-testid="myplan-name" style={{ fontWeight: 700, fontSize: 20, marginBottom: 14 }}>
            {plan.planName}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", rowGap: 8, fontSize: 13.5 }}>
            <span style={{ color: palette.textMuted }}>Trạng thái</span>
            <span data-testid="myplan-status">{plan.status ? STATUS_LABEL[plan.status] : PLAN_PENDING_TEXT}</span>
            <span style={{ color: palette.textMuted }}>Hết hạn</span>
            <span data-testid="myplan-expiry">{plan.expiresAt ? dateLabel(plan.expiresAt) : PLAN_PENDING_TEXT}</span>
          </div>
        </Card>

        <Card title="Hạn mức" style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
          {plan.limits.length === 0 ? (
            <div style={{ fontSize: 13.5, color: palette.textMuted }}>Chưa có dữ liệu hạn mức.</div>
          ) : (
            plan.limits.map((l) => {
              const full = l.limit > 0 && l.used >= l.limit;
              const percent = l.limit > 0 ? Math.min(100, Math.round((l.used / l.limit) * 100)) : 0;
              return (
                <div key={l.resource} data-testid={`myplan-limit-${l.resource}`} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{RESOURCE_LABEL[l.resource]}</span>
                    <span>
                      Đã dùng {l.used} / {l.limit}
                      {full && (
                        <Tag data-testid={`myplan-limit-warn-${l.resource}`} color="warning" style={{ marginLeft: 8, marginRight: 0 }}>
                          {l.used > l.limit ? "Vượt hạn mức" : "Đã hết hạn mức"}
                        </Tag>
                      )}
                    </span>
                  </div>
                  <Progress percent={percent} showInfo={false} status={full ? "exception" : "normal"} />
                </div>
              );
            })
          )}
        </Card>

        <Card title="Tính năng" style={{ borderRadius: 14 }} styles={{ body: { padding: 22 } }}>
          {(Object.keys(FEATURE_LABEL) as FeatureKey[]).map((key) => {
            const pending = fromBackend && !BACKEND_FLAGS.includes(key);
            const enabled = plan.features[key].enabled;
            return (
              <div key={key} data-testid={`myplan-feature-${key}`} data-enabled={pending ? "unknown" : String(enabled)} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, marginBottom: 10 }}>
                {pending ? null : enabled ? <Check size={16} color={palette.success.text} /> : <X size={16} color={palette.textSubtle} />}
                <span style={{ fontWeight: 600 }}>{FEATURE_LABEL[key]}</span>
                <span style={{ color: palette.textMuted }}>{pending ? "Chưa có dữ liệu từ máy chủ (chờ BE #30)" : enabled ? "Có" : "Chưa có"}</span>
              </div>
            );
          })}
        </Card>

        <div data-testid="myplan-contact" style={{ fontSize: 13.5, color: palette.textMuted }}>
          {PLAN_CONTACT_TEXT}
        </div>
      </div>
    </div>
  );
}
