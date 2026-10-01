/**
 * Module payos — liên kết PayOS của doanh nghiệp (OW-06, đặc tả 11.3). Mock; BE chưa có.
 * Khoá PayOS không bao giờ trả về frontend sau khi lưu (BR-25) nên interface chỉ có trạng thái.
 */
import { defineApi } from "../../define";
import { ApiError } from "../../http/errors";
import { mockDelay } from "../../mock/control";
import { assertMockWritable } from "../../mock/guards";

/** Chưa liên kết / Đang kiểm tra / Đã liên kết / Lỗi (mục 5.6). */
export type PayosLinkStatus = "unlinked" | "verifying" | "linked" | "error";

export interface PayosApi {
  getLinkStatus(chainId: string): Promise<{ status: PayosLinkStatus }>;
  unlink(chainId: string): Promise<void>;
}

const linked = new Map<string, PayosLinkStatus>();

const payosMock: PayosApi = {
  async getLinkStatus(chainId) {
    await mockDelay();
    return { status: linked.get(chainId) ?? "unlinked" };
  },
  async unlink(chainId) {
    await mockDelay();
    assertMockWritable();
    if ((linked.get(chainId) ?? "unlinked") === "unlinked") throw new ApiError(409, "Chưa liên kết PayOS");
    linked.set(chainId, "unlinked");
  },
};

// CHỜ BE: OW-06 chưa có endpoint (lưu khoá, kiểm tra kết nối). Bản real và phần nhập khoá viết ở giai đoạn 6.
export const payosApi = defineApi<PayosApi>("payos", { mock: payosMock });
