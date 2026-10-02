import { getPublicPlans, type PublicPlan } from "../../api";
import { formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import CtaButton from "./CtaButton";
import SectionHeading from "./SectionHeading";

// TODO(BE): chưa có endpoint công khai danh sách gói (docs/api-contract-plan.md mục 7, việc #8). Tạm đọc từ cấu hình mock dùng
// chung với plan mock và admin mock (api/publicPlans.ts) — khi BE có thì chỉ đổi hàm đó.
const HIGHLIGHTED_TIER = "STANDARD";

function limitLines(plan: PublicPlan): string[] {
  return [
    `Tối đa ${plan.maxBranches} chi nhánh`,
    `Tối đa ${plan.maxAccounts} tài khoản`,
    "POS, pha chế, màn hình gọi số, báo cáo chi nhánh",
    ...(plan.features.branding ? ["Nhận diện thương hiệu riêng"] : []),
    ...(plan.features.multiBranchCompare ? ["So sánh doanh thu đa chi nhánh"] : []),
    ...(plan.features.aiAssistant ? ["Trợ lý AI hỏi đáp số liệu"] : []),
  ];
}

export default function PricingSection() {
  const plans = getPublicPlans().map((p) => ({ ...p, highlighted: p.tier === HIGHLIGHTED_TIER }));
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Gói dịch vụ" title="Chọn gói theo quy mô chuỗi" />
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.code}
              className="relative flex flex-col rounded-[14px] bg-white p-6"
              style={{
                border: plan.highlighted ? "2px solid var(--brand-primary)" : `1px solid ${palette.line}`,
              }}
            >
              {plan.highlighted && (
                <span
                  className="absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  Phổ biến nhất
                </span>
              )}
              <h3 className="text-lg font-semibold" style={{ color: "var(--fnb-ink)" }}>
                {plan.name}
              </h3>
              <p className="mt-2 text-2xl font-bold" style={{ color: "var(--fnb-ink)" }}>
                {formatVnd(plan.monthlyPrice)} / tháng
              </p>
              <ul className="mt-6 flex-1 space-y-2">
                {limitLines(plan).map((limit) => (
                  <li key={limit} className="text-sm text-zinc-600">
                    {limit}
                  </li>
                ))}
              </ul>
              <CtaButton className="mt-6 w-full" />
              <p className="mt-3 text-center text-xs text-zinc-500">
                Đội ngũ phản hồi trong 1–2 ngày làm việc
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
