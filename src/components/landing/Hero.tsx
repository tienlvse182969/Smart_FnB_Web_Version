import { Layers, QrCode, Store } from "lucide-react";
import CtaButton from "./CtaButton";
import { TabletFrame } from "./DeviceFrame";
import { SCREENSHOTS } from "./screenshots";
import heroBackground from "../../assets/brand/login-background.jpg";
import { inkAlpha, palette } from "../../theme";

const highlights = [
  { icon: Layers, label: "Tự gom ly giống nhau thành mẻ" },
  { icon: QrCode, label: "Tiền QR về thẳng tài khoản chủ" },
  { icon: Store, label: "So sánh doanh thu các chi nhánh" },
];

export default function Hero() {
  return (
    <section
      className="relative isolate overflow-hidden py-16 md:py-24"
      style={{ backgroundColor: "var(--brand-primary)" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(90deg, ${inkAlpha(94)} 0%, ${inkAlpha(86)} 50%, ${inkAlpha(70)} 100%)`,
        }}
      />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.statusDone }} />
              Dành cho chuỗi đồ uống 2–10 chi nhánh
            </span>
            <h1
              className="mt-6 text-4xl font-bold leading-[1.15] text-white md:text-5xl"
              style={{ letterSpacing: "-0.02em" }}
            >
              Bán hàng tại quầy cho chuỗi đồ uống,{" "}
              <span className="relative isolate inline-block whitespace-nowrap">
                thuê theo tháng
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-sm bg-white/20 md:h-4"
                />
              </span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/65 md:text-lg">
              Khách gọi món và trả tiền tại quầy, đơn xuống quầy pha chế ngay khi trả tiền, tiền QR về
              thẳng tài khoản của chủ quán — và doanh thu mọi chi nhánh nằm trên một màn hình.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <CtaButton variant="inverted" />
              <span className="text-sm text-white/45">Dùng thử 14 ngày · phản hồi trong 1–2 ngày làm việc</span>
            </div>
            <ul className="mt-10 flex flex-wrap gap-2.5">
              {highlights.map((item) => (
                <li
                  key={item.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-white/80"
                >
                  <item.icon className="h-4 w-4 text-white/60" strokeWidth={1.75} aria-hidden="true" />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>

          <figure>
            <TabletFrame shot={SCREENSHOTS.pos} priority />
            <figcaption className="mt-4 text-center text-xs text-white/45">
              Màn hình bán hàng của thu ngân trên máy tính bảng Android
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
