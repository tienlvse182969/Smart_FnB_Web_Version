import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CircleUserRound, Download, Smartphone, UserCheck } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import { TabletFrame } from "./DeviceFrame";
import { SCREENSHOTS } from "./screenshots";
import { palette } from "../../theme";

/** Link tham gia kênh thử nghiệm khép kín của app Android trên Google Play. */
const PLAY_TESTING_URL = "https://play.google.com/apps/testing/com.smartfnb.pos";

const STEPS = [
  {
    icon: CircleUserRound,
    title: "Đăng nhập tài khoản Google",
    body: "Bấm “Đăng ký thử nghiệm” và đăng nhập bằng tài khoản Google bạn dùng trên máy Android.",
  },
  {
    icon: UserCheck,
    title: "Trở thành người thử nghiệm",
    body: "Trên trang Google Play mở ra, bấm “Trở thành người thử nghiệm” để tham gia chương trình.",
  },
  {
    icon: Download,
    title: "Tải ứng dụng từ Google Play",
    body: "Bấm liên kết tải trên cùng trang đó, hoặc tìm “Smart F&B” trong Google Play rồi cài đặt.",
  },
];

export default function DownloadAppPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Tải ứng dụng — Smart F&B";
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Về trang chủ Smart F&B">
            <Logo />
          </Link>
          <Link to="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
            Trang chủ
          </Link>
        </div>
      </header>

      <main>
        <section className="py-16 md:py-24" style={{ backgroundColor: palette.paper }}>
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: palette.statusDone }} />
                Thử nghiệm khép kín trên Google Play
              </span>
              <h1
                className="mt-6 text-4xl font-bold leading-[1.15] md:text-5xl"
                style={{ color: "var(--fnb-ink)", letterSpacing: "-0.02em" }}
              >
                Hãy là người dùng đầu tiên trải nghiệm ứng dụng của Smart F&B
              </h1>
              <p className="mt-6 text-base leading-relaxed text-zinc-600 md:text-lg">
                Ứng dụng Android cho thu ngân và pha chế: gọi món, thanh toán tại quầy và hàng đợi làm món trên máy
                tính bảng. Đăng ký thử nghiệm để dùng trước bản mới nhất và góp ý giúp chúng tôi hoàn thiện sản phẩm.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <a
                  href={PLAY_TESTING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "var(--brand-primary)", color: palette.onBrand }}
                >
                  <Smartphone className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Đăng ký thử nghiệm
                </a>
                <span className="text-sm text-zinc-500">Miễn phí · dành cho máy Android</span>
              </div>
            </div>

            <figure>
              <TabletFrame shot={SCREENSHOTS.pos} priority />
              <figcaption className="mt-4 text-center text-xs text-zinc-500">
                Màn hình bán hàng của thu ngân trên máy tính bảng Android
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-bold md:text-3xl" style={{ color: "var(--fnb-ink)", letterSpacing: "-0.01em" }}>
              Tham gia trong 3 bước
            </h2>
            <ol className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-zinc-200 p-6">
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                      style={{ backgroundColor: "var(--brand-primary)", color: palette.onBrand }}
                    >
                      {i + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-zinc-400" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-zinc-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
