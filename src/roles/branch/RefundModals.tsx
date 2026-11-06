import { useEffect, useRef, useState } from "react";
import { Alert, Button, Descriptions, Input, Modal } from "antd";
import { REFUND_NOTE_MAX, validateRefundNote } from "../../api/modules/order/paidCancel";
import { formatVnd } from "../../lib/reportFormat";
import type { CompleteRefundInput, OrderDetail, OrderRefundRecord } from "../../types";

interface CompleteProps {
  open: boolean;
  order: OrderDetail;
  refund: OrderRefundRecord;
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
