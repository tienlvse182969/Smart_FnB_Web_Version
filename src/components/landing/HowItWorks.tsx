import SectionHeading from "./SectionHeading";

const steps = [
  {
    title: "Khách gọi món tại quầy, thu ngân chọn món và tuỳ chọn",
    description: "Thu ngân chọn món, size, đường, đá, topping trên POS; màn hình phía khách hiện món và tổng tiền theo thời gian thực.",
  },
  {
    title: "Khách trả tiền mặt hoặc quét QR",
    description: "QR do PayOS tạo từ kênh của chính chủ quán, tiền về thẳng tài khoản ngân hàng của chủ chuỗi; chưa trả tiền thì chưa pha.",
  },
  {
    title: "Đơn xuống quầy pha chế, ly giống nhau được gom thành mẻ",
    description: "Pha chế cập nhật từng ly; xong ly nào báo ly đó, không chờ các đơn khác trong cùng mẻ.",
  },
  {
    title: "Gọi số, khách nhận ly, in bill và phiếu số",
    description: "Đủ ly thì màn hình gọi số mời khách nhận; mọi đơn đã thanh toán đều có bill và phiếu số.",
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
                  <h3 className="text-base font-semibold" style={{ color: "var(--fnb-ink)" }}>
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
