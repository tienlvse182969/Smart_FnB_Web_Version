import { useCallback, useEffect, useRef, useState } from "react";
import { App, Card, InputNumber, Switch, Tag, Typography } from "antd";
import { ArrowDown, ArrowUp, ImagePlus, Images, Trash2 } from "lucide-react";
import type { Poster } from "../../types";
import { postersApi, showApiError } from "../../api";
import {
  ACCEPTED_POSTER_TYPES,
  MAX_POSTERS,
  MAX_POSTER_DURATION,
  MAX_POSTER_MB,
  MAX_POSTER_TITLE_LENGTH,
  MIN_POSTER_DURATION,
  validatePosterFile,
} from "../../api/modules/posters/validate";
import { SectionTitle } from "../../components/bits";
import ActionButton from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import { DEFAULT_POSTER_IMAGE } from "../../theme/posterAssets";

/**
 * Poster màn hình sau (OW-11): Owner thêm, bật/tắt, đặt tên, chỉnh thời lượng, đổi thứ tự và xoá poster hiện trên màn hình phụ của thu ngân.
 * Poster thuộc CHUỖI nên mọi chi nhánh đổi theo (màn hình sau tự làm mới trong vòng khoảng 1 phút; BE chưa đẩy realtime).
 * BE không có đổi ảnh tại chỗ: muốn đổi ảnh thì thêm poster mới rồi xoá poster cũ. Chọn ảnh là tải lên ngay, không có bước Lưu.
 */
export default function Posters() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const writeGuard = useWriteGuard();
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(false);
  /** "new" khi đang thêm; id khi đang thao tác trên một poster. */
  const [busy, setBusy] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    try {
      setPosters(await postersApi.listPosters(chainId));
    } catch (err) {
      showApiError(message.error, err, "Không tải được poster");
    } finally {
      setLoading(false);
    }
  }, [chainId, message]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Chạy một thao tác ghi: đánh dấu bận, báo lỗi, rồi nạp lại để màn hình khớp với bản đã lưu. */
  const run = async (key: string, action: () => Promise<unknown>, success: string, failure: string) => {
    setBusy(key);
    try {
      await action();
      message.success(success);
    } catch (err) {
      showApiError(message.error, err, failure);
    } finally {
      await load();
      setBusy(null);
    }
  };

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || !chainId) return;
    const problem = validatePosterFile(file);
    if (problem) {
      message.error(`${problem} — chưa thêm poster`);
      return;
    }
    void run("new", () => postersApi.addPoster(chainId, { file }), "Đã thêm poster — màn hình sau của mọi chi nhánh sẽ cập nhật trong khoảng 1 phút", "Không thêm được poster");
  };

  const toggle = (p: Poster, enabled: boolean) =>
    chainId && run(p.id, () => postersApi.updatePoster(chainId, p.id, { enabled }), enabled ? "Đã bật poster" : "Đã tắt poster", "Không cập nhật được poster");

  const rename = (p: Poster, title: string) => {
    const next = title.trim();
    if (!chainId || next === p.title) return;
    if (!next) {
      message.warning("Tên poster không được để trống — giữ nguyên tên cũ");
      return;
    }
    void run(p.id, () => postersApi.updatePoster(chainId, p.id, { title: next }), "Đã đổi tên poster", "Không đổi được tên poster");
  };

  const setDuration = (p: Poster, durationSeconds: number) =>
    chainId && run(p.id, () => postersApi.updatePoster(chainId, p.id, { durationSeconds }), "Đã đổi thời lượng", "Không đổi được thời lượng");

  /**
   * BE chỉ có PATCH `sortOrder` từng poster (không tự dịch dòng khác, và `sortOrder` có thể trùng nhau sau khi xoá). Nên sau khi đổi chỗ hai poster kề nhau,
   * đặt `sortOrder` = vị trí mới cho MỌI poster còn lệch, tuần tự; lỗi giữa chừng thì `run` nạp lại bản thật.
   */
  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (!chainId || target < 0 || target >= posters.length) return;
    const next = [...posters];
    [next[index], next[target]] = [next[target], next[index]];
    void run(
      posters[index].id,
      async () => {
        for (const [position, p] of next.entries()) {
          if (p.sortOrder !== position) await postersApi.updatePoster(chainId, p.id, { sortOrder: position });
        }
      },
      "Đã đổi thứ tự",
      "Không đổi được thứ tự",
    );
  };

  const confirmDelete = (p: Poster, position: number) => {
    modal.confirm({
      title: `Xoá poster "${p.title}" (số ${position + 1})?`,
      content: "Poster biến mất khỏi màn hình sau của mọi chi nhánh. Không khôi phục được.",
      okText: "Xoá poster",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (chainId) await run(p.id, () => postersApi.deletePoster(chainId, p.id), "Đã xoá poster", "Không xoá được poster");
      },
    });
  };

  const full = posters.length >= MAX_POSTERS;

  return (
    <div data-testid="posters-page">
      <SectionTitle
        title="Poster màn hình sau"
        sub="Ảnh giới thiệu món mới, khuyến mãi… hiện trên màn hình phụ của thu ngân. Đổi ở đây thì mọi chi nhánh trong chuỗi đổi theo."
        extra={
          <ActionButton
            type="primary"
            icon={<ImagePlus size={15} />}
            loading={busy === "new"}
            disabled={full || busy !== null}
            data-testid="poster-add"
            onClick={() => addInputRef.current?.click()}
          >
            Thêm poster ({posters.length}/{MAX_POSTERS})
          </ActionButton>
        }
      />
      <input ref={addInputRef} type="file" accept={ACCEPTED_POSTER_TYPES.join(",")} style={{ display: "none" }} onChange={handleAdd} data-testid="poster-add-input" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, alignItems: "start" }}>
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 18 } }} loading={loading && posters.length === 0}>
          {posters.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 12px", color: palette.textSubtle }} data-testid="posters-empty">
              <Images size={36} />
              <div style={{ fontWeight: 600, color: palette.textMuted, marginTop: 10 }}>Chưa có poster nào</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>Màn hình sau đang dùng ảnh mặc định. Thêm poster để thay thế.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {posters.map((p, i) => (
                <div
                  key={p.id}
                  data-testid={`poster-row-${p.id}`}
                  style={{ display: "flex", gap: 14, padding: 12, border: `1px solid ${palette.line}`, borderRadius: 12, flexWrap: "wrap", opacity: busy === p.id ? 0.6 : 1 }}
                >
                  <div style={{ width: 168, aspectRatio: "16 / 9", borderRadius: 8, overflow: "hidden", background: palette.paperSubtle, flexShrink: 0, opacity: p.enabled ? 1 : 0.45 }}>
                    <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Tag style={{ margin: 0 }}>#{i + 1}</Tag>
                      <Typography.Text
                        strong
                        style={{ minWidth: 0, flex: 1 }}
                        ellipsis
                        editable={writeGuard.disabled ? false : { maxLength: MAX_POSTER_TITLE_LENGTH, onChange: (v) => rename(p, v), tooltip: "Đặt tên" }}
                      >
                        {p.title}
                      </Typography.Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: palette.textMuted }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Switch size="small" checked={p.enabled} disabled={writeGuard.disabled || busy !== null} onChange={(c) => toggle(p, c)} aria-label="Hiển thị poster" />
                        {p.enabled ? "Đang hiển thị" : "Đang tắt"}
                      </span>
                      <DurationInput poster={p} disabled={writeGuard.disabled || busy !== null} onCommit={(s) => setDuration(p, s)} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                      <ActionButton size="small" aria-label="Lên" icon={<ArrowUp size={14} />} disabled={i === 0 || busy !== null} onClick={() => move(i, -1)} />
                      <ActionButton size="small" aria-label="Xuống" icon={<ArrowDown size={14} />} disabled={i === posters.length - 1 || busy !== null} onClick={() => move(i, 1)} />
                      <ActionButton size="small" danger icon={<Trash2 size={14} />} disabled={busy !== null} onClick={() => confirmDelete(p, i)}>
                        Xoá
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 14 }}>
            PNG, JPG hoặc WebP, tối đa {MAX_POSTER_MB} MB mỗi ảnh, tối đa {MAX_POSTERS} poster. Nên dùng ảnh ngang tỉ lệ 16:9 để lấp đầy màn hình. Muốn đổi ảnh: thêm poster mới rồi xoá poster cũ.
          </div>
        </Card>

        <Card style={{ borderRadius: 14, position: "sticky", top: 16 }} styles={{ body: { padding: 18 } }}>
          <Preview posters={posters} />
        </Card>
      </div>
    </div>
  );
}

/** Ô thời lượng (giây): giữ giá trị đang gõ ở local, chỉ lưu khi rời ô hoặc nhấn Enter và giá trị hợp lệ, khác bản đã lưu. */
function DurationInput({ poster, disabled, onCommit }: { poster: Poster; disabled: boolean; onCommit: (seconds: number) => unknown }) {
  const [value, setValueState] = useState<number | null>(poster.durationSeconds);
  // Giá trị mới nhất, đọc được ngay cả khi blur/Enter đến trước lần render kế (không đọc `value` cũ của closure).
  const latest = useRef<number | null>(poster.durationSeconds);
  /** Giá trị đã gửi mà bản lưu chưa nạp lại — Enter rồi blur liền nhau không gửi hai lần. */
  const sent = useRef<number | null>(null);
  const setValue = (next: number | null) => {
    latest.current = next;
    setValueState(next);
  };

  // Bản đã lưu đổi (nạp lại sau khi lưu) thì ô theo bản mới.
  useEffect(() => {
    latest.current = poster.durationSeconds;
    sent.current = null;
    setValueState(poster.durationSeconds);
  }, [poster.durationSeconds]);

  const commit = () => {
    const next = latest.current;
    if (next === null || !Number.isInteger(next) || next < MIN_POSTER_DURATION || next > MAX_POSTER_DURATION) {
      setValue(poster.durationSeconds);
      return;
    }
    if (next === poster.durationSeconds || next === sent.current) return;
    sent.current = next;
    // Xong (kể cả lỗi) thì cho phép gửi lại cùng giá trị; trong lúc chờ, blur sau Enter bị chặn ở trên.
    void Promise.resolve(onCommit(next)).finally(() => {
      sent.current = null;
    });
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      Hiện
      <InputNumber
        size="small"
        min={MIN_POSTER_DURATION}
        max={MAX_POSTER_DURATION}
        precision={0}
        value={value}
        disabled={disabled}
        style={{ width: 62 }}
        aria-label="Thời lượng hiển thị (giây)"
        onChange={setValue}
        onBlur={commit}
        onPressEnter={commit}
      />
      giây
    </span>
  );
}

/** Xem trước màn hình sau: nền là ảnh mờ, ảnh rõ ở giữa (`contain`), xoay các poster đang bật theo thứ tự, mỗi poster đúng thời lượng của nó. */
function Preview({ posters }: { posters: Poster[] }) {
  const active = posters.filter((p) => p.enabled);
  const [index, setIndex] = useState(0);
  const slot = active.length ? index % active.length : 0;
  const current = active[slot];
  // Khoá thay đổi khi danh sách đang bật, thứ tự hoặc thời lượng đổi, để hẹn giờ dựng lại đúng.
  const signature = active.map((p) => `${p.id}:${p.durationSeconds}`).join("|");

  useEffect(() => {
    if (active.length < 2 || !current) return;
    const timer = setTimeout(() => setIndex((slot + 1) % active.length), current.durationSeconds * 1000);
    return () => clearTimeout(timer);
    // `signature` đại diện cho `active` và `current` (danh sách đang bật, thứ tự, thời lượng).
  }, [signature, slot]);

  return (
    <div data-testid="poster-preview">
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Xem trước trên màn hình sau</div>
      <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: palette.ink }}>
        {current ? (
          <>
            <img src={current.imageUrl} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(18px)", transform: "scale(1.15)" }} />
            <img src={current.imageUrl} alt={current.title} style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          </>
        ) : (
          <>
            <img src={DEFAULT_POSTER_IMAGE} alt="Ảnh mặc định của nền tảng" data-testid="poster-preview-default" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "6px 10px", background: palette.ink, color: palette.surface, fontSize: 12, textAlign: "center", opacity: 0.85 }}>
              {posters.length === 0 ? "Chưa có poster — màn hình sau dùng ảnh mặc định" : "Mọi poster đang tắt — màn hình sau dùng ảnh mặc định"}
            </div>
          </>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10, minHeight: 8 }}>
        {active.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={`Xem poster ${p.title}`}
            onClick={() => setIndex(i)}
            style={{ width: 8, height: 8, padding: 0, border: 0, borderRadius: 8, cursor: "pointer", background: i === slot ? palette.brandPrimary : palette.line }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: palette.textSubtle, marginTop: 10, textAlign: "center" }}>
        {active.length > 1 ? `Xoay vòng ${active.length} poster · "${current.title}" hiện ${current.durationSeconds} giây` : active.length === 1 ? "Chỉ 1 poster đang bật — hiện cố định" : ""}
      </div>
    </div>
  );
}
