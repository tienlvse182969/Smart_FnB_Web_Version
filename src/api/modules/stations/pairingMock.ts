/**
 * Mã ghép GIẢ cho mock (và MockPanel): mô phỏng màn hình tự sinh mã (`POST /device-pairing/codes`): 6 số, hết hạn sau 5 phút,
 * dùng một lần, gắn với một loại màn hình. Chỉ nằm trong bộ nhớ trang.
 */
import type { DisplayKind } from "../../../types";
import { PAIRING_TTL_MS } from "./pairing";

interface MockPairingCode {
  type: DisplayKind;
  expiresAt: number;
  consumed: boolean;
}

const codes = new Map<string, MockPairingCode>();

/** Sinh một mã 6 số chưa trùng. `expired: true` tạo mã đã hết hạn (để thử). */
export function createMockPairingCode(type: DisplayKind, opts: { expired?: boolean } = {}): { code: string; type: DisplayKind; expiresAt: string } {
  let code = "";
  do code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  while (codes.has(code));
  const expiresAt = opts.expired ? Date.now() - 1_000 : Date.now() + PAIRING_TTL_MS;
  codes.set(code, { type, expiresAt, consumed: false });
  return { code, type, expiresAt: new Date(expiresAt).toISOString() };
}

/** Dùng mã: true nếu mã tồn tại, đúng loại, chưa hết hạn, chưa dùng — và đánh dấu đã dùng. Sai bất kỳ điều nào → false (BE gộp chung). */
export function consumeMockPairingCode(code: string, type: DisplayKind): boolean {
  const entry = codes.get(code);
  if (!entry || entry.type !== type || entry.consumed || entry.expiresAt <= Date.now()) return false;
  entry.consumed = true;
  return true;
}
