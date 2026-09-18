import SectionHeading from "./SectionHeading";

const branches = [
  { name: "CN Quận 1", current: 88, previous: 70 },
  { name: "CN Quận 7", current: 64, previous: 74 },
  { name: "CN Thủ Đức", current: 96, previous: 60 },
  { name: "CN Bình Thạnh", current: 52, previous: 48 },
];

function BranchChartMock() {
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
      <span className="text-xs font-medium text-zinc-500">Doanh thu theo chi nhánh · Tuần này so với tuần trước</span>
      <div className="mt-6 flex items-end justify-between gap-4" style={{ height: 160 }}>
        {branches.map((branch) => (
          <div key={branch.name} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-[140px] w-full items-end justify-center gap-1.5">
              <div
                className="w-4 rounded-t-[4px] bg-zinc-200"
                style={{ height: `${branch.previous}%` }}
                title="Tuần trước"
              />
              <div
                className="w-4 rounded-t-[4px]"
                style={{ height: `${branch.current}%`, backgroundColor: "var(--brand-primary)" }}
                title="Tuần này"
              />
            </div>
            <span className="text-xs text-zinc-500">{branch.name}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-5 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--brand-primary)" }} />
          Tuần này
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-200" />
          Tuần trước
        </span>
      </div>
    </div>
  );
}

export default function MultiBranchDashboard() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Đa chi nhánh" title="Quản lý đa chi nhánh" />
            <p className="mt-4 text-sm text-zinc-600 md:text-base">
              Chủ chuỗi xem dashboard so sánh doanh thu giữa các chi nhánh trên cùng một biểu đồ,
              theo ngày, tuần, tháng — thay vì mở từng chi nhánh riêng lẻ rồi tự cộng trừ so sánh.
            </p>
          </div>
          <BranchChartMock />
        </div>
      </div>
    </section>
  );
}
