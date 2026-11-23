import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, CircleUserRound, Download, Smartphone, UserCheck } from "lucide-react";
import Logo from "./Logo";
import Footer from "./Footer";
import staffIcon from "../../assets/landing/app-icon-staff.png";
import backscreenIcon from "../../assets/landing/app-icon-backscreen.png";
import staffShot from "../../assets/landing/app-staff-pos.jpg";
import backscreenShot from "../../assets/landing/app-backscreen.jpg";
import { TabletFrame, type Screenshot } from "./DeviceFrame";
import { palette } from "../../theme";

type MobileApp = {
  name: string;
  /** Ảnh chụp app chạy trên máy tính bảng thật (đã cắt thanh trạng thái / thanh điều hướng Android). */
  shot: Screenshot;
  audience: string;
  icon: string;
  summary: string;
  features: string[];
  /** Link tham gia kênh thử nghiệm khép kín của app trên Google Play. */
  testingUrl: string;
};

const APPS: MobileApp[] = [
  {
    name: "Smart F&B",
    shot: {
      src: staffShot,
      width: 1600,
      height: 1000,
      alt: "App Smart F&B trên máy tính bảng: thực đơn có ảnh bên trái, đơn đang tạo và nút thanh toán bên phải",
    },
    audience: "Cho thu ngân và pha chế",
    icon: staffIcon,
    summary: "Ứng dụng bán hàng tại quầy trên máy tính bảng Android: thu ngân gọi món, nhận tiền, pha chế làm món.",
    features: [
      "Gọi món và thanh toán tại quầy",
      "Hàng đợi làm món cho pha chế",
      "In hoá đơn qua máy in Bluetooth",
    ],
    testingUrl: "https://play.google.com/apps/testing/com.smartfnb.pos",
  },
  {
    name: "Smart F&B Backscreen",
    shot: {
      src: backscreenShot,
      width: 1600,
      height: 1000,
      alt: "App Smart F&B Backscreen trên màn hình hướng về khách: ảnh quảng cáo món mới bên trái, đơn của khách và tổng tiền bên phải",
    },
    audience: "Cho màn hình phụ hướng về khách",
    icon: backscreenIcon,
    summary: "Ứng dụng cho máy tính bảng đặt trước mặt khách, ghép nối với máy thu ngân để khách theo dõi đơn của mình.",
    features: [
      "Khách xem món và tổng tiền khi thu ngân nhập đơn",
      "Hiện mã QR để khách quét trả tiền",
      "Ghép nối với máy thu ngân bằng mã ghép nối",
    ],
    testingUrl: "https://play.google.com/apps/testing/com.smartfnb.backscreen",
  },
];

const STEPS = [
  {
    icon: CircleUserRound,
    title: "Đăng nhập tài khoản Google",
    body: "Bấm “Đăng ký thử nghiệm” ở ứng dụng bạn cần và đăng nhập bằng tài khoản Google bạn dùng trên máy Android.",
  },
  {
    icon: UserCheck,
    title: "Trở thành người thử nghiệm",
    body: "Trên trang Google Play mở ra, bấm “Trở thành người thử nghiệm” để tham gia chương trình.",
  },
  {
    icon: Download,
    title: "Tải ứng dụng từ Google Play",
    body: "Bấm liên kết tải trên cùng trang đó, hoặc tìm tên ứng dụng trong Google Play rồi cài đặt.",
  },
];

function AppCard({ app }: { app: MobileApp }) {
  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      <TabletFrame shot={app.shot} priority />
      <div className="mt-8 flex items-center gap-4">
        <img
          src={app.icon}
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-2xl border border-zinc-200 bg-white"
        />
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--fnb-ink)" }}>
            {app.name}
          </h2>
          <p className="text-sm text-zinc-500">{app.audience}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-zinc-600">{app.summary}</p>
      <ul className="mb-8 mt-5 space-y-2.5">
        {app.features.map((feature) => (
          <li key={feature} className="flex gap-2.5 text-sm text-zinc-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: palette.statusDone }} strokeWidth={2.25} aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <a
        href={app.testingUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Đăng ký thử nghiệm ${app.name}`}
        className="mt-auto inline-flex items-center justify-center gap-2 self-start rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--brand-primary)", color: palette.onBrand }}
      >
        <Smartphone className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Đăng ký thử nghiệm
      </a>
    </article>
  );
}

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
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
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
                Smart F&B có hai ứng dụng Android cho quầy bán hàng. Đăng ký thử nghiệm ứng dụng bạn cần để dùng trước
                bản mới nhất và góp ý giúp chúng tôi hoàn thiện sản phẩm. Miễn phí, dành cho máy Android.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              {APPS.map((app) => (
                <AppCard key={app.name} app={app} />
              ))}
            </div>
            <p className="mt-6 text-sm text-zinc-500">
              Dùng cả máy thu ngân lẫn màn hình phụ? Đăng ký thử nghiệm riêng cho từng ứng dụng.
            </p>
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
