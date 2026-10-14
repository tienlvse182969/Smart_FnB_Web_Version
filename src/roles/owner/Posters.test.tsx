/** Trang áp phích (OW-11): khung xem trước dùng ảnh mặc định khi không có ảnh bật (đặc tả 20.3); chọn tệp sai bị chặn ngay. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { postersMock as postersReal } from "../../api/modules/posters/mock";
import { useAppStore } from "../../store";
import type { Poster } from "../../types";
import { DEFAULT_POSTER_IMAGE } from "../../theme/posterAssets";
import Posters from "./Posters";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const poster = (id: string, over: Partial<Poster> = {}): Poster => ({
  id,
  imageUrl: `http://h/${id}.png`,
  title: `Poster ${id}`,
  enabled: true,
  sortOrder: 0,
  durationSeconds: 8,
  createdAt: "2026-10-13T01:00:00.000Z",
  updatedAt: "2026-10-13T01:00:00.000Z",
  ...over,
});

const show = async (list: Poster[]) => {
  vi.spyOn(postersReal, "listPosters").mockResolvedValue(list);
  act(() => useAppStore.setState({ chainId: "c1" }));
  render(
    <AntApp>
      <Posters />
    </AntApp>,
  );
  await waitFor(() => expect(postersReal.listPosters).toHaveBeenCalled());
  await act(async () => undefined);
};

beforeEach(() => vi.restoreAllMocks());
afterEach(() => act(() => useAppStore.setState({ chainId: null })));

describe("xem trước áp phích", () => {
  it("chưa có áp phích: hiện ảnh mặc định của nền tảng, không phải ô trống", async () => {
    await show([]);
    expect(screen.getByTestId("poster-preview-default").getAttribute("src")).toBe(DEFAULT_POSTER_IMAGE);
    expect(screen.getByTestId("poster-preview").textContent).toMatch(/Chưa có poster/);
  });

  it("mọi áp phích đang tắt: vẫn dùng ảnh mặc định", async () => {
    await show([poster("a", { enabled: false })]);
    expect(screen.getByTestId("poster-preview-default")).toBeTruthy();
    expect(screen.getByTestId("poster-preview").textContent).toMatch(/Mọi poster đang tắt/);
  });

  it("có áp phích đang bật: hiện ảnh đó, không hiện ảnh mặc định", async () => {
    await show([poster("a")]);
    expect(screen.queryByTestId("poster-preview-default")).toBeNull();
  });
});

describe("chọn tệp", () => {
  it("tệp sai định dạng bị chặn ngay bằng câu tiếng Việt, không gọi BE", async () => {
    const add = vi.spyOn(postersReal, "addPoster");
    await show([]);
    const input = screen.getByTestId("poster-add-input");
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(10)], "anh.gif", { type: "image/gif" })] } });
    await waitFor(() => expect(document.body.textContent).toMatch(/chỉ nhận PNG, JPG hoặc WebP/));
    expect(add).not.toHaveBeenCalled();
  });
});
