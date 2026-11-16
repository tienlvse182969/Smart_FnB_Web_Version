import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App as AntApp } from "antd";
import { ApiError } from "../../api/http/errors";
import { orderApi } from "../../api";
import type { RefundDocument } from "../../types";
import { mapRefundDocument } from "../../api/modules/order/refundDocument";
import RefundSlip, { hasRefundSlip } from "./RefundSlip";

const doc = (over: Partial<RefundDocument> = {}): RefundDocument => ({
  refundId: "r1", orderId: "o1", status: "READY", fileName: "refund.pdf", generatedAt: "2026-11-13T03:00:00.000Z", errorMessage: null,
  downloadUrl: "https://files.example/refund.pdf?sig=1", expiresAt: "2026-11-13T03:10:00.000Z", ...over,
});

const mount = () => render(<AntApp><RefundSlip orderId="o1" refundId="r1" /></AntApp>);
const open = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  open.mockReset();
  open.mockReturnValue({ location: { href: "" }, close: vi.fn() });
  vi.stubGlobal("open", open);
});

describe("hasRefundSlip", () => {
  it("chỉ khoản hoàn tiền mặt đã xác nhận có phiếu", () => {
    expect(hasRefundSlip({ method: "CASH", status: "COMPLETED" })).toBe(true);
    expect(hasRefundSlip({ method: "CASH", status: "PENDING" })).toBe(false);
    expect(hasRefundSlip({ method: "BANK_TRANSFER", status: "COMPLETED" })).toBe(false);
  });
});

describe("mapRefundDocument", () => {
  it("không giữ link khi chưa Sẵn sàng; trạng thái lạ coi là Lỗi", () => {
    expect(mapRefundDocument({ status: "PENDING", downloadUrl: "x" }, { orderId: "o", refundId: "r" }).downloadUrl).toBeNull();
    expect(mapRefundDocument({ status: "???" }, { orderId: "o", refundId: "r" }).status).toBe("FAILED");
    expect(mapRefundDocument({ status: "DISABLED" }, { orderId: "o", refundId: "r" }).status).toBe("DISABLED");
  });
});

describe("RefundSlip", () => {
  it("Sẵn sàng: hỏi lại BE rồi mở link; mỗi lần bấm lấy link mới", async () => {
    const get = vi.spyOn(orderApi, "getRefundDocument").mockResolvedValue(doc());
    mount();
    fireEvent.click(screen.getByTestId("refund-slip-open"));
    await waitFor(() => expect(screen.getByText("Mở lại phiếu hoàn (PDF)")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("refund-slip-open").className).not.toContain("ant-btn-loading"));
    fireEvent.click(screen.getByTestId("refund-slip-open"));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it("Đang sinh: hiện trạng thái và Tải lại; Tải lại gọi BE", async () => {
    const get = vi.spyOn(orderApi, "getRefundDocument").mockResolvedValueOnce(doc({ status: "PENDING", downloadUrl: null })).mockResolvedValue(doc());
    mount();
    fireEvent.click(screen.getByTestId("refund-slip-open"));
    await waitFor(() => expect(screen.getByTestId("refund-slip-pending")).toBeTruthy());
    fireEvent.click(screen.getByText("Tải lại"));
    await waitFor(() => expect(screen.queryByTestId("refund-slip-pending")).toBeNull());
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("Lỗi: nút Sinh lại gọi retry, khoản hoàn không bị đụng", async () => {
    vi.spyOn(orderApi, "getRefundDocument").mockResolvedValue(doc({ status: "FAILED", downloadUrl: null, errorMessage: "storage down" }));
    const retry = vi.spyOn(orderApi, "retryRefundDocument").mockResolvedValue(doc({ status: "PENDING", downloadUrl: null }));
    mount();
    fireEvent.click(screen.getByTestId("refund-slip-open"));
    await waitFor(() => expect(screen.getByTestId("refund-slip-failed").textContent).toContain("storage down"));
    fireEvent.click(screen.getByTestId("refund-slip-retry"));
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("refund-slip-pending")).toBeTruthy());
  });

  it("403 hiện lỗi kèm Thử lại; bấm đúp chỉ gọi một lần", async () => {
    let resolve!: (d: RefundDocument) => void;
    const get = vi.spyOn(orderApi, "getRefundDocument").mockReturnValueOnce(new Promise<RefundDocument>((r) => (resolve = r))).mockRejectedValue(new ApiError(403, "Forbidden"));
    mount();
    const btn = screen.getByTestId("refund-slip-open");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(get).toHaveBeenCalledTimes(1);
    resolve(doc({ status: "DISABLED", downloadUrl: null }));
    await waitFor(() => expect(screen.getByTestId("refund-slip-disabled")).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId("refund-slip-open").className).not.toContain("ant-btn-loading"));
    fireEvent.click(screen.getByTestId("refund-slip-open"));
    await waitFor(() => expect(screen.getByTestId("refund-slip-error")).toBeTruthy());
  });
});
