import CtaButton from "./CtaButton";
import SectionHeading from "./SectionHeading";

const plans = [
  {
    name: "Cơ bản",
    price: "X.XXX.XXX ₫ / tháng",
    limits: ["Tối đa 2 chi nhánh", "Tối đa 15 tài khoản", "Tối đa 20 bàn mỗi chi nhánh"],
    highlighted: false,
  },
  {
    name: "Tiêu chuẩn",
    price: "X.XXX.XXX ₫ / tháng",
    limits: ["Tối đa 5 chi nhánh", "Tối đa 40 tài khoản", "Tối đa 40 bàn mỗi chi nhánh"],
    highlighted: true,
  },
  {
    name: "Mở rộng",
    price: "X.XXX.XXX ₫ / tháng",
    limits: ["Tối đa 10 chi nhánh", "Tối đa 80 tài khoản", "Tối đa 60 bàn mỗi chi nhánh"],
    highlighted: false,
  },
];

export default function PricingSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Gói dịch vụ" title="Chọn gói theo quy mô chuỗi" />
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative flex flex-col rounded-[14px] bg-white p-6"
              style={{
                border: plan.highlighted ? "2px solid var(--brand-primary)" : "1px solid #e4e4e7",
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
              <h3 className="text-lg font-semibold" style={{ color: "var(--brand-ink)" }}>
                {plan.name}
              </h3>
              <p className="mt-2 text-2xl font-bold" style={{ color: "var(--brand-ink)" }}>
                {plan.price}
              </p>
              <ul className="mt-6 flex-1 space-y-2">
                {plan.limits.map((limit) => (
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
