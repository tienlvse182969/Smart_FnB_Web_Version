import { useEffect, useMemo, useState } from "react";
import type { Poster } from "../../types";
import { enabledInOrder, nextSlideIndex, slideSeconds } from "../../api/modules/posters/rules";
import { palette } from "../../theme";
import { DEFAULT_POSTER_IMAGE, POSTER_STAGE_BG } from "../../theme/posterAssets";

export { DEFAULT_POSTER_IMAGE };

const FADE_MS = 800;

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Xem trước áp phích (OW-11, mục 20.2–20.3): khung 16:9, xoay đúng nhịp màn hình thật (mặc định 8 giây mỗi ảnh), chuyển mờ dần,
 * ảnh hiện NGUYÊN KHỔ (`contain`), phần trống lấp bằng chính ảnh đó làm mờ. Chỉ một ảnh thì phóng rất chậm để không đứng hình. Không có
 * ảnh nào đang bật thì dùng ảnh mặc định. `prefers-reduced-motion`: không chuyển mờ, không phóng (vẫn đổi ảnh theo nhịp).
 * Chỉ nhận danh sách đã đúng thứ tự xoay vòng; component tự lọc áp phích đang bật.
 */
export default function PosterPreview({ posters }: { posters: Poster[] }) {
  const active = useMemo(() => enabledInOrder(posters), [posters]);
  const reduced = useMemo(prefersReducedMotion, []);
  const [index, setIndex] = useState(0);
  const length = active.length;
  const safeIndex = length === 0 ? 0 : index % length;
  const current = active[safeIndex];
  const seconds = slideSeconds(current);

  // Đổi danh sách (bật/tắt, xoá) thì về ảnh đầu để không trỏ ra ngoài.
  const signature = active.map((p) => `${p.id}:${p.imageUrl}`).join("|");
  useEffect(() => setIndex(0), [signature]);

  useEffect(() => {
    if (length <= 1) return;
    const timer = window.setTimeout(() => setIndex((i) => nextSlideIndex(i % length, length)), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [safeIndex, length, seconds]);

  const slides = length === 0 ? [{ id: "default", imageUrl: DEFAULT_POSTER_IMAGE, title: "Ảnh mặc định" }] : active;
  const shown = length === 0 ? 0 : safeIndex;
  const single = slides.length === 1;

  return (
    <div data-testid="poster-preview" style={{ width: "100%" }}>
      <style>{`@keyframes poster-slow-zoom{from{transform:scale(1)}to{transform:scale(1.06)}}`}</style>
      <div
        style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: POSTER_STAGE_BG, borderRadius: 12, overflow: "hidden", border: `1px solid ${palette.line}` }}
      >
        {slides.map((slide, i) => {
          const visible = i === shown;
          return (
            <div
              key={slide.id}
              data-testid="poster-preview-slide"
              data-active={visible ? "true" : "false"}
              aria-hidden={!visible}
              style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0, transition: reduced ? "none" : `opacity ${FADE_MS}ms ease-in-out` }}
            >
              {/* Nền: chính ảnh đó làm mờ, phủ kín khung */}
              <img
                alt=""
                src={slide.imageUrl}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.7)", transform: "scale(1.15)" }}
              />
              {/* Ảnh thật: nguyên khổ, không cắt */}
              <img
                alt={slide.title}
                src={slide.imageUrl}
                data-testid="poster-preview-image"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  animation: single && !reduced ? "poster-slow-zoom 24s ease-in-out infinite alternate" : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: palette.textMuted, marginTop: 6 }}>
        <span data-testid="poster-preview-state">
          {length === 0 ? "Chưa có áp phích đang bật: màn hình khách dùng ảnh mặc định" : `Ảnh ${shown + 1}/${length} · ${seconds} giây mỗi ảnh`}
        </span>
        <span>Xoay đúng nhịp màn hình thật</span>
      </div>
    </div>
  );
}
