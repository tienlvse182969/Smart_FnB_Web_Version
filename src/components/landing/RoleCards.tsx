import { LayoutGrid, Store, ConciergeBell, ChefHat } from "lucide-react";
import SectionHeading from "./SectionHeading";

const roles = [
  {
    title: "Chủ chuỗi",
    icon: LayoutGrid,
    bullets: [
      "Tạo chi nhánh, quản lý menu và giá cho toàn chuỗi",
      "Nhập menu hàng loạt bằng ảnh thay vì gõ tay từng món",
      "So sánh doanh thu giữa các chi nhánh trên cùng biểu đồ",
    ],
  },
  {
    title: "Quản lý chi nhánh",
    icon: Store,
    bullets: [
      "Thiết kế sơ đồ bàn, khai báo bàn liền kề",
      "Xác nhận thanh toán qua QR hoặc tiền mặt, in hoá đơn",
      "Quản lý tài khoản nhân viên phục vụ và bếp",
    ],
  },
  {
    title: "Nhân viên phục vụ",
    icon: ConciergeBell,
    bullets: [
      "Xem gợi ý xếp bàn, mở phiên bàn ngay tại chỗ",
      "Ghi món trên tablet, gửi thẳng xuống bếp",
      "Nhận thông báo món xong để bưng ra bàn",
    ],
  },
  {
    title: "Nhân viên bếp",
    icon: ChefHat,
    bullets: [
      "Xem hàng đợi món cần làm theo thứ tự nhận order",
      "Cập nhật trạng thái từng món: đang làm, xong, hết món",
      "Ghi chú của khách hiển thị nổi bật trên mỗi thẻ món",
    ],
  },
];

export default function RoleCards() {
  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: "#fafafa" }}>
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
              <h3 className="mt-4 text-base font-semibold" style={{ color: "var(--brand-ink)" }}>
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
