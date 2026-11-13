import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { ApiError } from "../api/http/errors";
import * as client from "../api/http/client";
import PasswordResetRequests, { alreadyHandledMessage, type ResetRequest } from "./PasswordResetRequests";

vi.mock("../api/flags", async (orig) => ({ ...(await orig<typeof import("../api/flags")>()), modeOf: () => "real" as const }));
vi.mock("../api/realtime/operations", () => ({ subscribeOperations: () => () => undefined }));
vi.stubGlobal(
  "matchMedia",
  (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false }),
);
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const row = (over: Partial<ResetRequest> & { userStatus?: string } = {}): ResetRequest => ({
  id: over.id ?? "r1",
  status: over.status ?? "PENDING",
  createdAt: "2026-11-13T03:00:00.000Z",
  expiresAt: "2026-11-14T03:00:00.000Z",
  user: { email: "sm@x.vn", status: over.userStatus ?? "ACTIVE", role: { code: "MANAGER" }, employee: { firstName: "An", lastName: "Lê" } },
  handledBy: over.handledBy ?? null,
});

const mount = () => render(<AntApp><PasswordResetRequests /></AntApp>);
let requestSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.restoreAllMocks();
});

describe("alreadyHandledMessage", () => {
  it("chỉ nhận câu 409 'Đã được … xử lý'", () => {
    expect(alreadyHandledMessage(new ApiError(409, "Đã được a@b.vn xử lý"))).toBe("Đã được a@b.vn xử lý");
    expect(alreadyHandledMessage(new ApiError(409, "Request expired"))).toBeNull();
    expect(alreadyHandledMessage(new ApiError(500, "Đã được a xử lý"))).toBeNull();
  });
});

describe("PasswordResetRequests", () => {
  it("hiện tên vai trò theo đặc tả, không hiện mã BE", async () => {
    requestSpy = vi.spyOn(client, "request").mockResolvedValue([row()]);
    mount();
    await waitFor(() => expect(screen.getByText("Store Manager")).toBeTruthy());
    expect(screen.queryByText("MANAGER")).toBeNull();
  });

  it("tài khoản bị khoá chỉ còn nút Từ chối", async () => {
    vi.spyOn(client, "request").mockResolvedValue([row({ userStatus: "SUSPENDED" })]);
    mount();
    await waitFor(() => expect(screen.getByTestId("reset-locked-note")).toBeTruthy());
    expect(screen.queryByText("Đặt lại")).toBeNull();
    expect(screen.getByText("Từ chối")).toBeTruthy();
  });

  it("từ chối bắt buộc ghi chú: nút bị khoá khi ghi chú trống", async () => {
    vi.spyOn(client, "request").mockResolvedValue([row()]);
    mount();
    await waitFor(() => expect(screen.getByText("Từ chối")).toBeTruthy());
    fireEvent.click(screen.getByText("Từ chối"));
    const submit = await screen.findByText("Từ chối yêu cầu");
    expect((submit.closest("button") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId("reset-reject-note"), { target: { value: "Không xác minh được" } });
    await waitFor(() => expect((submit.closest("button") as HTMLButtonElement).disabled).toBe(false));
  });

  it("người khác đã xử lý: báo đúng câu của BE, đóng hộp và tải lại danh sách", async () => {
    const spy = vi.spyOn(client, "request").mockImplementation(async (path: string, options?: { method?: string }) => {
      if (options?.method === "POST") throw new ApiError(409, "Đã được pt@x.vn xử lý");
      return [row()];
    });
    mount();
    await waitFor(() => expect(screen.getByText("Đặt lại")).toBeTruthy());
    fireEvent.click(screen.getByText("Đặt lại"));
    fireEvent.click(await screen.findByText("Xác nhận đặt lại và gửi email"));
    await waitFor(() => expect(screen.getByText("Đã được pt@x.vn xử lý")).toBeTruthy());
    expect(spy.mock.calls.filter(([p]) => p === "/password-reset-requests").length).toBeGreaterThanOrEqual(2);
  });

  it("lỗi tải hiện thông báo kèm Thử lại; danh sách trống có chữ riêng", async () => {
    const spy = vi.spyOn(client, "request").mockRejectedValueOnce(new ApiError(500, "boom")).mockResolvedValue([]);
    mount();
    await waitFor(() => expect(screen.getByTestId("reset-load-error")).toBeTruthy());
    fireEvent.click(screen.getByText("Thử lại"));
    await waitFor(() => expect(screen.queryByTestId("reset-load-error")).toBeNull());
    expect(screen.getByText("Chưa có yêu cầu đặt lại mật khẩu nào")).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
