import SectionHeading from "./SectionHeading";

const steps = [
  {
    title: "Nhập số khách, hệ thống gợi ý phương án xếp bàn",
    description: "Nhân viên nhập số khách trên tablet, hệ thống đề xuất phương án xếp hoặc ghép bàn liền kề.",
  },
  {
    title: "Mang tablet ra bàn, khách chọn món, bấm gửi là xuống bếp",
    description: "Khách chọn món ngay trên tablet, nhân viên bấm gửi, order chạy thẳng xuống màn hình bếp.",
  },
  {
    title: "Bếp xử lý theo từng món, xong món nào báo món đó",
    description: "Không chờ cả bàn xong mới ra — món nào xong, bếp báo ngay để nhân viên bưng lên.",
  },
  {
    title: "Thu tiền qua QR hoặc tiền mặt tại quầy, in hoá đơn",
    description: "Quản lý chi nhánh xác nhận thanh toán tại quầy và in hoá đơn cho mọi giao dịch.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Quy trình" title="Cách hoạt động" />

        <div className="mt-16">
          <div className="hidden items-center md:flex">
            {steps.map((step, index) => (
              <div key={step.title} className="flex flex-1 items-center last:flex-none">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  {index + 1}
                </span>
                {index < steps.length - 1 && <span className="mx-3 h-px flex-1 bg-zinc-200" />}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-6">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-4 md:block">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:hidden"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--brand-ink)" }}>
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-zinc-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
