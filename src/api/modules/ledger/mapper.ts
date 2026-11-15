import type { Ledger, LedgerBranchSummary, LedgerEntry, LedgerSummary } from "../../../types";
import { parseAmount } from "../../../lib/reportFormat";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const int = (v: unknown): number => Math.round(parseAmount(v as string | number | null | undefined));

function person(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  const name = [str(raw.firstName), str(raw.lastName)].filter(Boolean).join(" ").trim();
  return name || str(raw.employeeCode);
}

export function mapLedgerEntry(raw: unknown): LedgerEntry | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const occurredAt = str(raw.occurredAt);
  const direction = raw.direction === "OUTFLOW" ? "OUTFLOW" : raw.direction === "INFLOW" ? "INFLOW" : null;
  if (!id || !occurredAt || !direction) return null;
  const branch = isRecord(raw.branch) ? raw.branch : {};
  return {
    id,
    branchId: str(branch.id) ?? "",
    direction,
    sourceType: str(raw.sourceType) ?? "",
    method: str(raw.paymentMethod),
    amount: Math.abs(int(raw.amount)),
    occurredAt,
    businessDate: str(raw.businessDate)?.slice(0, 10) ?? null,
    orderCode: str(raw.orderCode),
    callNumber: typeof raw.callNumber === "number" ? raw.callNumber : null,
    actorName: person(raw.actor),
    note: str(raw.note) ?? str(raw.refundReason),
  };
}

export function mapLedgerSummary(raw: unknown): LedgerSummary {
  const s = isRecord(raw) ? raw : {};
  return {
    cashCollected: int(s.cashCollected),
    qrCollected: int(s.qrCollected),
    cashRefunded: int(s.cashRefunded),
    netCash: int(s.netCash),
    netTotal: int(s.netTotal),
  };
}

export function mapLedger(raw: unknown): Ledger {
  const body = isRecord(raw) ? raw : {};
  const items = (Array.isArray(body.items) ? body.items : []).map(mapLedgerEntry).filter((e): e is LedgerEntry => e !== null);
  const p = isRecord(body.pagination) ? body.pagination : {};
  const branches = (Array.isArray(body.branches) ? body.branches : []).flatMap((b): LedgerBranchSummary[] => {
    const branch = isRecord(b) && isRecord(b.branch) ? b.branch : null;
    const id = branch ? str(branch.id) : null;
    if (!branch || !id) return [];
    return [{ branchId: id, code: str(branch.code) ?? "", name: str(branch.name) ?? "", summary: mapLedgerSummary((b as Record<string, unknown>).summary) }];
  });
  return {
    items,
    pagination: { page: int(p.page) || 1, pageSize: int(p.pageSize) || 50, total: int(p.total), totalPages: int(p.totalPages) },
    summary: mapLedgerSummary(body.summary),
    branches,
  };
}
