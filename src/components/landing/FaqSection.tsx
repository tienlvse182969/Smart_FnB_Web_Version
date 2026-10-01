import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionHeading from "./SectionHeading";

const faqs = [
  {
    question: "Phần mềm có xuất hoá đơn điện tử theo quy định thuế không?",
    answer:
      "Chưa. Phần mềm in bill và phiếu số cho mọi đơn đã thanh toán, nhưng chưa xuất hoá đơn điện tử theo quy định thuế.",
  },
  {
    question: "Phần mềm có quản lý kho nguyên liệu không?",
    answer: "Không. Hệ thống không quản lý kho nguyên liệu, không theo dõi tồn kho hay nhập xuất hàng; chỉ có báo hết món và hết tuỳ chọn.",
  },
  {
    question: "Có cần kết nối internet để hoạt động không?",
    answer: "Có. Phần mềm cần kết nối internet để hoạt động, từ gọi món tới thanh toán và báo cáo; chưa có chế độ hoạt động offline.",
  },
  {
    question: "Ai được xác nhận chuyển khoản thủ công?",
    answer:
      "Chỉ quản lý chi nhánh. Khi số tiền chuyển khoản không khớp, đơn chuyển sang Cần xử lý; thu ngân không tự xác nhận, và hệ thống ghi lại lý do cùng tên người xác nhận để truy vết.",
  },
  {
    question: "Phần mềm có tính lương hoặc chấm công không?",
    answer: "Không. Phần mềm không có chức năng chấm công hay tính lương cho nhân viên.",
  },
  {
    question: "Khách có tự gọi món qua điện thoại hoặc kiosk không?",
    answer:
      "Chưa. Khách gọi món tại quầy với thu ngân, nhìn món và tổng tiền trên màn hình phía khách rồi trả tiền mặt hoặc quét QR; khách không cài gì và không cần tài khoản.",
  },
  {
    question: "Tiền thanh toán QR đi đâu?",
    answer:
      "Về thẳng tài khoản ngân hàng của chủ chuỗi, qua kênh PayOS của chính chủ chuỗi. Nền tảng không giữ tiền và không thu phí giao dịch — chỉ thu phí thuê bao theo tháng.",
  },
  {
    question: "Đăng ký sử dụng như thế nào?",
    answer:
      "Chủ quán nộp hồ sơ đăng ký qua form trên trang này. Đội ngũ xem xét và liên hệ trong 1–2 ngày làm việc để xác nhận gói và kích hoạt tài khoản. Không có đăng ký tự động và không có dùng thử.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Hỏi đáp" title="Câu hỏi thường gặp" />
        <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-sm font-medium md:text-base" style={{ color: "var(--fnb-ink)" }}>
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && <p className="pb-5 text-sm text-zinc-600">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
