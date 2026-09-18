import { Check, X } from "lucide-react";
import SectionHeading from "./SectionHeading";

const fits = [
  "Quán cơm, quán bún phở",
  "Quán ăn tầm trung",
  "Cà phê, trà sữa",
  "Quán nhậu, lẩu nướng",
  "Kể cả loại hình khách gọi thêm nhiều lần trong bữa",
];

const notFits = [
  "Buffet tính theo đầu người",
  "Quán tự phục vụ tại quầy",
  "Chuỗi trên 20 chi nhánh",
];

export default function FitSection() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#fafafa" }}>
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Phân khúc" title="Phù hợp với ai" />
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-[14px] border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <Check className="h-4 w-4 text-white" strokeWidth={2} aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold" style={{ color: "var(--brand-ink)" }}>
                Phù hợp
              </h3>
            </div>
            <ul className="mt-5 space-y-3">
              {fits.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[14px] border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100">
                <X className="h-4 w-4 text-zinc-500" strokeWidth={2} aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold" style={{ color: "var(--brand-ink)" }}>
                Chưa phù hợp
              </h3>
            </div>
            <ul className="mt-5 space-y-3">
              {notFits.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.75} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
