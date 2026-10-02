import { LayoutGrid, Store, ReceiptText, Coffee } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { palette } from "../../theme";

const roles = [
  {
    title: "Chủ chuỗi",
    icon: LayoutGrid,
    bullets: [
      "Tạo chi nhánh, quản lý menu, tuỳ chọn món và giá cho toàn chuỗi",
      "Liên kết PayOS để tiền QR về thẳng tài khoản của chủ chuỗi",
      "So sánh doanh thu giữa các chi nhánh trên cùng biểu đồ",
    ],
  },
  {
    title: "Quản lý chi nhánh",
    icon: Store,
    bullets: [
      "Tạo quầy, máy in và ghép màn hình phía khách, màn hình gọi số",
      "Tra cứu đơn, xác nhận chuyển khoản lệch số tiền, huỷ đơn đã thanh toán kèm lý do",
      "Tạo tài khoản thu ngân và pha chế, bật tắt món theo chi nhánh",
    ],
  },
  {
    title: "Thu ngân (app Android)",
    icon: ReceiptText,
    bullets: [
      "Chọn món, size, đường, đá, topping ngay trên POS",
      "Thu tiền mặt hoặc QR; màn hình phía khách hiện món và mã QR",
      "In bill và phiếu số cho mọi đơn đã thanh toán",
    ],
  },
  {
    title: "Pha chế (app Android)",
    icon: Coffee,
    bullets: [
      "Xem hàng đợi ly cần pha, ly giống nhau được gom thành mẻ",
      "Cập nhật từng ly: đang pha, xong; báo hết món hoặc hết tuỳ chọn",
      "Tuỳ chọn khác mặc định được in đậm để không bị ngợp",
    ],
  },
];

export default function RoleCards() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: palette.paperSubtle }}>
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Không gian làm việc" title="Theo vai trò" />
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <div
              key={role.title}
              className="rounded-[14px] border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[11px]"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <role.icon className="h-5 w-5 text-white" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-base font-semibold" style={{ color: "var(--fnb-ink)" }}>
                {role.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {role.bullets.map((bullet) => (
                  <li key={bullet} className="text-sm text-zinc-600">
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
