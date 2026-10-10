import { useCallback, useEffect, useState } from "react";
import { describeApiError, loadPublicPlans, type PublicPlan } from "../../api";
import { formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import CtaButton from "./CtaButton";
import SectionHeading from "./SectionHeading";

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
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await loadPublicPlans(force));
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = plans.map((plan) => ({ ...plan, highlighted: plan.tier === HIGHLIGHTED_TIER }));
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Gói dịch vụ" title="Chọn gói theo quy mô chuỗi" />
        {error && (
          <div role="alert" className="mx-auto mt-8 max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            <p>Không tải được danh sách gói. {error}</p>
            <button type="button" className="mt-3 min-h-11 rounded-lg border border-red-300 px-4 font-medium" onClick={() => void load(true)}>
              Thử lại
            </button>
          </div>
        )}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3" aria-busy={loading}>
          {loading && [0, 1, 2].map((index) => <PlanSkeleton key={index} />)}
          {!loading && !error && cards.length === 0 && (
            <p className="col-span-full text-center text-sm text-zinc-500">Hiện chưa có gói dịch vụ đang mở đăng ký.</p>
          )}
          {!loading && !error && cards.map((plan) => (
            <div
              key={plan.id}
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

function PlanSkeleton() {
  return (
    <div
      className="min-h-80 animate-pulse rounded-[14px] border border-zinc-200 bg-white p-6 motion-reduce:animate-none"
      aria-hidden="true"
    >
      <div className="h-5 w-2/5 rounded bg-zinc-200" />
      <div className="mt-4 h-8 w-3/5 rounded bg-zinc-200" />
      <div className="mt-8 space-y-3">
        <div className="h-4 rounded bg-zinc-100" />
        <div className="h-4 w-5/6 rounded bg-zinc-100" />
        <div className="h-4 w-4/5 rounded bg-zinc-100" />
      </div>
    </div>
  );
}
