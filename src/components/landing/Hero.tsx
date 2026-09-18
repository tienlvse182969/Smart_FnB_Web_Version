import { CheckCircle2, Circle, Clock } from "lucide-react";
import CtaButton from "./CtaButton";
import Logo from "./Logo";

const orderLines = [
  { name: "2x Cơm sườn", note: "Ít cay", status: "done" },
  { name: "1x Canh chua cá", note: null, status: "cooking" },
  { name: "3x Trà đá", note: null, status: "queued" },
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
                Chuỗi quán ăn 2–10 chi nhánh
              </span>
              <h1
                className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                Phần mềm vận hành chuỗi quán ăn, thuê theo tháng
              </h1>
              <p className="mt-6 text-base leading-relaxed text-white/60 md:text-lg">
                Từ lúc khách ngồi xuống bàn tới lúc thu tiền xong: ghi order tại bàn, chạy thẳng
                xuống bếp, thu tiền qua QR hoặc tiền mặt, và so sánh doanh thu giữa các chi nhánh
                trên một màn hình.
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
                <span className="text-sm font-semibold" style={{ color: "var(--brand-ink)" }}>
                  Bàn 12 · 4 khách
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  Đang phục vụ
                </span>
              </div>
              <div className="mt-4 space-y-4">
                {orderLines.map((line) => (
                  <div key={line.name} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--brand-ink)" }}>
                        {line.name}
                      </div>
                      {line.note && <div className="mt-0.5 text-xs text-zinc-500">Ghi chú: {line.note}</div>}
                    </div>
                    {statusIcon[line.status as keyof typeof statusIcon]}
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                Order chạy thẳng xuống màn hình bếp ngay khi bấm gửi
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
                  <div className="text-sm font-semibold" style={{ color: "var(--brand-ink)" }}>
                    Món xong — Bàn 12
                  </div>
                  <div className="text-xs text-zinc-500">Nhân viên nào rảnh bấm nhận trước</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
