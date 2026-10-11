/**
 * Phiên của màn hình gọi số (thiết bị ghép, đặc tả 11.10/BR-45; quyết định 105–108).
 *
 * LƯU Ở ĐÂU: `localStorage["smartfnb.callingDisplay"]` = `{ pairingId, code, deviceToken, expiresAt, paired? }`, tách khỏi phiên người dùng
 * (`smartfnb_access_token`). Token thiết bị KHÔNG có hạn (BE chỉ có `revokedAt`, `stations.service.ts:341-351`): hết hạn duy nhất là
 * của MÃ ghép (5 phút, `expiresAt`). Thu hồi: Manager `DELETE /display-devices/:id` hoặc ghép máy gọi số mới cho cùng chi nhánh
 * (`stations.service.ts:315-322` thu hồi máy cũ). Token đã thu hồi chỉ bị phát hiện qua REST (BE không đá socket đang nối).
 *
 * BE trả CÙNG MỘT 403 cho "chưa ghép", "token sai" và "đã thu hồi" (`stations.service.ts:362-369`), nên web phân biệt bằng trạng thái đã
 * từng vào được hay chưa (`paired`).
 */
import { ApiError } from "../http/errors";

export interface StoredPairing {
  pairingId: string;
  code: string;
  deviceToken: string;
  expiresAt: string;
  /** Giờ máy (ms) lúc nhận mã. Hạn mã tính theo thời gian TRÔI QUA từ đây, không so `expiresAt` với đồng hồ máy: TV lệch giờ vài phút
   *  sẽ coi mọi mã là hết hạn và tạo mã liên tục. */
  issuedAt?: number;
  /** true sau lần đọc ngữ cảnh thành công đầu tiên (máy đã được Manager ghép). */
  paired?: boolean;
}

/** Mã ghép hết hạn sau 5 phút (`stations.service.ts:73`). */
export const PAIRING_CODE_TTL_MS = 5 * 60_000;

export const CALLING_DISPLAY_STORAGE_KEY = "smartfnb.callingDisplay";

let memory: StoredPairing | null = null;

export function loadPairing(): StoredPairing | null {
  try {
    const raw = localStorage.getItem(CALLING_DISPLAY_STORAGE_KEY);
    if (raw === null) return memory;
    const value = JSON.parse(raw) as Partial<StoredPairing> | null;
    if (!value || typeof value.deviceToken !== "string" || !value.deviceToken) return null;
    return value as StoredPairing;
  } catch {
    return memory;
  }
}

export function savePairing(value: StoredPairing | null): void {
  memory = value;
  try {
    if (value) localStorage.setItem(CALLING_DISPLAY_STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(CALLING_DISPLAY_STORAGE_KEY);
  } catch {
    // Storage bị chặn: máy vẫn chạy tới khi đóng tab.
  }
}

export function isCodeExpired(pairing: Pick<StoredPairing, "expiresAt" | "issuedAt">, now = Date.now()): boolean {
  if (typeof pairing.issuedAt === "number") return now - pairing.issuedAt >= PAIRING_CODE_TTL_MS;
  const at = Date.parse(pairing.expiresAt);
  return Number.isNaN(at) || at <= now;
}

/** Kết quả của một lần đọc ngữ cảnh thất bại. */
export type ContextFailure =
  /** Máy đã từng vào được mà nay bị từ chối: thu hồi/ghép lại → quay về bước ghép mã. */
  | "revoked"
  /** Chưa ghép và mã còn hạn: bình thường, tiếp tục chờ Manager nhập mã (không hiện lỗi). */
  | "waiting"
  /** Chưa ghép và mã hết hạn: tạo mã mới. */
  | "code-expired"
  /** Mất mạng, 5xx, … : giữ token, hiện lỗi, thử lại giãn cách. */
  | "transient";

export function classifyContextFailure(err: unknown, pairing: StoredPairing, now = Date.now()): ContextFailure {
  if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
    if (pairing.paired) return "revoked";
    return isCodeExpired(pairing, now) ? "code-expired" : "waiting";
  }
  return "transient";
}

export const REVOKED_TEXT =
  "Màn hình này không còn được ghép với chi nhánh (đã bị thu hồi hoặc ghép lại ở máy khác). Hãy nhập mã mới bên dưới trong phần quản lý màn hình gọi số.";
export const CODE_EXPIRED_TEXT = "Mã ghép cũ đã hết hạn nên đã tạo mã mới.";

/** Nhịp hỏi lại (ms). Có socket nối thì sự kiện `calling.order.*` đẩy việc tải lại, nhịp dài chỉ là dự phòng. */
export const WAITING_POLL_MS = 3_000;
export const PAIRED_POLL_MS = 10_000;
/** BE không đá socket khi thu hồi (`realtime.gateway.ts` chỉ kiểm token lúc nối), nên nhịp này cũng là thời gian tối đa tới khi TV biết bị thu hồi. */
export const PAIRED_LIVE_POLL_MS = 30_000;
export const RETRY_BASE_MS = 5_000;
export const RETRY_MAX_MS = 60_000;
/** Sau khi socket hết lượt tự nối: không có ai bấm nút trên TV nên tự nối lại theo nhịp này. */
export const RECONNECT_AFTER_EXHAUSTED_MS = 30_000;

/** 5s, 10s, 20s, 40s, 60s, 60s… (failures >= 1). */
export function backoffDelay(failures: number): number {
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.max(0, failures - 1));
}

export function nextPollDelay({ failures, paired, live }: { failures: number; paired: boolean; live: boolean }): number {
  if (failures > 0) return backoffDelay(failures);
  if (!paired) return WAITING_POLL_MS;
  return live ? PAIRED_LIVE_POLL_MS : PAIRED_POLL_MS;
}
