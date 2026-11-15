import { request } from "./http/client";
import { parseAmount } from "../lib/reportFormat";

/** Mục 32 / BM-07 / OW-08: sổ giao dịch chỉ-thêm của chi nhánh và tổng sổ của chuỗi (`GET …/cash-ledger`). */
export type LedgerDirection = "INFLOW" | "OUTFLOW";
export type LedgerSource = "CASH_PAYMENT" | "PAYOS_WEBHOOK" | "PAYOS_RECHECK" | "MANUAL_CONFIRMATION" | "REFUND";

export interface LedgerSummary {
  cashCollected: number;
  qrCollected: number;
  cashRefunded: number;
  netCash: number;
  netTotal: number;
}

export interface LedgerEntry {
  id: string;
  direction: LedgerDirection;
  sourceType: LedgerSource;
  paymentMethod: string | null;
  amount: number;
  occurredAt: string;
  branch: { id: string; code: string; name: string } | null;
  orderCode: string | null;
  callNumber: number | null;
  actorName: string | null;
  note: string | null;
}

export interface LedgerPage {
  items: LedgerEntry[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: LedgerSummary;
  branches: { branch: { id: string; code: string; name: string }; summary: LedgerSummary }[];
}

export interface LedgerQuery {
  /** Ngày `YYYY-MM-DD` theo giờ Việt Nam, tính trọn ngày. */
  from: string;
  to: string;
  direction?: LedgerDirection;
  paymentMethod?: string;
  page?: number;
  pageSize?: number;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const money = (v: unknown) => parseAmount(v as string | number | null | undefined);

function mapSummary(raw: unknown): LedgerSummary {
  const s = obj(raw);
  return { cashCollected: money(s.cashCollected), qrCollected: money(s.qrCollected), cashRefunded: money(s.cashRefunded), netCash: money(s.netCash), netTotal: money(s.netTotal) };
}

function actorName(raw: unknown): string | null {
  const a = obj(raw);
  const name = [a.firstName, a.lastName].filter((x) => typeof x === "string" && x).join(" ").trim();
  return name || (typeof a.employeeCode === "string" ? a.employeeCode : null);
}

export function mapLedger(raw: unknown): LedgerPage {
  const body = obj(raw);
  const pagination = obj(body.pagination);
  return {
    items: (Array.isArray(body.items) ? body.items : []).map((item) => {
      const r = obj(item);
      const branch = obj(r.branch);
      return {
        id: String(r.id ?? ""),
        direction: r.direction === "OUTFLOW" ? "OUTFLOW" : "INFLOW",
        sourceType: (r.sourceType as LedgerSource) ?? "CASH_PAYMENT",
        paymentMethod: typeof r.paymentMethod === "string" ? r.paymentMethod : null,
        amount: money(r.amount),
        occurredAt: String(r.occurredAt ?? ""),
        branch: branch.id ? { id: String(branch.id), code: String(branch.code ?? ""), name: String(branch.name ?? "") } : null,
        orderCode: typeof r.orderCode === "string" ? r.orderCode : null,
        callNumber: typeof r.callNumber === "number" ? r.callNumber : null,
        actorName: actorName(r.actor),
        note: typeof r.note === "string" ? r.note : null,
      };
    }),
    pagination: { page: Number(pagination.page ?? 1), pageSize: Number(pagination.pageSize ?? 50), total: Number(pagination.total ?? 0), totalPages: Number(pagination.totalPages ?? 0) },
    summary: mapSummary(body.summary),
    branches: (Array.isArray(body.branches) ? body.branches : []).map((row) => {
      const r = obj(row);
      const branch = obj(r.branch);
      return { branch: { id: String(branch.id ?? ""), code: String(branch.code ?? ""), name: String(branch.name ?? "") }, summary: mapSummary(r.summary) };
    }),
  };
}

/** Trọn ngày theo giờ Việt Nam: BE nhận mốc thời gian, không nhận ngày. */
export function ledgerSearch(query: LedgerQuery) {
  const params = new URLSearchParams({
    from: `${query.from}T00:00:00.000+07:00`,
    to: `${query.to}T23:59:59.999+07:00`,
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 50),
  });
  if (query.direction) params.set("direction", query.direction);
  if (query.paymentMethod) params.set("paymentMethod", query.paymentMethod);
  return `?${params}`;
}

export const cashLedgerApi = {
  async branch(branchId: string, query: LedgerQuery) {
    return mapLedger(await request(`/branches/${branchId}/cash-ledger${ledgerSearch(query)}`));
  },
  async chain(chainId: string, query: LedgerQuery) {
    return mapLedger(await request(`/restaurant-chains/${chainId}/cash-ledger${ledgerSearch(query)}`));
  },
};
