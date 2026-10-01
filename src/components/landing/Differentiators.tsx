import { Pencil, Flame, Clock, CircleDashed, CheckCircle2 } from "lucide-react";
import SectionHeading from "./SectionHeading";
import { palette } from "../../theme";

const cups = [
  { id: "038", note: "Size M", state: "busy" as const },
  { id: "040", note: "Size L", state: "free" as const },
  { id: "041", note: "Size L", state: "suggested" as const },
  { id: "043", note: "Size L", state: "suggested" as const },
  { id: "044", note: "Size L", state: "suggested" as const },
  { id: "045", note: "Size M", state: "free" as const },
];

function BatchQueueMock() {
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Quầy pha chế · Trà sữa trân châu</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
          Mẻ 1 / 2
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {cups.map((t) => {
          const suggested = t.state === "suggested";
          const busy = t.state === "busy";
          return (
            <div
              key={t.id}
              className="rounded-[10px] border p-3 text-center"
              style={{
                borderColor: suggested ? "var(--brand-primary)" : palette.line,
                borderWidth: suggested ? 2 : 1,
                backgroundColor: busy ? palette.paper : palette.surface,
              }}
            >
              <div className="text-sm font-semibold" style={{ color: "var(--fnb-ink)" }}>
                Số {t.id}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-400">{t.note}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        Gom ly số 041 + 043 + 044 (cùng món, cùng size) thành một mẻ — mẻ đầu hàng đợi luôn có ly chờ lâu nhất
      </div>
    </div>
  );
}

function OptionTableMock() {
  const rows = [
    { name: "Size L", price: "+6.000 ₫", category: "Size" },
    { name: "Trân châu đen", price: "+5.000 ₫", category: "Topping" },
    { name: "Pudding", price: "+7.000 ₫", category: "Topping" },
  ];
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Nhóm tuỳ chọn · Size, Topping</span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
          Giá lưu lúc bán
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-zinc-100">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 bg-zinc-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          <span>Tuỳ chọn</span>
          <span>Giá cộng thêm</span>
          <span>Nhóm</span>
          <span />
        </div>
        {rows.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-t border-zinc-100 px-3 py-2.5 text-sm"
          >
            <span style={{ color: "var(--fnb-ink)" }}>{row.name}</span>
            <span className="text-zinc-500">{row.price}</span>
            <span className="text-zinc-500">{row.category}</span>
            <Pencil className="h-3.5 w-3.5 text-zinc-300" strokeWidth={1.75} aria-hidden="true" />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
        Giá món và giá cộng thêm được chụp vào đơn lúc bán — đổi giá không làm sai bill cũ
      </div>
    </div>
  );
}

const ticketLines = [
  { name: "2x Trà sữa trân châu", note: "50% đường, thêm pudding", status: "done" as const },
  { name: "1x Cà phê muối", note: null, status: "cooking" as const },
  { name: "3x Trà đào", note: null, status: "queued" as const },
];

const ticketStatusMeta = {
  done: { label: "Xong", icon: CheckCircle2, tone: "text-zinc-400" },
  cooking: { label: "Đang pha", icon: Flame, tone: "" },
  queued: { label: "Chờ pha", icon: CircleDashed, tone: "text-zinc-300" },
};

function BarTicketMock() {
  return (
    <div className="rounded-[14px] border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Hàng đợi pha chế · Số 42</span>
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
                borderColor: cooking ? "var(--brand-primary)" : palette.paper,
                backgroundColor: cooking ? palette.paperSubtle : palette.surface,
              }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--fnb-ink)" }}>
                  {line.name}
                </div>
                {line.note && <div className="mt-0.5 text-xs text-zinc-500">Tuỳ chọn: {line.note}</div>}
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
    title: "Thuật toán gom món theo mẻ",
    description:
      "Ly cùng món và cùng size, thanh toán gần nhau trong cửa sổ gom, được gom thành một mẻ để pha nền một lần; đường, đá, topping thêm ở bước cuối cho từng ly. Mẻ đầu hàng đợi luôn chứa ly chờ lâu nhất — gom không làm ly nào phải chờ thêm.",
    Mock: BatchQueueMock,
  },
  {
    title: "Tuỳ chọn món có giá cộng thêm",
    description:
      "Owner tạo nhóm tuỳ chọn như size, đường, đá, topping, đặt quy tắc chọn bắt buộc hoặc tối đa bao nhiêu, rồi gắn một nhóm cho nhiều món. Giá tính ở backend và được lưu vào đơn lúc bán.",
    Mock: OptionTableMock,
  },
  {
    title: "Màn hình pha chế xử lý theo từng ly",
    description:
      "Pha chế cập nhật từng ly: xong ly nào báo ly đó. Đơn đủ ly thì màn hình gọi số mời khách nhận — không chờ các đơn khác trong cùng mẻ.",
    Mock: BarTicketMock,
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
                  <h3 className="mt-2 text-xl font-semibold" style={{ color: "var(--fnb-ink)" }}>
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
