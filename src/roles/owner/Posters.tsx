import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Card, Col, Empty, Input, Row, Spin, Tag } from "antd";
import { ArrowDown, ArrowUp, ImagePlus, Replace, Trash2 } from "lucide-react";
import { ApiError, describeApiError, postersApi, showApiError } from "../../api";
import {
  POSTER_ACCEPT,
  POSTER_LIMITS,
  POSTER_TYPES_LABEL,
  moveOrder,
  validatePosterFile,
  validatePosterImage,
  validatePosterTitle,
} from "../../api/modules/posters/rules";
import { SectionTitle } from "../../components/bits";
import ActionButton, { ActionSwitch } from "../../plan/ActionButton";
import { useWriteGuard } from "../../plan/useReadOnly";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import { POSTER_STAGE_BG } from "../../theme/posterAssets";
import type { Poster } from "../../types";
import PosterPreview from "./PosterPreview";

/**
 * OW-11: áp phích màn hình phía khách (đặc tả 9.2 mục 20, 6.13, BR-51, BR-52). Một danh sách cho cả doanh nghiệp, áp cho màn hình phía
 * khách của mọi chi nhánh. Chọn tệp là TẢI LÊN NGAY (không có bước Lưu), kiểm loại tệp và dung lượng ngay khi chọn. Thay đổi lưu ngay
 * từng thao tác. Không khoá theo gói (20.2); khoá khi chế độ chỉ đọc (BR-51, `ActionButton`). Giới hạn lấy từ `POSTER_LIMITS` (giá trị BE
 * đang ép, #82). Đổi ảnh và đổi thứ tự được GHÉP từ endpoint hiện có vì BE chưa có endpoint riêng (xem `modules/posters/compose.ts`).
 */
export default function Posters() {
  const { message, modal } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const guard = useWriteGuard();
  const [posters, setPosters] = useState<Poster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<Poster | null>(null);
  const seq = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      if (!chainId) return;
      const mine = ++seq.current;
      if (!silent) setError(null);
      try {
        const list = await postersApi.listPosters(chainId);
        if (mine !== seq.current) return;
        setPosters(list);
        setDrafts({});
        setError(null);
      } catch (err) {
        if (mine !== seq.current) return;
        if (!silent) {
          setPosters(null);
          setError(err instanceof ApiError || err instanceof Error ? describeApiError(err) : "Có lỗi xảy ra. Thử lại sau.");
        }
      }
    },
    [chainId],
  );

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load]);

  /** Chạy một thao tác ghi: khoá thao tác trùng, báo lỗi tiếng Việt, luôn nạp lại danh sách (dữ liệu thật của BE). */
  const run = async (key: string, action: () => Promise<void>, failText: string): Promise<boolean> => {
    if (busy) return false;
    setBusy(key);
    try {
      await action();
      return true;
    } catch (err) {
      showApiError(message.error, err, failText);
      return false;
    } finally {
      setBusy(null);
      await load(true);
    }
  };

  const list = posters ?? [];
  const full = list.length >= POSTER_LIMITS.maxCount;

  const onAddFile = async (file: File | undefined) => {
    if (addInput.current) addInput.current.value = "";
    if (!file || !chainId) return;
    const problem = validatePosterFile(file, list.length);
    if (problem) {
      message.error(problem);
      return;
    }
    const ok = await run("add", async () => void (await postersApi.uploadPoster(chainId, file)), "Không tải được áp phích");
    if (ok) message.success("Đã thêm áp phích (đang bật, ở cuối danh sách)");
  };

  const onReplaceFile = async (file: File | undefined) => {
    if (replaceInput.current) replaceInput.current.value = "";
    const target = replaceTarget.current;
    replaceTarget.current = null;
    if (!file || !chainId || !target) return;
    const problem = validatePosterImage(file);
    if (problem) {
      message.error(problem);
      return;
    }
    const ok = await run(`replace:${target.id}`, async () => void (await postersApi.replaceImage(chainId, target, file)), "Không đổi được ảnh áp phích");
    if (ok) message.success("Đã đổi ảnh (giữ nguyên tên, trạng thái và vị trí)");
  };

  const toggle = (poster: Poster, enabled: boolean) => {
    if (!chainId) return;
    void run(`toggle:${poster.id}`, async () => void (await postersApi.updatePoster(chainId, poster.id, { enabled })), "Không đổi được trạng thái áp phích");
  };

  const rename = (poster: Poster) => {
    const draft = drafts[poster.id];
    if (draft === undefined || !chainId) return;
    const title = draft.trim();
    if (title === poster.title) {
      setDrafts(({ [poster.id]: _drop, ...rest }) => rest);
      return;
    }
    const problem = validatePosterTitle(title);
    if (problem) {
      message.error(problem);
      setDrafts(({ [poster.id]: _drop, ...rest }) => rest);
      return;
    }
    void run(`rename:${poster.id}`, async () => void (await postersApi.updatePoster(chainId, poster.id, { title })), "Không đổi được tên áp phích");
  };

  const move = (poster: Poster, direction: -1 | 1) => {
    if (!chainId) return;
    const patches = moveOrder(list, poster.id, direction);
    if (patches.length === 0) return;
    void run(`move:${poster.id}`, () => postersApi.reorder(chainId, patches), "Không đổi được thứ tự áp phích");
  };

  const remove = (poster: Poster) => {
    modal.confirm({
      title: `Xoá áp phích "${poster.title}"?`,
      content: (
        <div data-testid="confirm-poster-delete" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          Áp phích và ảnh sẽ bị xoá khỏi màn hình phía khách của mọi chi nhánh, <b>không khôi phục được</b>.
        </div>
      ),
      okText: "Xoá áp phích",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!chainId) return;
        const ok = await run(`delete:${poster.id}`, () => postersApi.deletePoster(chainId, poster.id), "Không xoá được áp phích");
        if (ok) message.success("Đã xoá áp phích");
      },
    });
  };

  if (!chainId) return <Alert type="warning" showIcon message="Chưa xác định được doanh nghiệp" />;

  const replaceBlockedReason = full ? `Đã đủ ${POSTER_LIMITS.maxCount} áp phích: xoá bớt một áp phích rồi đổi ảnh (đổi ảnh cần tạo bản mới trước khi xoá bản cũ).` : undefined;

  return (
    <div data-testid="posters-page">
      <SectionTitle
        title="Poster màn hình sau"
        sub={`Hiện trên màn hình phía khách của mọi chi nhánh khi chờ khách và nửa trái màn hình giỏ. ${POSTER_TYPES_LABEL}, tối đa ${POSTER_LIMITS.maxBytes / (1024 * 1024)} MB mỗi ảnh, tối đa ${POSTER_LIMITS.maxCount} áp phích.`}
        extra={
          <ActionButton
            type="primary"
            icon={<ImagePlus size={15} />}
            data-testid="poster-add"
            disabled={full || busy !== null}
            onClick={() => addInput.current?.click()}
          >
            Thêm áp phích
          </ActionButton>
        }
      />
      <input ref={addInput} data-testid="poster-add-input" type="file" accept={POSTER_ACCEPT} hidden onChange={(e) => void onAddFile(e.target.files?.[0])} />
      <input ref={replaceInput} data-testid="poster-replace-input" type="file" accept={POSTER_ACCEPT} hidden onChange={(e) => void onReplaceFile(e.target.files?.[0])} />

      {full && (
        <Alert data-testid="poster-full" type="info" showIcon style={{ marginBottom: 12 }} message={`Đã đủ ${POSTER_LIMITS.maxCount} áp phích. Xoá bớt một áp phích để thêm ảnh mới.`} />
      )}

      {error && (
        <Alert
          data-testid="posters-error"
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="Không tải được danh sách áp phích"
          description={error}
          action={
            <a data-testid="posters-retry" onClick={() => void load()}>
              Thử lại
            </a>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 0 } }}>
            {posters === null && !error ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <Spin />
              </div>
            ) : list.length === 0 ? (
              <div style={{ padding: 28 }} data-testid="posters-empty">
                <Empty description="Chưa có áp phích nào — màn hình khách dùng ảnh mặc định của nền tảng" />
              </div>
            ) : (
              <div data-testid="poster-list">
                {list.map((poster, index) => (
                  <div
                    key={poster.id}
                    data-testid="poster-row"
                    data-poster-id={poster.id}
                    style={{ display: "grid", gridTemplateColumns: "112px minmax(0, 1fr)", gap: 12, padding: 12, borderBottom: index === list.length - 1 ? "none" : `1px solid ${palette.line}` }}
                  >
                    <div
                      style={{ width: 112, aspectRatio: "16 / 9", background: POSTER_STAGE_BG, borderRadius: 8, overflow: "hidden", border: `1px solid ${palette.line}` }}
                    >
                      <img data-testid="poster-thumb" src={poster.imageUrl} alt={poster.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Tag data-testid="poster-position">Vị trí {index + 1}</Tag>
                        <Tag color={poster.enabled ? "green" : undefined} data-testid="poster-state">
                          {poster.enabled ? "Đang bật" : "Đang tắt"}
                        </Tag>
                      </div>
                      <Input
                        data-testid="poster-title"
                        aria-label={`Tên áp phích vị trí ${index + 1}`}
                        value={drafts[poster.id] ?? poster.title}
                        maxLength={POSTER_LIMITS.maxTitle}
                        disabled={guard.disabled || busy !== null}
                        onChange={(e) => setDrafts((d) => ({ ...d, [poster.id]: e.target.value }))}
                        onBlur={() => rename(poster)}
                        onPressEnter={(e) => (e.target as HTMLInputElement).blur()}
                        placeholder="Tên (chỉ để bạn phân biệt, không hiện cho khách)"
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 6 }}>
                          <ActionSwitch
                            data-testid="poster-toggle"
                            checked={poster.enabled}
                            disabled={busy !== null}
                            onChange={(checked) => toggle(poster, checked)}
                            aria-label={poster.enabled ? "Tắt áp phích" : "Bật áp phích"}
                          />
                          <span style={{ fontSize: 13, color: palette.textMuted }}>{poster.enabled ? "Bật" : "Tắt"}</span>
                        </span>
                        <ActionButton size="small" icon={<ArrowUp size={14} />} data-testid="poster-up" disabled={index === 0 || busy !== null} onClick={() => move(poster, -1)} aria-label="Đưa lên">
                          Lên
                        </ActionButton>
                        <ActionButton
                          size="small"
                          icon={<ArrowDown size={14} />}
                          data-testid="poster-down"
                          disabled={index === list.length - 1 || busy !== null}
                          onClick={() => move(poster, 1)}
                          aria-label="Đưa xuống"
                        >
                          Xuống
                        </ActionButton>
                        <ActionButton
                          size="small"
                          icon={<Replace size={14} />}
                          data-testid="poster-replace"
                          disabled={full || busy !== null}
                          title={replaceBlockedReason}
                          onClick={() => {
                            replaceTarget.current = poster;
                            replaceInput.current?.click();
                          }}
                        >
                          Đổi ảnh
                        </ActionButton>
                        <ActionButton size="small" danger icon={<Trash2 size={14} />} data-testid="poster-delete" disabled={busy !== null} onClick={() => remove(poster)}>
                          Xoá
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div data-testid="poster-note" style={{ fontSize: 12.5, color: palette.textMuted, marginTop: 10, lineHeight: 1.6 }}>
            Khuyến nghị ảnh ngang 16:9. Ảnh dọc hoặc vuông vẫn hiện nguyên khổ, phần trống lấp bằng chính ảnh làm mờ. Áp phích không hiện ở màn hình
            QR và thanh toán (BR-52).
          </div>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Xem trước" style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
            <PosterPreview posters={list} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
