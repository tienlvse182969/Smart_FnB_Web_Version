import SectionHeading from "./SectionHeading";
import { BrowserFrame, TabletFrame } from "./DeviceFrame";
import { SCREENSHOTS } from "./screenshots";

const items = [
  {
    title: "Thuật toán gom món theo mẻ",
    description:
      "Ly cùng món và cùng size, thanh toán gần nhau trong cửa sổ gom, được gom thành một mẻ để pha nền một lần; đường, đá, topping thêm ở bước cuối cho từng ly. Mẻ đầu hàng đợi luôn chứa ly chờ lâu nhất, và thẻ chờ lâu tự viền vàng để không bị bỏ quên.",
    frame: <TabletFrame shot={SCREENSHOTS.baristaQueue} />,
  },
  {
    title: "Tuỳ chọn món có giá cộng thêm",
    description:
      "Brand Manager tạo nhóm tuỳ chọn như size, đường, đá, topping, đặt quy tắc chọn bắt buộc hoặc tối đa bao nhiêu, rồi gắn một nhóm cho nhiều món. Giá tính ở backend và được lưu vào đơn lúc bán.",
    frame: <BrowserFrame shot={SCREENSHOTS.options} />,
  },
  {
    title: "Màn hình pha chế xử lý theo từng ly",
    description:
      "Pha chế bấm Bắt đầu làm rồi Xong cho từng ly. Đơn đủ ly chuyển sang cột Sẵn sàng nhận; quán dùng máy báo rung thì pha chế gọi máy, khách nhận ly xong bấm Đã giao.",
    frame: <TabletFrame shot={SCREENSHOTS.baristaStarted} />,
  },
];

export default function Differentiators() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Khác biệt" title="Ba điểm khác biệt" />
        <div className="mt-14 space-y-20">
          {items.map((item, index) => {
            const imageFirst = index % 2 === 1;
            return (
              <div key={item.title} className="grid grid-cols-1 items-center gap-10 md:grid-cols-5">
                <div className={`md:col-span-2 ${imageFirst ? "md:order-2" : ""}`}>
                  <span className="text-xs font-semibold text-zinc-400">0{index + 1}</span>
                  <h3 className="mt-2 text-xl font-semibold" style={{ color: "var(--fnb-ink)" }}>
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-zinc-600 md:text-base">{item.description}</p>
                </div>
                <div className={`md:col-span-3 ${imageFirst ? "md:order-1" : ""}`}>{item.frame}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
