/**
 * PDF phiếu hoàn tiền (28.6, BR-86). BE `refund-documents.controller.ts`: `GET|POST retry|GET download` dưới
 * `cashier/orders/:orderId/refunds/:refundId/document` (OWNER, MANAGER, CASHIER; Manager trong chi nhánh, Owner trong chuỗi).
 */
export type RefundDocumentStatus = "PENDING" | "READY" | "FAILED" | "DISABLED";

export interface RefundDocument {
  refundId: string;
  orderId: string;
  /** DISABLED: máy chủ tắt tính năng sinh PDF (BE `enabled()` = false). */
  status: RefundDocumentStatus;
  fileName: string | null;
  generatedAt: string | null;
  errorMessage: string | null;
  /** Link ký (S3/R2, hết hạn sau 10 phút → `expiresAt`) hoặc đường dẫn tương đối của BE khi lưu local (cần Bearer). */
  downloadUrl: string | null;
  expiresAt: string | null;
}
