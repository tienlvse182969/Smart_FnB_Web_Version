/**
 * Module payos — liên kết PayOS của doanh nghiệp (OW-06, đặc tả 11.3). Real từ 6.5; mock giữ cùng giao diện.
 * Khoá PayOS không bao giờ trả về frontend sau khi lưu (BR-25): interface chỉ có trạng thái; khoá chỉ đi MỘT chiều (web → BE) khi lưu.
 */
import { defineApi } from "../../define";
import { payosMock } from "./mock";
import { payosReal } from "./real";

/**
 * Chưa liên kết / Đang kiểm tra / Đã liên kết / Lỗi (mục 5.6). Từ BE `de4f55c` (#40) real có đủ: `unlinked`, `linked`, `error` (BE `status` `ERROR`:
 * PayOS từ chối khi tạo QR) và `verifying` (chỉ trong lúc `PUT` chờ BE xác minh với PayOS, quyết định 51).
 */
export type PayosLinkStatus = "unlinked" | "verifying" | "linked" | "error";

export interface PayosChannel {
  status: PayosLinkStatus;
  /** ISO — lần đầu liên kết (BE `createdAt`). */
  linkedAt?: string;
  /** ISO — lần cập nhật khoá gần nhất (BE `updatedAt`). */
  updatedAt?: string;
  /** ISO — lần xác minh với PayOS gần nhất (BE `lastVerifiedAt`). */
  lastVerifiedAt?: string;
  /** 4 ký tự cuối do BE trả để hiện khoá che (quyết định 48). Không bao giờ có khoá đầy đủ. */
  clientIdLast4?: string;
  apiKeyLast4?: string;
}

/** Ba khoá nhập tay; bắt buộc đủ cả ba cho mọi lần lưu (quyết định 31). */
export interface PayosKeysInput {
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export interface PayosApi {
  getChannel(chainId: string): Promise<PayosChannel>;
  /** `PUT` — mã hoá và lưu 3 khoá; trả trạng thái mới, KHÔNG có khoá. */
  saveKeys(chainId: string, keys: PayosKeysInput): Promise<PayosChannel>;
  /** `DELETE` — gỡ liên kết; QR thanh toán ở mọi chi nhánh ngừng hoạt động cho tới khi liên kết lại (quyết định 32). */
  unlink(chainId: string): Promise<PayosChannel>;
}

export const payosApi = defineApi<PayosApi>("payos", { real: payosReal, mock: payosMock });
