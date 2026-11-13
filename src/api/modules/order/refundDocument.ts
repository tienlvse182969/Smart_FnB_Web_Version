import type { RefundDocument, RefundDocumentStatus } from "../../../types";

const STATUSES: readonly string[] = ["PENDING", "READY", "FAILED", "DISABLED"];
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function mapRefundDocument(raw: unknown, ids: { orderId: string; refundId: string }): RefundDocument {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const status = (typeof r.status === "string" && STATUSES.includes(r.status) ? r.status : "FAILED") as RefundDocumentStatus;
  return {
    refundId: ids.refundId,
    orderId: ids.orderId,
    status,
    fileName: str(r.fileName),
    generatedAt: str(r.generatedAt),
    errorMessage: str(r.errorMessage),
    downloadUrl: status === "READY" ? str(r.downloadUrl) : null,
    expiresAt: str(r.expiresAt),
  };
}

/** Link ký của S3/R2 là URL tuyệt đối (mở thẳng); local là đường dẫn của BE `/api/v1/...` (phải tải kèm Bearer). */
export const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

export const refundDocumentPath = (orderId: string, refundId: string) =>
  `/cashier/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}/document`;
