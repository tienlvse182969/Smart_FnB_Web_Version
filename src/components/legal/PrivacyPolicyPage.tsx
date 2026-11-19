import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "../landing/Logo";
import Footer from "../landing/Footer";

/** Email nhận yêu cầu về dữ liệu cá nhân. Google Play bắt buộc có kênh liên hệ. */
const CONTACT_EMAIL = "tranhuudangquan123@gmail.com";
const EFFECTIVE_DATE = "19/11/2026";

const PRODUCTS = [
  { name: "Smart F&B Staff", use: "Ứng dụng Android bán hàng tại quầy cho thu ngân và pha chế." },
  { name: "Smart F&B Backscreen", use: "Ứng dụng Android cho màn hình phụ hướng về khách: hiển thị đơn và mã QR thanh toán." },
  { name: "Trang web Smart F&B", use: "Trang quản trị cho quản lý thương hiệu, quản lý cửa hàng và màn hình gọi món." },
];

const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "pham-vi",
    title: "1. Phạm vi áp dụng",
    body: (
      <>
        <p>
          Chính sách này mô tả cách Smart F&B thu thập, sử dụng, lưu trữ và chia sẻ dữ liệu khi bạn dùng các sản phẩm
          dưới đây:
        </p>
        <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
          {PRODUCTS.map((p) => (
            <div key={p.name} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <span className="font-semibold text-zinc-900 sm:w-48 sm:shrink-0">{p.name}</span>
              <span className="text-zinc-600">{p.use}</span>
            </div>
          ))}
        </div>
        <p>
          Smart F&B là phần mềm cho thuê theo tháng dành cho chuỗi đồ uống. Doanh nghiệp thuê phần mềm (gọi là “doanh
          nghiệp”) tạo tài khoản cho nhân viên của mình và quyết định dữ liệu nào được nhập vào hệ thống. Smart F&B xử
          lý dữ liệu đó thay mặt doanh nghiệp để cung cấp dịch vụ.
        </p>
      </>
    ),
  },
  {
    id: "du-lieu",
    title: "2. Dữ liệu chúng tôi thu thập",
    body: (
      <>
        <h3>Thông tin tài khoản nhân viên</h3>
        <p>
          Họ tên, địa chỉ email, vai trò (thu ngân, pha chế, quản lý…) và chi nhánh làm việc. Tài khoản do doanh
          nghiệp tạo; bạn không tự đăng ký trong ứng dụng. Mật khẩu chỉ được lưu trên máy chủ dưới dạng đã mã hoá một
          chiều.
        </p>
        <h3>Dữ liệu bán hàng và vận hành</h3>
        <p>
          Đơn hàng, món và tuỳ chọn, số tiền, phương thức thanh toán, thời điểm tạo và hoàn tất đơn, nhân viên xử lý
          đơn, ca làm việc và số liệu đối soát tiền mặt.
        </p>
        <h3>Thông tin kỹ thuật trên thiết bị</h3>
        <p>
          Mã phiên đăng nhập, mã ghép nối giữa máy bán hàng và màn hình phụ, cấu hình máy in Bluetooth đã chọn, và
          danh sách tài khoản đăng nhập gần đây (chỉ gồm tên, email, vai trò — không có mật khẩu) để chọn nhanh trên
          máy dùng chung.
        </p>
        <h3>Những gì chúng tôi không thu thập</h3>
        <p>
          Ứng dụng không thu thập vị trí, danh bạ, ảnh, tệp trên máy, nội dung ghi âm hay mã định danh quảng cáo, và
          không yêu cầu khách mua hàng cung cấp thông tin cá nhân.
        </p>
      </>
    ),
  },
  {
    id: "quyen-thiet-bi",
    title: "3. Quyền truy cập trên thiết bị",
    body: (
      <ul>
        <li>
          <strong>Internet:</strong> đồng bộ đơn hàng, thực đơn và trạng thái thanh toán với máy chủ.
        </li>
        <li>
          <strong>Bluetooth</strong> (Smart F&B Staff): kết nối máy in nhiệt để in hoá đơn và phiếu pha chế. Ứng dụng
          chỉ giao tiếp với máy in bạn chọn và không dùng Bluetooth để xác định vị trí.
        </li>
        <li>
          <strong>Âm thanh</strong> (Smart F&B Staff): phát chuông báo khi có đơn mới. Ứng dụng không ghi âm và không
          gửi âm thanh đi đâu.
        </li>
        <li>
          <strong>Giữ màn hình sáng</strong> (Smart F&B Backscreen): để màn hình phụ luôn hiển thị cho khách trong giờ
          bán.
        </li>
      </ul>
    ),
  },
  {
    id: "muc-dich",
    title: "4. Mục đích sử dụng dữ liệu",
    body: (
      <ul>
        <li>Đăng nhập, phân quyền và cho biết ai đã xử lý đơn hàng nào.</li>
        <li>Nhận đơn, chuyển đơn sang quầy pha chế, in hoá đơn và hiển thị đơn cho khách.</li>
        <li>Tạo mã QR thanh toán và xác nhận khi khách đã chuyển khoản.</li>
        <li>Lập báo cáo doanh thu, ca làm việc và đối soát cho doanh nghiệp.</li>
        <li>Gửi email đặt lại mật khẩu, kích hoạt tài khoản và thông báo dịch vụ.</li>
        <li>Phát hiện lỗi, bảo vệ hệ thống khỏi truy cập trái phép.</li>
      </ul>
    ),
  },
  {
    id: "chia-se",
    title: "5. Chia sẻ dữ liệu",
    body: (
      <>
        <p>Chúng tôi không bán dữ liệu và không dùng dữ liệu cho quảng cáo. Dữ liệu chỉ được chia sẻ với:</p>
        <ul>
          <li>
            <strong>Doanh nghiệp bạn làm việc cho:</strong> quản lý cửa hàng và quản lý thương hiệu xem được đơn hàng,
            ca làm việc và báo cáo của chi nhánh mình.
          </li>
          <li>
            <strong>Đối tác thanh toán (payOS):</strong> mã đơn và số tiền cần thanh toán để tạo mã QR chuyển khoản.
            Chúng tôi không nhận hay lưu số tài khoản, số thẻ của khách.
          </li>
          <li>
            <strong>Nhà cung cấp hạ tầng:</strong> dịch vụ lưu trữ máy chủ, cơ sở dữ liệu và gửi email, chỉ để vận
            hành dịch vụ.
          </li>
          <li>
            <strong>Cơ quan nhà nước có thẩm quyền:</strong> khi pháp luật yêu cầu.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "bao-mat",
    title: "6. Lưu trữ và bảo mật",
    body: (
      <ul>
        <li>Dữ liệu truyền giữa ứng dụng và máy chủ được mã hoá qua HTTPS.</li>
        <li>Mã phiên đăng nhập được lưu trong vùng lưu trữ bảo mật của hệ điều hành.</li>
        <li>Mật khẩu không bao giờ được lưu trên thiết bị.</li>
        <li>Mỗi tài khoản chỉ truy cập được dữ liệu trong phạm vi vai trò và chi nhánh được giao.</li>
      </ul>
    ),
  },
  {
    id: "luu-giu",
    title: "7. Thời gian lưu giữ",
    body: (
      <p>
        Dữ liệu được giữ trong thời gian doanh nghiệp còn sử dụng dịch vụ. Dữ liệu bán hàng có thể được giữ lâu hơn
        nếu pháp luật về kế toán, thuế yêu cầu. Khi doanh nghiệp chấm dứt dịch vụ hoặc một tài khoản bị xoá, chúng tôi
        xoá hoặc ẩn danh dữ liệu cá nhân liên quan, trừ phần pháp luật bắt buộc lưu giữ. Dữ liệu lưu trên thiết bị sẽ
        mất khi bạn đăng xuất, xoá dữ liệu ứng dụng hoặc gỡ ứng dụng.
      </p>
    ),
  },
  {
    id: "quyen",
    title: "8. Quyền của bạn và yêu cầu xoá tài khoản",
    body: (
      <>
        <p>
          Bạn có quyền xem, sửa, yêu cầu xoá dữ liệu cá nhân của mình hoặc rút lại sự đồng ý, theo pháp luật Việt Nam
          về bảo vệ dữ liệu cá nhân. Để thực hiện:
        </p>
        <ol>
          <li>Liên hệ quản lý cửa hàng — họ có thể sửa thông tin hoặc khoá, xoá tài khoản của bạn ngay trên hệ thống; hoặc</li>
          <li>
            Gửi email tới <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> với tiêu đề “Yêu cầu xoá tài khoản”,
            kèm email đăng nhập và tên doanh nghiệp. Chúng tôi phản hồi trong vòng 30 ngày.
          </li>
        </ol>
        <p>
          Khi tài khoản bị xoá, thông tin đăng nhập và hồ sơ cá nhân được xoá. Lịch sử đơn hàng do bạn xử lý vẫn được
          doanh nghiệp giữ để phục vụ kế toán nhưng không còn gắn với thông tin liên hệ của bạn.
        </p>
      </>
    ),
  },
  {
    id: "tre-em",
    title: "9. Trẻ em",
    body: (
      <p>
        Các ứng dụng dành cho nhân viên của doanh nghiệp, không hướng tới trẻ em dưới 13 tuổi. Chúng tôi không cố ý thu
        thập dữ liệu của trẻ em.
      </p>
    ),
  },
  {
    id: "thay-doi",
    title: "10. Thay đổi chính sách",
    body: (
      <p>
        Khi chính sách thay đổi, chúng tôi cập nhật trang này và ngày hiệu lực ở đầu trang. Với thay đổi quan trọng,
        doanh nghiệp sẽ được thông báo qua email hoặc trong ứng dụng.
      </p>
    ),
  },
  {
    id: "lien-he",
    title: "11. Liên hệ",
    body: (
      <p>
        Mọi câu hỏi về quyền riêng tư, vui lòng gửi tới <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
];

/** Kiểu chữ cho nội dung văn bản (preflight của Tailwind bỏ hết kiểu mặc định của h3, ul, ol, a). */
const PROSE =
  "text-[15px] leading-7 text-zinc-700 [&_p]:mt-3 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-zinc-900 " +
  "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 " +
  "[&_a]:font-medium [&_a]:text-zinc-900 [&_a]:underline [&_a]:break-all [&_strong]:text-zinc-900";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "Chính sách quyền riêng tư — Smart F&B";
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Về trang chủ Smart F&B">
            <Logo />
          </Link>
          <Link to="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-900">
            Trang chủ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--fnb-ink)", letterSpacing: "-0.01em" }}>
          Chính sách quyền riêng tư
        </h1>
        <p className="mt-3 text-sm text-zinc-500">Có hiệu lực từ ngày {EFFECTIVE_DATE}</p>

        <nav aria-label="Mục lục" className="mt-8 rounded-xl bg-zinc-50 px-5 py-4 text-sm">
          <p className="font-semibold text-zinc-900">Mục lục</p>
          <ol className="mt-2 grid gap-1 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-zinc-600 hover:text-zinc-900 hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={`mt-10 space-y-10 ${PROSE}`}>
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--fnb-ink)" }}>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
