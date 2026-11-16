import SectionHeading from "./SectionHeading";
import { BrowserFrame } from "./DeviceFrame";
import { SCREENSHOTS } from "./screenshots";

export default function MultiBranchDashboard() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-5">
          <div className="md:col-span-2">
            <SectionHeading eyebrow="Đa chi nhánh" title="Quản lý đa chi nhánh" />
            <p className="mt-4 text-sm text-zinc-600 md:text-base">
              Chủ chuỗi xem dashboard so sánh doanh thu giữa các chi nhánh trên cùng một biểu đồ,
              theo ngày, tuần, tháng — thay vì mở từng chi nhánh riêng lẻ rồi tự cộng trừ so sánh. Có từ gói Tiêu chuẩn.
            </p>
          </div>
          <div className="md:col-span-3">
            <BrowserFrame shot={SCREENSHOTS.reports} />
          </div>
        </div>
      </div>
    </section>
  );
}
