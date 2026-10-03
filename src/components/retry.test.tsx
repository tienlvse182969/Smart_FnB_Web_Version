import { useEffect, useState, type ReactElement } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, resetErrorDedupe } from "../api/http/errors";
import { wrapWithErrorHandling } from "../api/define";
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
