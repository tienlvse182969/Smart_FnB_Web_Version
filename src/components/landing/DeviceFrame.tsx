import { palette } from "../../theme";

export type Screenshot = {
  src: string;
  alt: string;
  /** Kích thước thật của ảnh — giữ chỗ trước khi ảnh tải xong, tránh nhảy bố cục. */
  width: number;
  height: number;
};

type FrameProps = {
  shot: Screenshot;
  /** Ảnh ở màn đầu (hero) tải ngay; còn lại tải khi cuộn tới. */
  priority?: boolean;
  className?: string;
};

function Shot({ shot, priority }: { shot: Screenshot; priority?: boolean }) {
  return (
    <img
      src={shot.src}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className="block h-auto w-full"
    />
  );
}

/** Khung máy tính bảng cho ảnh chụp app Thu ngân / Pha chế (Android). */
export function TabletFrame({ shot, priority, className = "" }: FrameProps) {
  return (
    <div
      className={`rounded-[22px] p-2.5 shadow-2xl ring-1 ring-black/5 sm:rounded-[28px] sm:p-3.5 ${className}`}
      style={{ backgroundColor: palette.ink }}
    >
      <div className="overflow-hidden rounded-[12px] sm:rounded-[16px]" style={{ backgroundColor: palette.surface }}>
        <Shot shot={shot} priority={priority} />
      </div>
    </div>
  );
}

/** Khung cửa sổ trình duyệt cho ảnh chụp web quản trị. */
export function BrowserFrame({ shot, priority, className = "" }: FrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-xl ${className}`}
      style={{ borderColor: palette.line, backgroundColor: palette.surface }}
    >
      <div
        className="flex items-center gap-1.5 border-b px-3.5 py-2.5"
        style={{ borderColor: palette.line, backgroundColor: palette.paper }}
        aria-hidden="true"
      >
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.textSubtle }} />
        ))}
      </div>
      <Shot shot={shot} priority={priority} />
    </div>
  );
}
