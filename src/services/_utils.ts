/** Tiện ích dùng chung cho service layer. */

/** Mô phỏng độ trễ mạng 150–300ms. */
export function delay(ms = rand(150, 300)): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Sinh chuỗi ID ngẫu nhiên. */
export function newId(): string {
  return `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Sinh ID ngẫu nhiên với prefix. */
export function genId(prefix: string): string {
  return `${prefix}-${newId()}`;
}

/** Giờ hiện tại dạng "HH:MM" (dùng cho timestamp demo). */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** ISO string hiện tại. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Số phút đã trôi qua kể từ một mốc ISO string, làm tròn, không âm. */
export function minutesSinceISO(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}
