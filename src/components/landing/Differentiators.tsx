import { Pencil, Flame, Clock, CircleDashed, CheckCircle2 } from "lucide-react";
import SectionHeading from "./SectionHeading";

const tables = [
  { id: "3", seats: 4, state: "busy" as const },
  { id: "4", seats: 4, state: "free" as const },
  { id: "5", seats: 4, state: "suggested" as const },
  { id: "6", seats: 4, state: "suggested" as const },
  { id: "7", seats: 6, state: "free" as const },
  { id: "8", seats: 2, state: "busy" as const },
];

function TableSuggestionMock() {
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Khu vực trong nhà · 9 khách</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
          Phương án 1 / 3
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {tables.map((t) => {
          const suggested = t.state === "suggested";
          const busy = t.state === "busy";
          return (
            <div
              key={t.id}
              className="rounded-[10px] border p-3 text-center"
              style={{
                borderColor: suggested ? "var(--brand-primary)" : "#e4e4e7",
                borderWidth: suggested ? 2 : 1,
                backgroundColor: busy ? "#f4f4f5" : "#ffffff",
              }}
            >
              <div className="text-sm font-semibold" style={{ color: "var(--brand-ink)" }}>
                Bàn {t.id}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-400">{t.seats} ghế</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        Gợi ý ghép Bàn 5 + Bàn 6 liền kề — nhân viên chọn hoặc xem phương án khác
      </div>
    </div>
  );
}

function MenuDraftMock() {
  const rows = [
    { name: "Cơm sườn bì chả", price: "45.000 ₫", category: "Cơm" },
    { name: "Bún bò Huế", price: "50.000 ₫", category: "Bún" },
    { name: "Trà đá", price: "5.000 ₫", category: "Đồ uống" },
  ];
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Bảng nháp từ ảnh menu</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
          62 món nhận được
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-zinc-100">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          <span>Tên món</span>
          <span>Giá</span>
          <span>Danh mục</span>
          <span />
        </div>
        {rows.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-t border-zinc-100 px-3 py-2.5 text-sm"
          >
            <span style={{ color: "var(--brand-ink)" }}>{row.name}</span>
            <span className="text-zinc-500">{row.price}</span>
            <span className="text-zinc-500">{row.category}</span>
            <Pencil className="h-3.5 w-3.5 text-zinc-300" strokeWidth={1.75} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        Owner xem lại, sửa chỗ sai rồi nhập hàng loạt vào menu chuỗi
      </div>
    </div>
  );
}

const ticketLines = [
  { name: "2x Cơm sườn", note: "Ít cay", status: "done" as const },
  { name: "1x Canh chua cá", note: null, status: "cooking" as const },
  { name: "3x Trà đá", note: null, status: "queued" as const },
];

const ticketStatusMeta = {
  done: { label: "Xong", icon: CheckCircle2, tone: "text-zinc-400" },
  cooking: { label: "Đang làm", icon: Flame, tone: "" },
  queued: { label: "Chờ", icon: CircleDashed, tone: "text-zinc-300" },
};

function KitchenTicketMock() {
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Hàng đợi bếp · Bàn 12</span>
        <Clock className="h-4 w-4 text-zinc-300" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="mt-4 space-y-2.5">
        {ticketLines.map((line) => {
          const meta = ticketStatusMeta[line.status];
          const Icon = meta.icon;
          const cooking = line.status === "cooking";
          return (
            <div
              key={line.name}
              className="flex items-center justify-between rounded-[10px] border p-3"
              style={{
                borderColor: cooking ? "var(--brand-primary)" : "#f4f4f5",
                backgroundColor: cooking ? "#fafafa" : "#ffffff",
              }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--brand-ink)" }}>
                  {line.name}
                </div>
                {line.note && <div className="mt-0.5 text-xs text-zinc-500">Ghi chú: {line.note}</div>}
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${meta.tone}`} style={cooking ? { color: "var(--brand-primary)" } : undefined}>
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const items = [
  {
    title: "Thuật toán gợi ý xếp và ghép bàn",
    description:
      "Nhập số khách, hệ thống đề xuất tối đa 3 phương án xếp hoặc ghép bàn liền kề theo sơ đồ thực tế của chi nhánh. Nhân viên luôn là người quyết định cuối cùng — hệ thống chỉ gợi ý, không tự xếp.",
    Mock: TableSuggestionMock,
  },
  {
    title: "AI bóc tách ảnh menu giấy",
    description:
      "Chụp ảnh menu giấy, AI bóc tách thành bảng món gồm tên, giá, danh mục. Chủ quán xem lại, sửa những chỗ sai rồi nhập hàng loạt vào hệ thống thay vì gõ tay từng món.",
    Mock: MenuDraftMock,
  },
  {
    title: "Màn hình bếp xử lý theo từng món",
    description:
      "Bếp làm xong món nào báo món đó, nhân viên bưng ngay món đó ra bàn — không phải chờ cả bàn nấu xong mới bắt đầu phục vụ.",
    Mock: KitchenTicketMock,
  },
];

export default function Differentiators() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Khác biệt" title="Ba điểm khác biệt" />
        <div className="mt-14 space-y-16">
          {items.map((item, index) => {
            const imageFirst = index % 2 === 1;
            return (
              <div key={item.title} className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
                <div className={imageFirst ? "md:order-2" : ""}>
                  <span className="text-xs font-semibold text-zinc-400">0{index + 1}</span>
                  <h3 className="mt-2 text-xl font-semibold" style={{ color: "var(--brand-ink)" }}>
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-zinc-600 md:text-base">{item.description}</p>
                </div>
                <div className={imageFirst ? "md:order-1" : ""}>
                  <item.Mock />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
