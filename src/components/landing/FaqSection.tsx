import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionHeading from "./SectionHeading";

const faqs = [
  {
    question: "Phần mềm có xuất hoá đơn điện tử theo quy định thuế không?",
    answer:
      "Chưa. Phần mềm hiện in hoá đơn nội bộ cho từng giao dịch, chưa xuất hoá đơn điện tử theo quy định thuế.",
  },
  {
    question: "Phần mềm có quản lý kho nguyên liệu không?",
    answer: "Không. Hệ thống không quản lý kho nguyên liệu, không theo dõi tồn kho hay nhập xuất hàng.",
  },
  {
    question: "Có cần kết nối internet để hoạt động không?",
    answer: "Có. Phần mềm cần kết nối internet để hoạt động, từ ghi order tới thanh toán và báo cáo.",
  },
  {
    question: "Ai được xác nhận thu tiền?",
    answer:
      "Chỉ quản lý chi nhánh mới xác nhận được thanh toán. Nhân viên phục vụ chỉ thu tiền hộ, không tự xác nhận, và hệ thống ghi lại tên người thu để truy vết.",
  },
  {
    question: "Phần mềm có tính lương hoặc chấm công không?",
    answer: "Không. Phần mềm không có chức năng chấm công hay tính lương cho nhân viên.",
  },
  {
    question: "Khách có thể tự đặt món qua điện thoại của khách không?",
    answer:
      "Không. Khách không cài đặt gì và không thao tác trên thiết bị nào cả — nhân viên phục vụ là người thao tác trên tablet tại bàn.",
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
                  <span className="text-sm font-medium md:text-base" style={{ color: "var(--brand-ink)" }}>
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
