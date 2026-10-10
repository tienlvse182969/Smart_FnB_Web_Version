import { useEffect, useRef, useState } from "react";
import { Alert, Button, Descriptions, Input, Modal } from "antd";
import {
  CONFIRM_AMOUNT_MAX,
  CONFIRM_REASON_MAX,
  CONFIRM_REF_MAX,
  CONFIRM_REMINDER,
  SHORT_RECEIVED_TEXT,
  canSubmitConfirm,
  checkReceived,
  parseVndInput,
  validateReason,
  validateRef,
} from "../../api/modules/order/manualConfirm";
import { formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import type { ConfirmPaymentInput, OrderDetail, OrderPaymentRecord } from "../../types";

interface Props {
  open: boolean;
  order: OrderDetail;
  payment: OrderPaymentRecord;
  /** Đang gửi request: khoá nút và không cho đóng. */
  submitting: boolean;
  onCancel: () => void;
  /** Gửi xác nhận. Cha lo gửi 1 lần, báo lỗi và GET lại chi tiết (quyết định 84). */
  onSubmit: (input: ConfirmPaymentInput) => void;
}

type Step = "form" | "review";

/**
 * BM-05 (quyết định 82–84): hộp xác nhận chuyển khoản thủ công, hai bước — nhập (lý do, số tiền thực nhận, mã giao dịch) rồi xem lại
 * (tóm tắt + nhắc kiểm tra tiền, GĐ-04). BR-28: nhận thiếu → không sang bước xem lại; nhận dư → "Phải trả lại khách".
 */
export default function ConfirmTransferModal({ open, order, payment, submitting, onCancel, onSubmit }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [reason, setReason] = useState("");
  const [received, setReceived] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [touched, setTouched] = useState(false);
  // Chống bấm đúp: state cập nhật bất đồng bộ nên giữ thêm một ref (cha cũng chặn).
  const sent = useRef(false);

  useEffect(() => {
    if (open) {
      setStep("form");
      setReason("");
      setTransactionRef("");
      setTouched(false);
      sent.current = false;
      // Khoản "Lệch số tiền": gợi ý số BE đã ghi nhận; Manager vẫn phải tự xác nhận con số thực nhận.
      setReceived(payment.status === "AMOUNT_MISMATCH" && payment.receivedAmount ? String(payment.receivedAmount) : "");
    }
  }, [open, payment.id, payment.status, payment.receivedAmount]);

  useEffect(() => {
    if (!submitting) sent.current = false;
  }, [submitting]);

  const expected = payment.amount;
  const receivedNumber = parseVndInput(received);
  const check = checkReceived(expected, receivedNumber);
  const reasonError = touched ? validateReason(reason) : null;
  const refError = validateRef(transactionRef);
  const overMax = receivedNumber !== null && receivedNumber > CONFIRM_AMOUNT_MAX;
  const ok = canSubmitConfirm(expected, { reason, received, transactionRef });

  const submit = () => {
    if (!ok || submitting || sent.current) return;
    sent.current = true;
    const input: ConfirmPaymentInput = { reason: reason.trim(), receivedAmount: receivedNumber as number };
    if (transactionRef.trim()) input.transactionRef = transactionRef.trim();
    onSubmit(input);
  };

  const goReview = () => {
    setTouched(true);
    if (ok) setStep("review");
  };

  const title = step === "form" ? "Xác nhận chuyển khoản thủ công" : "Xem lại trước khi xác nhận";

  return (
    <Modal
      open={open}
      title={title}
      onCancel={() => !submitting && onCancel()}
      maskClosable={false}
      destroyOnHidden
      data-testid="confirm-modal"
      footer={
        step === "form"
          ? [
              <Button key="cancel" onClick={onCancel} data-testid="confirm-cancel">
                Huỷ bỏ
              </Button>,
              <Button key="next" type="primary" disabled={check.kind === "short" || check.kind === "empty"} onClick={goReview} data-testid="confirm-next">
                Tiếp tục
              </Button>,
            ]
          : [
              <Button key="back" disabled={submitting} onClick={() => setStep("form")} data-testid="confirm-back">
                Quay lại
              </Button>,
              <Button key="ok" type="primary" loading={submitting} disabled={submitting || !ok} onClick={submit} data-testid="confirm-submit">
                Xác nhận đã nhận tiền
              </Button>,
            ]
      }
    >
      <div data-testid={step === "form" ? "confirm-step-form" : "confirm-step-review"}>
        <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
          <Descriptions.Item label="Mã đơn">{order.orderCode}</Descriptions.Item>
          <Descriptions.Item label="Số gọi">{order.callNumber ?? "Chưa cấp (cấp khi xác nhận)"}</Descriptions.Item>
          <Descriptions.Item label="Tổng đơn">
            <b data-testid="confirm-expected">{formatVnd(expected)}</b>
          </Descriptions.Item>
          {step === "review" && (
            <>
              <Descriptions.Item label="Số tiền thực nhận">
                <b data-testid="confirm-review-received">{formatVnd(receivedNumber ?? 0)}</b>
              </Descriptions.Item>
              {check.kind === "over" && (
                <Descriptions.Item label="Phải trả lại khách">
                  <b data-testid="confirm-review-change">{formatVnd(check.change)}</b>
                </Descriptions.Item>
              )}
              {transactionRef.trim() && <Descriptions.Item label="Mã giao dịch">{transactionRef.trim()}</Descriptions.Item>}
              <Descriptions.Item label="Lý do">
                <span data-testid="confirm-review-reason">{reason.trim()}</span>
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        {step === "form" && (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label htmlFor="confirm-received" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Số tiền thực nhận (₫) <span style={{ color: palette.error.text }}>*</span>
              </label>
              <Input
                id="confirm-received"
                data-testid="confirm-received"
                inputMode="numeric"
                autoComplete="off"
                suffix="₫"
                value={receivedNumber === null ? received : receivedNumber.toLocaleString("vi-VN")}
                onChange={(e) => setReceived(e.target.value.replace(/[^\d]/g, ""))}
                status={check.kind === "short" || overMax ? "error" : undefined}
              />
              <div data-testid="confirm-received-hint" style={{ marginTop: 6, fontSize: 13 }}>
                {check.kind === "short" && (
                  <Alert type="error" showIcon message={SHORT_RECEIVED_TEXT} data-testid="confirm-short" />
                )}
                {check.kind === "over" && !overMax && (
                  <span data-testid="confirm-change" style={{ color: palette.success.text }}>
                    Phải trả lại khách {formatVnd(check.change)}
                  </span>
                )}
                {check.kind === "exact" && <span style={{ color: palette.success.text }}>Đủ số tiền cần nhận.</span>}
                {overMax && <span style={{ color: palette.error.text }}>Số tiền quá lớn.</span>}
                {check.kind === "empty" && touched && <span style={{ color: palette.error.text }}>Vui lòng nhập số tiền thực nhận.</span>}
              </div>
            </div>

            <div>
              <label htmlFor="confirm-reason" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Lý do xác nhận <span style={{ color: palette.error.text }}>*</span>
              </label>
              <Input.TextArea
                id="confirm-reason"
                data-testid="confirm-reason"
                rows={3}
                maxLength={CONFIRM_REASON_MAX}
                showCount
                placeholder="Ví dụ: Khách chìa màn hình chuyển khoản thành công, webhook không về"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setTouched(true)}
                status={reasonError ? "error" : undefined}
              />
              {reasonError && (
                <div data-testid="confirm-reason-error" style={{ color: palette.error.text, fontSize: 13, marginTop: 4 }}>
                  {reasonError}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirm-ref" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Mã giao dịch ngân hàng (không bắt buộc)
              </label>
              <Input
                id="confirm-ref"
                data-testid="confirm-ref"
                autoComplete="off"
                maxLength={CONFIRM_REF_MAX}
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                status={refError ? "error" : undefined}
              />
            </div>
          </div>
        )}

        {step === "review" && (
          <Alert data-testid="confirm-reminder" type="warning" showIcon message={CONFIRM_REMINDER} style={{ marginTop: 8 }} />
        )}
      </div>
    </Modal>
  );
}
