/**
 * Trang áp phích (OW-11, lượt 7.9): danh sách, kiểm tệp ngay khi chọn, thao tác, chỉ đọc, xem trước xoay vòng.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { postersApi } from "../../api";
import { mockControl } from "../../api/mock/control";
import { POSTER_LIMITS } from "../../api/modules/posters/rules";
import { useAppStore } from "../../store";
import type { Poster } from "../../types";
import PosterPreview, { DEFAULT_POSTER_IMAGE } from "./PosterPreview";
import Posters from "./Posters";

mockControl.latency = [0, 0];
mockControl.failure = null;

const media = (reduce: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && /prefers-reduced-motion/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  }));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const p = (id: string, over: Partial<Poster> = {}): Poster => ({
  id,
  title: `Áp phích ${id}`,
  imageUrl: `http://h/${id}.png`,
  enabled: true,
  sortOrder: 0,
  durationSeconds: 8,
  updatedAt: null,
  ...over,
});

describe("PosterPreview — xoay vòng", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    media(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const active = () => screen.getAllByTestId("poster-preview-slide").findIndex((s) => s.getAttribute("data-active") === "true");

  it("đổi ảnh sau 8 giây, quay vòng theo thứ tự", () => {
    render(<PosterPreview posters={[p("a"), p("b"), p("c")]} />);
    expect(active()).toBe(0);
    expect(screen.getByTestId("poster-preview-state").textContent).toMatch(/Ảnh 1\/3 · 8 giây/);
    act(() => void vi.advanceTimersByTime(7_999));
    expect(active()).toBe(0);
    act(() => void vi.advanceTimersByTime(1));
    expect(active()).toBe(1);
    act(() => void vi.advanceTimersByTime(8_000));
    expect(active()).toBe(2);
    act(() => void vi.advanceTimersByTime(8_000));
    expect(active()).toBe(0);
  });

  it("chỉ áp phích đang bật tham gia vòng xoay, đúng thứ tự mảng", () => {
    render(<PosterPreview posters={[p("a"), p("b", { enabled: false }), p("c")]} />);
    expect(screen.getAllByTestId("poster-preview-slide")).toHaveLength(2);
    act(() => void vi.advanceTimersByTime(8_000));
    expect(screen.getByTestId("poster-preview-state").textContent).toMatch(/Ảnh 2\/2/);
  });

  it("dùng thời lượng của từng áp phích", () => {
    render(<PosterPreview posters={[p("a", { durationSeconds: 3 }), p("b")]} />);
    act(() => void vi.advanceTimersByTime(3_000));
    expect(active()).toBe(1);
  });

  it("không có áp phích bật: ảnh mặc định và dòng giải thích", () => {
    render(<PosterPreview posters={[p("a", { enabled: false })]} />);
    expect(screen.getByTestId("poster-preview-state").textContent).toMatch(/dùng ảnh mặc định/);
    expect(screen.getByTestId("poster-preview-image").getAttribute("src")).toBe(DEFAULT_POSTER_IMAGE);
    act(() => void vi.advanceTimersByTime(30_000));
    expect(screen.getAllByTestId("poster-preview-slide")).toHaveLength(1);
  });

  it("một ảnh: không xoay, phóng rất chậm (animation)", () => {
    render(<PosterPreview posters={[p("a")]} />);
    act(() => void vi.advanceTimersByTime(30_000));
    expect(active()).toBe(0);
    expect(screen.getByTestId("poster-preview-image").getAttribute("style")).toMatch(/poster-slow-zoom/);
  });

  it("ảnh hiện nguyên khổ (contain) kèm nền mờ cùng ảnh", () => {
    const { container } = render(<PosterPreview posters={[p("a"), p("b")]} />);
    const img = screen.getAllByTestId("poster-preview-image")[0];
    expect(img.getAttribute("style")).toMatch(/object-fit:\s*contain/);
    const blurred = container.querySelectorAll('img[alt=""]');
    expect(blurred.length).toBe(2);
    expect((blurred[0] as HTMLElement).getAttribute("style")).toMatch(/blur\(/);
    expect(blurred[0].getAttribute("src")).toBe(img.getAttribute("src"));
  });

  it("prefers-reduced-motion: không chuyển mờ, không phóng", () => {
    media(true);
    render(<PosterPreview posters={[p("a")]} />);
    expect(screen.getByTestId("poster-preview-image").getAttribute("style") ?? "").not.toMatch(/poster-slow-zoom/);
    const slide = screen.getByTestId("poster-preview-slide");
    expect(slide.getAttribute("style")).toMatch(/transition:\s*none/);
  });

  it("danh sách đổi thì về ảnh đầu", () => {
    const { rerender } = render(<PosterPreview posters={[p("a"), p("b")]} />);
    act(() => void vi.advanceTimersByTime(8_000));
    expect(active()).toBe(1);
    rerender(<PosterPreview posters={[p("x"), p("y"), p("z")]} />);
    expect(active()).toBe(0);
  });
});

describe("Trang áp phích", () => {
  const png = (name = "a.png", size = 100) => new File([new Uint8Array(size)], name, { type: "image/png" });

  beforeEach(() => {
    media(false);
    act(() => useAppStore.setState({ chainId: "chain-1", plan: null }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    act(() => useAppStore.setState({ chainId: null, plan: null }));
  });

  const mount = async (list: Poster[]) => {
    vi.spyOn(postersApi, "listPosters").mockResolvedValue(list);
    render(
      <AntApp>
        <Posters />
      </AntApp>,
    );
    await waitFor(() => expect(screen.getByTestId("posters-page")).toBeTruthy());
    if (list.length > 0) await waitFor(() => expect(screen.getAllByTestId("poster-row").length).toBe(list.length));
  };
  const choose = (testId: string, f: File) => fireEvent.change(screen.getByTestId(testId), { target: { files: [f] } });

  it("liệt kê: vị trí, trạng thái, tên; chưa có áp phích thì báo dùng ảnh mặc định", async () => {
    await mount([p("a"), p("b", { enabled: false })]);
    expect(screen.getAllByTestId("poster-position").map((e) => e.textContent)).toEqual(["Vị trí 1", "Vị trí 2"]);
    expect(screen.getAllByTestId("poster-state").map((e) => e.textContent)).toEqual(["Đang bật", "Đang tắt"]);
    expect(screen.getByTestId("poster-preview-state").textContent).toMatch(/Ảnh 1\/1/);
  });

  it("danh sách rỗng: thông báo và xem trước ảnh mặc định", async () => {
    await mount([]);
    expect(screen.getByTestId("posters-empty").textContent).toMatch(/ảnh mặc định/);
    expect(screen.getByTestId("poster-preview-state").textContent).toMatch(/dùng ảnh mặc định/);
  });

  it("chọn tệp sai định dạng: báo ngay bằng tiếng Việt, KHÔNG gọi tải lên", async () => {
    const upload = vi.spyOn(postersApi, "uploadPoster");
    await mount([p("a")]);
    choose("poster-add-input", new File([new Uint8Array(10)], "anh.gif", { type: "image/gif" }));
    await waitFor(() => expect(document.body.textContent).toMatch(/chỉ nhận PNG, JPG hoặc WebP/));
    expect(upload).not.toHaveBeenCalled();
  });

  it("chọn tệp quá 5 MB: báo ngay, không gọi tải lên", async () => {
    const upload = vi.spyOn(postersApi, "uploadPoster");
    await mount([p("a")]);
    choose("poster-add-input", png("big.png", 5 * 1024 * 1024 + 1));
    await waitFor(() => expect(document.body.textContent).toMatch(/vượt giới hạn 5 MB/));
    expect(upload).not.toHaveBeenCalled();
  });

  it("tệp hợp lệ: tải lên NGAY (không có nút Lưu) rồi nạp lại danh sách", async () => {
    const upload = vi.spyOn(postersApi, "uploadPoster").mockResolvedValue(p("new"));
    await mount([p("a")]);
    const f = png();
    choose("poster-add-input", f);
    await waitFor(() => expect(upload).toHaveBeenCalledWith("chain-1", f));
    expect(screen.queryByText("Lưu")).toBeNull();
  });

  it("đủ số lượng: nút Thêm khoá, có thông báo; Đổi ảnh khoá kèm lý do", async () => {
    const full = Array.from({ length: POSTER_LIMITS.maxCount }, (_, i) => p(`p${i}`, { sortOrder: i }));
    await mount(full);
    expect((screen.getByTestId("poster-add") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("poster-full").textContent).toMatch(/Đã đủ 10 áp phích/);
    expect((screen.getAllByTestId("poster-replace")[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("bật/tắt gọi PATCH enabled", async () => {
    const update = vi.spyOn(postersApi, "updatePoster").mockResolvedValue(p("a", { enabled: false }));
    await mount([p("a"), p("b")]);
    fireEvent.click(screen.getAllByTestId("poster-toggle")[0]);
    await waitFor(() => expect(update).toHaveBeenCalledWith("chain-1", "a", { enabled: false }));
  });

  it("đổi tên khi rời ô: PATCH title đã trim; tên rỗng không gửi", async () => {
    const update = vi.spyOn(postersApi, "updatePoster").mockResolvedValue(p("a"));
    await mount([p("a")]);
    const input = screen.getAllByTestId("poster-title")[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Món mới  " } });
    fireEvent.blur(input);
    await waitFor(() => expect(update).toHaveBeenCalledWith("chain-1", "a", { title: "Món mới" }));
    update.mockClear();
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    await waitFor(() => expect(document.body.textContent).toMatch(/Nhập tên áp phích/));
    expect(update).not.toHaveBeenCalled();
  });

  it("lên/xuống: gọi reorder với các áp phích đổi chỗ; đầu danh sách không có Lên", async () => {
    const reorder = vi.spyOn(postersApi, "reorder").mockResolvedValue();
    await mount([p("a", { sortOrder: 0 }), p("b", { sortOrder: 1 })]);
    expect((screen.getAllByTestId("poster-up")[0] as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getAllByTestId("poster-down")[1] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getAllByTestId("poster-down")[0]);
    await waitFor(() =>
      expect(reorder).toHaveBeenCalledWith("chain-1", [
        { id: "b", sortOrder: 0 },
        { id: "a", sortOrder: 1 },
      ]),
    );
  });

  it("xoá: có hộp xác nhận; huỷ thì không xoá", async () => {
    const del = vi.spyOn(postersApi, "deletePoster").mockResolvedValue();
    await mount([p("a", { title: "KM" })]);
    fireEvent.click(screen.getAllByTestId("poster-delete")[0]);
    await waitFor(() => expect(screen.getByTestId("confirm-poster-delete").textContent).toMatch(/không khôi phục được/));
    expect(del).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Xoá áp phích"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("chain-1", "a"));
  });

  it("chế độ chỉ đọc (gói hết hạn): mọi nút ghi và ô tên bị khoá, xem trước vẫn chạy", async () => {
    act(() =>
      useAppStore.setState({
        plan: { chainId: "c", tier: "BASIC", planName: "Demo", status: "expired", expiresAt: "2020-01-01T00:00:00.000Z", limits: [], features: {}, source: { limits: "real", features: "real" } } as never,
      }),
    );
    await mount([p("a"), p("b")]);
    for (const id of ["poster-add"]) expect((screen.getByTestId(id) as HTMLButtonElement).disabled).toBe(true);
    for (const id of ["poster-up", "poster-down", "poster-replace", "poster-delete"]) {
      for (const el of screen.getAllByTestId(id)) expect((el as HTMLButtonElement).disabled).toBe(true);
    }
    expect((screen.getAllByTestId("poster-title")[0] as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByTestId("poster-preview")).toBeTruthy();
  });

  it("gói Cơ bản KHÔNG khoá (không khoá theo gói, 20.2)", async () => {
    act(() =>
      useAppStore.setState({
        plan: { chainId: "c", tier: "BASIC", planName: "Cơ bản", status: "active", expiresAt: "2099-01-01T00:00:00.000Z", limits: [], features: {}, source: { limits: "real", features: "real" } } as never,
      }),
    );
    await mount([p("a")]);
    expect((screen.getByTestId("poster-add") as HTMLButtonElement).disabled).toBe(false);
  });

  it("lỗi tải danh sách: khối lỗi tiếng Việt có Thử lại", async () => {
    vi.spyOn(postersApi, "listPosters").mockRejectedValue(new Error("boom"));
    render(
      <AntApp>
        <Posters />
      </AntApp>,
    );
    await waitFor(() => expect(screen.getByTestId("posters-error")).toBeTruthy());
    expect(screen.getByTestId("posters-retry")).toBeTruthy();
  });
});
