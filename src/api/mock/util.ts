/** Tiện ích dùng chung cho các bản mock. */

/** Sinh chuỗi ID ngẫu nhiên. */
export function newId(): string {
  return `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Sinh ID ngẫu nhiên với prefix. */
export function genId(prefix: string): string {
  return `${prefix}-${newId()}`;
}

/** ISO string hiện tại. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Số nguyên ngẫu nhiên trong [min, max]. */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
