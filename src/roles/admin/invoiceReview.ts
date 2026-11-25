/**
 * Lý do hệ thống đưa một hoá đơn thuê bao ĐÃ TRẢ vào "Cần xem xét" thay vì tự kích hoạt/gia hạn (BR-71).
 * Mã lấy từ BE (`platform-billing.service.ts`, `platform-admin.service.ts`); mã lạ thì hiện nguyên mã.
 */
const REVIEW_REASONS: Record<string, string> = {
  SIGNED_AMOUNT_MISMATCH: "Số tiền PayOS báo về khác số tiền trên hoá đơn.",
  CHECKOUT_INVALIDATED_BEFORE_PAYMENT: "Khách trả bằng mã QR cũ đã bị huỷ hoặc thay bằng mã mới.",
  INVOICE_INVALIDATED_BEFORE_PAYMENT: "Hoá đơn kỳ tới đã bị huỷ (vd. đổi gói kỳ tới) trước khi khách trả.",
  SUBSCRIPTION_STATE_CHANGED: "Gói hoặc trạng thái thuê bao đã đổi sau khi tạo mã QR (vd. tạm ngưng, đổi gói).",
  AMOUNT_OR_ACTIVATION_STATE_MISMATCH: "Kỳ đầu: tiền lệch, link kích hoạt đã hết hạn hoặc gói được duyệt đã đổi trong lúc khách trả.",
};

export function reviewReasonText(code: string | null | undefined): string {
  if (!code) return "Không rõ lý do.";
  return REVIEW_REASONS[code] ?? code;
}
