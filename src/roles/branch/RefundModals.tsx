import { useEffect, useRef, useState } from "react";
import { Alert, Button, Checkbox, Descriptions, Input, Modal, Radio } from "antd";
import { refundMethodInfo } from "../../api/modules/order/codes";
import {
  CANCEL_REASON_MAX,
  REFUND_NOTE_MAX,
  cancellableLines,
  isWastageLine,
  refundAmountFor,
  validateCancelReason,
  validateRefundNote,
  type CancelTarget,
} from "../../api/modules/order/paidCancel";
import { formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";
import type { CancelPaidInput, CompleteRefundInput, OrderDetail, OrderRefundRecord } from "../../types";

interface CancelProps {
  open: boolean;
  order: OrderDetail;
  target: CancelTarget;
  /** Đang gửi request: khoá nút và không cho đóng. */
  submitting: boolean;
  onCancel: () => void;
  /** Cha lo gửi 1 lần, báo lỗi và GET lại chi tiết (cùng quy tắc quyết định 84). */
  onSubmit: (input: CancelPaidInput) => void;
}

type Step = "form" | "review";

/**
 * BM-06 (BR-28, BR-49): hộp huỷ đơn đã trả, hai bước — nhập (cách hoàn, món cần huỷ, lý do) rồi xem lại (tóm tắt số tiền phải hoàn).
 * Nền tảng không chuyển tiền: tiền mặt = quán trả khách ngay tại quầy rồi ghi đã hoàn; chuyển khoản = ghi khoản chờ hoàn, quán chuyển
 * xong thì "Đánh dấu đã hoàn". Đơn "Lệch số tiền" (nhận thiếu) chỉ huỷ được cả đơn và hoàn đúng số đã nhận.
 */
export function CancelPaidModal({ open, order, target, submitting, onCancel, onSubmit }: CancelProps) {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const sent = useRef(false);
  const lines = cancellableLines(order);
  const partialAllowed = target.kind === "paid" && lines.length > 1;

  useEffect(() => {
    if (open) {
      setStep("form");
      setMethod("CASH");
      setReason("");
      setSelected([]);
      setTouched(false);
      sent.current = false;
    }
  }, [open, order.id]);

  useEffect(() => {
    if (!submitting) sent.current = false;
  }, [submitting]);

  const amount = refundAmountFor(target, order.lines, selected);
  const reasonError = touched ? validateCancelReason(reason) : null;
  const ok = validateCancelReason(reason) === null;
  const wholeOrder = selected.length === 0 || selected.length === lines.length;

  const submit = () => {
    if (!ok || submitting || sent.current) return;
    sent.current = true;
    const input: CancelPaidInput = { reason: reason.trim(), refundMethod: method };
    if (partialAllowed && selected.length > 0) input.orderItemIds = selected;
    onSubmit(input);
  };

  const goReview = () => {
    setTouched(true);
    if (ok) setStep("review");
  };

  return (
    <Modal
      open={open}
      title={step === "form" ? "Huỷ đơn đã trả và ghi hoàn tiền" : "Xem lại trước khi huỷ"}
      onCancel={() => !submitting && onCancel()}
      maskClosable={false}
      destroyOnHidden
      data-testid="cancel-modal"
      footer={
        step === "form"
          ? [
              <Button key="cancel" onClick={onCancel} data-testid="cancel-close">
                Không huỷ
              </Button>,
              <Button key="next" type="primary" danger onClick={goReview} data-testid="cancel-next">
                Tiếp tục
              </Button>,
            ]
          : [
              <Button key="back" disabled={submitting} onClick={() => setStep("form")} data-testid="cancel-back">
                Quay lại
              </Button>,
              <Button key="ok" type="primary" danger loading={submitting} disabled={submitting || !ok} onClick={submit} data-testid="cancel-submit">
                {wholeOrder ? "Huỷ đơn" : "Huỷ các món đã chọn"} và ghi hoàn {formatVnd(amount)}
              </Button>,
            ]
      }
    >
      <div data-testid={step === "form" ? "cancel-step-form" : "cancel-step-review"}>
        <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
          <Descriptions.Item label="Mã đơn">{order.orderCode}</Descriptions.Item>
          <Descriptions.Item label="Số gọi">{order.callNumber ?? "—"}</Descriptions.Item>
          <Descriptions.Item label={target.kind === "mismatch" ? "Số tiền đã nhận (lệch)" : target.kind === "late" ? "Số tiền đã nhận (sau khi QR hết hạn)" : "Số tiền đã nhận"}>
            <b data-testid="cancel-received">{formatVnd(target.received)}</b>
          </Descriptions.Item>
          <Descriptions.Item label="Số tiền phải hoàn cho khách">
            <b data-testid="cancel-amount" style={{ color: palette.error.text }}>
              {formatVnd(amount)}
            </b>
          </Descriptions.Item>
          {step === "review" && (
            <>
              <Descriptions.Item label="Cách hoàn">
                <span data-testid="cancel-review-method">{refundMethodInfo(method).label}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Huỷ">
                <span data-testid="cancel-review-scope">
                  {wholeOrder ? "Cả đơn" : lines.filter((l) => selected.includes(l.id)).map((l) => `${l.name} ×${l.quantity}`).join(", ")}
                </span>
              </Descriptions.Item>
              {(wholeOrder ? lines : lines.filter((l) => selected.includes(l.id))).some(isWastageLine) && (
                <Descriptions.Item label="Hao hụt">
                  <span data-testid="cancel-review-wastage" style={{ color: palette.warning.text }}>
                    {(wholeOrder ? lines : lines.filter((l) => selected.includes(l.id))).filter(isWastageLine).map((l) => `${l.name} ×${l.quantity}`).join(", ")} đã pha xong, sẽ ghi hao hụt
                  </span>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Lý do">
                <span data-testid="cancel-review-reason">{reason.trim()}</span>
              </Descriptions.Item>
            </>
          )}
        </Descriptions>

        {target.kind === "mismatch" && (
          <Alert
            data-testid="cancel-mismatch-note"
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Đơn nhận thiếu tiền: huỷ cả đơn và hoàn lại đúng số đã nhận."
          />
        )}
        {target.kind === "late" && (
          <Alert
            data-testid="cancel-late-note"
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Tiền về sau khi mã QR hết hạn, đơn chưa được pha: huỷ cả đơn và hoàn lại đúng số đã nhận."
          />
        )}

        {step === "form" && (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Cách hoàn tiền <span style={{ color: palette.error.text }}>*</span>
              </div>
              <Radio.Group value={method} onChange={(e) => setMethod(e.target.value)} data-testid="cancel-method">
                <Radio value="CASH" data-testid="cancel-method-cash">
                  Tiền mặt tại quầy (ghi đã hoàn ngay)
                </Radio>
                <Radio value="BANK_TRANSFER" data-testid="cancel-method-bank">
                  Chuyển khoản (ghi chờ hoàn, đánh dấu sau khi chuyển)
                </Radio>
              </Radio.Group>
            </div>

            {partialAllowed && (
              <div data-testid="cancel-lines">
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Món cần huỷ (không chọn = huỷ cả đơn)</div>
                <Checkbox.Group value={selected} onChange={(v) => setSelected(v as string[])} style={{ display: "grid", gap: 6 }}>
                  {lines.map((l) => (
                    <Checkbox key={l.id} value={l.id} data-testid="cancel-line">
                      <span data-testid="cancel-line-text">
                        <b>{l.name}</b> ×{l.quantity} · {formatVnd(l.unitPrice)}/suất · {formatVnd(l.total)}
                      </span>
                      {l.options.length > 0 && (
                        <span data-testid="cancel-line-options" style={{ display: "block", fontSize: 12, color: palette.textMuted }}>
                          {l.options.map((o) => `${o.groupName ? `${o.groupName}: ` : ""}${o.name}${o.priceDelta ? ` (+${formatVnd(o.priceDelta)})` : ""}`).join(" · ")}
                        </span>
                      )}
                      {isWastageLine(l) && (
                        <span data-testid="cancel-line-wastage" style={{ display: "block", fontSize: 12, color: palette.warning.text }}>
                          Đã pha xong — huỷ sẽ ghi hao hụt
                        </span>
                      )}
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              </div>
            )}

            <div>
              <label htmlFor="cancel-reason" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Lý do huỷ <span style={{ color: palette.error.text }}>*</span>
              </label>
              <Input.TextArea
                id="cancel-reason"
                data-testid="cancel-reason"
                rows={3}
                maxLength={CANCEL_REASON_MAX}
                showCount
                placeholder="Ví dụ: Khách đổi ý, không nhận món"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setTouched(true)}
                status={reasonError ? "error" : undefined}
              />
              {reasonError && (
                <div data-testid="cancel-reason-error" style={{ color: palette.error.text, fontSize: 13, marginTop: 4 }}>
                  {reasonError}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "review" && (
          <Alert
            data-testid="cancel-reminder"
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
            message={
              method === "CASH"
                ? "Hãy trả lại khách tiền mặt tại quầy. Hệ thống ghi khoản này là ĐÃ hoàn và không hoàn tác được."
                : "Hệ thống không chuyển tiền. Sau khi chuyển khoản cho khách, hãy bấm “Đánh dấu đã hoàn” ở đơn này. Không hoàn tác được."
            }
          />
        )}
      </div>
    </Modal>
  );
}

interface CompleteProps {
  open: boolean;
  /** Chỉ cần mã đơn: khối "chờ chủ chuỗi hoàn" của Owner không có chi tiết đơn đầy đủ. */
  order: Pick<OrderDetail, "orderCode">;
  refund: Pick<OrderRefundRecord, "id" | "amount" | "reason">;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (input: CompleteRefundInput) => void;
}

/** BM-06 (BR-50): đánh dấu khoản hoàn chuyển khoản đã chi trả ngoài hệ thống. Ghi chú không bắt buộc (tối đa 500). */
export function CompleteRefundModal({ open, order, refund, submitting, onCancel, onSubmit }: CompleteProps) {
  const [note, setNote] = useState("");
  const sent = useRef(false);

  useEffect(() => {
    if (open) {
      setNote("");
      sent.current = false;
    }
  }, [open, refund.id]);

  useEffect(() => {
    if (!submitting) sent.current = false;
  }, [submitting]);

  const noteError = validateRefundNote(note);
  const submit = () => {
    if (noteError || submitting || sent.current) return;
    sent.current = true;
    onSubmit(note.trim() ? { note: note.trim() } : {});
  };

  return (
    <Modal
      open={open}
      title="Đánh dấu đã hoàn tiền"
      onCancel={() => !submitting && onCancel()}
      maskClosable={false}
      destroyOnHidden
      data-testid="complete-modal"
      footer={[
        <Button key="cancel" disabled={submitting} onClick={onCancel} data-testid="complete-close">
          Chưa hoàn
        </Button>,
        <Button key="ok" type="primary" loading={submitting} disabled={submitting || !!noteError} onClick={submit} data-testid="complete-submit">
          Đã chuyển khoản {formatVnd(refund.amount)}
        </Button>,
      ]}
    >
      <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
        <Descriptions.Item label="Mã đơn">{order.orderCode}</Descriptions.Item>
        <Descriptions.Item label="Số tiền đã hoàn">
          <b data-testid="complete-amount">{formatVnd(refund.amount)}</b>
        </Descriptions.Item>
        <Descriptions.Item label="Lý do huỷ">{refund.reason}</Descriptions.Item>
      </Descriptions>
      <label htmlFor="complete-note" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
        Ghi chú (không bắt buộc)
      </label>
      <Input.TextArea
        id="complete-note"
        data-testid="complete-note"
        rows={2}
        maxLength={REFUND_NOTE_MAX}
        showCount
        placeholder="Ví dụ: Đã chuyển khoản lúc 14:05, mã giao dịch …"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        status={noteError ? "error" : undefined}
      />
      <Alert type="warning" showIcon style={{ marginTop: 12 }} message="Chỉ đánh dấu khi đã chuyển khoản cho khách. Không hoàn tác được." />
    </Modal>
  );
}
