import { CheckCircle2, Circle, Clock } from "lucide-react";
import CtaButton from "./CtaButton";
import Logo from "./Logo";

const orderLines = [
  { name: "2x Trà sữa trân châu", note: "Size L · 50% đường", status: "done" },
  { name: "1x Cà phê muối", note: null, status: "cooking" },
  { name: "3x Trà đào", note: null, status: "queued" },
];

const statusIcon = {
  done: <CheckCircle2 className="h-4 w-4 text-zinc-400" strokeWidth={1.75} aria-hidden="true" />,
  cooking: <Clock className="h-4 w-4 text-zinc-400" strokeWidth={1.75} aria-hidden="true" />,
  queued: <Circle className="h-4 w-4 text-zinc-300" strokeWidth={1.75} aria-hidden="true" />,
} as const;

export default function Hero() {
  return (
    <section className="overflow-hidden py-20 md:py-28" style={{ backgroundColor: "var(--brand-primary)" }}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Logo inverted />
            <div className="mt-14 max-w-xl">
              <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Chuỗi đồ uống 2–10 chi nhánh
              </span>
              <h1
                className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                Phần mềm bán hàng tại quầy cho chuỗi đồ uống, thuê theo tháng
              </h1>
              <p className="mt-6 text-base leading-relaxed text-white/60 md:text-lg">
                Từ lúc khách gọi món tới lúc nhận ly: gọi món và trả tiền trước tại quầy, đơn xuống
                quầy pha chế ngay khi khách trả tiền, tiền QR về thẳng tài khoản của chủ quán, và
                so sánh doanh thu giữa các chi nhánh trên một màn hình.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <CtaButton variant="inverted" />
                <span className="text-sm text-white/40">Đội ngũ phản hồi trong 1–2 ngày làm việc</span>
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:ml-auto">
            <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <span className="text-sm font-semibold" style={{ color: "var(--fnb-ink)" }}>
                  Phiếu số 042 · Đã thanh toán
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  Đang pha
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {orderLines.map((line) => (
                  <div key={line.name} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--fnb-ink)" }}>
                        {line.name}
                      </div>
                      {line.note && <div className="mt-0.5 text-xs text-zinc-500">Tuỳ chọn: {line.note}</div>}
                    </div>
                    {statusIcon[line.status as keyof typeof statusIcon]}
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                Đơn xuống quầy pha chế ngay khi khách trả tiền
              </div>
            </div>

            <div className="mt-4 ml-6 hidden max-w-[220px] rounded-[14px] border border-zinc-200 bg-white p-4 sm:block">
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  className="h-5 w-5"
                  style={{ color: "var(--brand-primary)" }}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--fnb-ink)" }}>
                    Sẵn sàng — Số 042
                  </div>
                  <div className="text-xs text-zinc-500">Màn hình gọi số mời khách nhận ly</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
