/**
 * Lưu mock nhận diện qua F5 — CHỈ khi cờ `branding` = mock (như `options/persist.ts`). localStorage `smartfnb:mock:branding:v1:<chainId>`;
 * mọi truy cập bọc try/catch, đọc lỗi hoặc dữ liệu hỏng thì dùng dữ liệu sinh sẵn.
 */
import type { Branding } from "../../../types";
import { modeOf } from "../../flags";

export const BRANDING_STORAGE_PREFIX = "smartfnb:mock:branding:v1:";
const keyOf = (chainId: string) => BRANDING_STORAGE_PREFIX + chainId;
const enabled = () => modeOf("branding") === "mock";

export function loadPersistedBranding(chainId: string): Branding | null {
  if (!enabled()) return null;
  try {
    const raw = localStorage.getItem(keyOf(chainId));
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Branding>;
    if (!data || typeof data.primaryColor !== "string" || typeof data.accentColor !== "string" || typeof data.displayName !== "string") return null;
    return { tenantId: chainId, displayName: data.displayName, logoUrl: data.logoUrl, primaryColor: data.primaryColor, accentColor: data.accentColor, isCustom: data.isCustom === true, ...(typeof data.lookCustom === "boolean" && { lookCustom: data.lookCustom }) };
  } catch {
    return null;
  }
}

export function savePersistedBranding(chainId: string, branding: Branding): void {
  if (!enabled()) return;
  try {
    localStorage.setItem(keyOf(chainId), JSON.stringify(branding));
  } catch {
    // Đầy bộ nhớ, chế độ riêng tư, bị chặn: bỏ qua, dữ liệu vẫn nằm trong bộ nhớ phiên.
  }
}

export function removePersistedBranding(chainId: string): void {
  try {
    localStorage.removeItem(keyOf(chainId));
  } catch {
    // bỏ qua
  }
}

/** Xoá mọi nhận diện mock đã lưu (mọi chuỗi). Dùng cho nút xoá dữ liệu mock của MockPanel. */
export function clearPersistedBranding(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(BRANDING_STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // bỏ qua
  }
}
