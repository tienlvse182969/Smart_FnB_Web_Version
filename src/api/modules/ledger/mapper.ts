import type { Ledger, LedgerEntry, LedgerSummary } from "../../../types";
import { parseAmount } from "../../../lib/reportFormat";

/** BE `take: 500` (cash-ledger.service.ts). */
export const LEDGER_BE_LIMIT = 500;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function mapLedgerEntry(raw: unknown): LedgerEntry | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const occurredAt = str(raw.occurredAt);
  const direction = raw.direction === "OUTFLOW" ? "OUTFLOW" : raw.direction === "INFLOW" ? "INFLOW" : null;
  if (!id || !occurredAt || !direction) return null;
  const entry: LedgerEntry = {
    id,
    branchId: str(raw.branchId) ?? "",
    orderId: str(raw.orderId),
    direction,
    sourceType: str(raw.sourceType) ?? "",
    method: str(raw.paymentMethod),
    amount: Math.round(Math.abs(parseAmount(raw.amount as string | number | null))),
    occurredAt,
  };
  // Trường BE chưa trả (L6): chỉ gắn khi có.
  if ("orderCode" in raw) entry.orderCode = str(raw.orderCode);
  if (typeof raw.callNumber === "number") entry.callNumber = raw.callNumber;
  if ("actorName" in raw) entry.actorName = str(raw.actorName);
  if ("note" in raw) entry.note = str(raw.note);
  return entry;
}

const optionalAmount = (raw: Record<string, unknown>, key: string): number | undefined =>
  raw[key] === undefined || raw[key] === null ? undefined : Math.round(parseAmount(raw[key] as string | number));

export function mapLedgerSummary(raw: unknown): LedgerSummary {
  const s = isRecord(raw) ? raw : {};
  const summary: LedgerSummary = {
    inflow: Math.round(parseAmount(s.inflow as string | number | null)),
    outflow: Math.round(parseAmount(s.outflow as string | number | null)),
    net: Math.round(parseAmount(s.net as string | number | null)),
  };
  for (const key of ["cashIn", "qrIn", "cashOut", "cashNet"] as const) {
    const value = optionalAmount(s, key);
    if (value !== undefined) summary[key] = value;
  }
  return summary;
}

export function mapLedger(raw: unknown): Ledger {
  const body = isRecord(raw) ? raw : {};
  const items = (Array.isArray(body.items) ? body.items : []).map(mapLedgerEntry).filter((e): e is LedgerEntry => e !== null);
  return { items, summary: mapLedgerSummary(body.summary), mayBeTruncated: items.length >= LEDGER_BE_LIMIT };
}
