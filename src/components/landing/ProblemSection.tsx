import { FileWarning, HelpCircle, Coins, BarChart3 } from "lucide-react";
import SectionHeading from "./SectionHeading";

const problems = [
  {
    icon: FileWarning,
    title: "Bếp luận chữ viết tay, làm sai món",
    description: "Order ghi tay khó đọc, bếp đoán sai món, khách phải đổi lại từ đầu.",
  },
  {
    icon: HelpCircle,
    title: "Quên bàn nào gọi gì, món ra thiếu",
    description: "Nhiều bàn cùng lúc, nhân viên nhớ nhầm hoặc quên báo bếp món gọi thêm.",
  },
  {
    icon: Coins,
    title: "Tính tiền nhầm, thất thoát tiền mặt",
    description: "Cộng tay dễ sai, không có ghi nhận rõ ai thu tiền của bàn nào.",
  },
  {
    icon: BarChart3,
    title: "Chủ không so sánh được doanh thu giữa các chi nhánh",
    description: "Mỗi chi nhánh một sổ sách riêng, chủ quán ở nhà không biết chi nhánh nào đang lỗ.",
  },
];

export default function ProblemSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Vấn đề" title="Vấn đề thật ngoài quán" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((item) => (
            <div
              key={item.title}
              className="group rounded-[14px] border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-zinc-100 transition-colors group-hover:bg-zinc-200"
              >
                <item.icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold" style={{ color: "var(--brand-ink)" }}>
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
