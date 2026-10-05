import { useEffect, useState, type ReactElement } from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, resetErrorDedupe } from "../api/http/errors";
import { wrapWithErrorHandling } from "../api/define";
import { hasDirtyForm, onUserEdit, registerDirty, resetDirtyGuard, useDirtyGuard } from "../lib/dirtyGuard";
import { useAppStore } from "../store";
import ApiErrorBridge from "./ApiErrorBridge";
import RefreshBoundary from "./RefreshBoundary";

/** Một "màn" đọc dữ liệu ở useEffect lúc mount, như các màn thật; mọi lỗi đi qua lớp bọc `wrapWithErrorHandling`. */
function makeScreen(read: () => Promise<string>) {
  const api = wrapWithErrorHandling({ listThings: read });
  return function Screen() {
    const [text, setText] = useState("đang tải");
    useEffect(() => {
      api.listThings().then(setText, () => setText("lỗi"));
    }, []);
    return <div data-testid="screen">{text}</div>;
  };
}

function mount(Screen: () => ReactElement) {
  return render(
    <AntApp>
      <ApiErrorBridge />
      <RefreshBoundary>
        <Screen />
      </RefreshBoundary>
    </AntApp>,
  );
}

const retryButton = () => screen.queryByTestId("api-error-retry");

beforeEach(() => {
  useAppStore.setState({ refreshEpoch: 0, scopeStatus: "ready" });
  resetErrorDedupe();
});
afterEach(() => {
  useAppStore.setState({ scopeStatus: "idle" });
});

describe("nút Thử lại (5.8c)", () => {
  it.each([
    ["mất mạng", () => new ApiError(0, "mạng")],
    ["500", () => new ApiError(500, "Internal server error")],
    ["503", () => new ApiError(503, "Service Unavailable")],
  ])("lỗi đọc %s: có nút Thử lại", async (_name, make) => {
    const Screen = makeScreen(async () => {
      throw make();
    });
    mount(Screen);
    expect(await screen.findByTestId("api-error-retry")).toBeTruthy();
  });

  it.each([
    ["403", () => new ApiError(403, "no")],
    ["401", () => new ApiError(401, "x")],
    ["404", () => new ApiError(404, "x")],
    ["409", () => new ApiError(409, "x")],
    ["400", () => new ApiError(400, "x")],
  ])("lỗi đọc %s: không có nút Thử lại", async (_name, make) => {
    const read = vi.fn(async () => {
      throw make();
    });
    mount(makeScreen(read));
    await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("lỗi"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(retryButton()).toBeNull();
  });

  it("bấm Thử lại → màn nạp lại đúng 1 lần và hiện dữ liệu mới", async () => {
    const read = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError(0, "mạng"))
      .mockResolvedValue("dữ liệu mới");
    mount(makeScreen(read));
    fireEvent.click(await screen.findByTestId("api-error-retry"));
    await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("dữ liệu mới"));
    expect(read).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().refreshEpoch).toBe(1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(read).toHaveBeenCalledTimes(2); // không tự lặp
  });

  it("request lại lỗi tiếp: mỗi lần bấm đúng 1 request, không lặp vô hạn", async () => {
    const read = vi.fn(async () => {
      throw new ApiError(500, "Internal server error");
    });
    mount(makeScreen(read));
    fireEvent.click(await screen.findByTestId("api-error-retry"));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(read).toHaveBeenCalledTimes(2);
    fireEvent.click(await screen.findByTestId("api-error-retry"));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(3));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("đang nạp phạm vi làm việc: không bắn thông báo nổi (màn lỗi toàn trang đã có nút riêng)", async () => {
    useAppStore.setState({ scopeStatus: "loading" });
    const read = vi.fn(async () => {
      throw new ApiError(0, "mạng");
    });
    mount(makeScreen(read));
    await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("lỗi"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(retryButton()).toBeNull();
  });
});

describe("bảo vệ form khi Thử lại (5.8d)", () => {
  beforeEach(() => resetDirtyGuard());
  afterEach(() => resetDirtyGuard());

  const networkFail = () =>
    vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError(0, "mạng"))
      .mockResolvedValue("dữ liệu mới");

  it("form đang nhập dở: hiện hộp xác nhận; Huỷ thì không nạp lại, thông báo lỗi còn; đồng ý thì nạp lại", async () => {
    const read = networkFail();
    mount(makeScreen(read));
    const button = await screen.findByTestId("api-error-retry");
    registerDirty("form-dang-nhap");

    fireEvent.click(button);
    expect((await screen.findAllByText("Nội dung đang nhập sẽ mất. Vẫn tải lại?")).length).toBeGreaterThan(0);
    expect(useAppStore.getState().refreshEpoch).toBe(0);

    // Huỷ: không nạp lại, nút Thử lại của thông báo vẫn còn để bấm lại sau
    fireEvent.click(await screen.findByRole("button", { name: "Huỷ" }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(useAppStore.getState().refreshEpoch).toBe(0);
    expect(read).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("api-error-retry")).toBeTruthy();

    // Bấm lại, lần này đồng ý
    fireEvent.click(screen.getByTestId("api-error-retry"));
    // hộp cũ (đã Huỷ) còn trong DOM một lúc vì hiệu ứng thoát của antd: bấm hộp mới nhất
    const agree = await screen.findAllByRole("button", { name: "Tải lại" });
    fireEvent.click(agree[agree.length - 1]);
    await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("dữ liệu mới"));
    expect(useAppStore.getState().refreshEpoch).toBe(1);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("không có form dở: nạp lại ngay, không hỏi", async () => {
    const read = networkFail();
    mount(makeScreen(read));
    fireEvent.click(await screen.findByTestId("api-error-retry"));
    await waitFor(() => expect(screen.getByTestId("screen").textContent).toBe("dữ liệu mới"));
    expect(screen.queryAllByText("Nội dung đang nhập sẽ mất. Vẫn tải lại?")).toHaveLength(0);
  });

  it("useDirtyGuard: đăng ký khi có thay đổi chưa lưu, gỡ khi lưu xong hoặc rời màn", () => {
    const { rerender, unmount } = renderHook(({ dirty }) => useDirtyGuard(dirty), { initialProps: { dirty: false } });
    expect(hasDirtyForm()).toBe(false);
    rerender({ dirty: true });
    expect(hasDirtyForm()).toBe(true);
    rerender({ dirty: false });
    expect(hasDirtyForm()).toBe(false);
    rerender({ dirty: true });
    unmount();
    expect(hasDirtyForm()).toBe(false);
  });

  it("hộp thoại/ngăn kéo: gõ hoặc chọn là nhập dở; đóng (ẩn/gỡ) thì hết; hộp xác nhận và ô ngoài hộp thoại không tính", () => {
    const visible = vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    document.addEventListener("input", onUserEdit, true);
    document.addEventListener("click", onUserEdit, true);
    try {
      const drawer = document.createElement("div");
      drawer.className = "ant-drawer-section"; // cấu trúc thật của antd 6 (đã kiểm trên trình duyệt)
      drawer.innerHTML = '<input id="a"/><div class="ant-select-item-option" id="o">x</div>';
      const confirm = document.createElement("div");
      confirm.className = "ant-modal ant-modal-confirm";
      confirm.innerHTML = '<div class="ant-modal-container"><input id="c"/></div>';
      const outside = document.createElement("input");
      document.body.append(drawer, confirm, outside);

      fireEvent.input(outside, { target: { value: "tìm" } });
      fireEvent.input(confirm.querySelector("#c")!, { target: { value: "x" } });
      expect(hasDirtyForm()).toBe(false);

      fireEvent.click(drawer.querySelector("#a")!); // click vào ô không đổi nội dung
      expect(hasDirtyForm()).toBe(false);
      fireEvent.input(drawer.querySelector("#a")!, { target: { value: "Cà phê" } });
      expect(hasDirtyForm()).toBe(true);

      visible.mockReturnValue([] as unknown as DOMRectList); // ngăn kéo đóng (ẩn)
      expect(hasDirtyForm()).toBe(false);

      visible.mockReturnValue([{}] as unknown as DOMRectList);
      fireEvent.click(drawer.querySelector("#o")!); // chọn trong Select
      expect(hasDirtyForm()).toBe(true);
      drawer.remove(); // gỡ khỏi DOM
      expect(hasDirtyForm()).toBe(false);
      confirm.remove();
      outside.remove();
    } finally {
      document.removeEventListener("input", onUserEdit, true);
      document.removeEventListener("click", onUserEdit, true);
      visible.mockRestore();
    }
  });
});
