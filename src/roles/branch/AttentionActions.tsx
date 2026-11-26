import { useMemo, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { orderApi, showApiError, ApiError } from "../../api";
import {
  REFUND_NOTE_MIN,
  REFUND_REASON_LABEL,
  RESOLVE_NOTE_MIN,
  attentionPlan,
  linesRefundAmount,
  refundReasonValid,
} from "../../api/modules/order/attentionActions";
import { formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import type { OrderDetail, RefundReasonCode } from "../../types";

type Dialog =
  | { kind: "refund-all" }
  | { kind: "refund-lines" }
  | { kind: "resume" }
  | { kind: "resolve" }
  | null;

const REASON_OPTIONS = (
  Object.keys(REFUND_REASON_LABEL) as RefundReasonCode[]
).map((value) => ({ value, label: REFUND_REASON_LABEL[value] }));

/**
 * BM-05: khối "Xử lý đơn" trên chi tiết đơn cần xử lý. Hoàn tiền luôn là TIỀN MẶT (giống Thu ngân): Store Manager đưa tiền cho khách rồi
 * bấm xác nhận; BE ghi sổ quỹ và sinh phiếu hoàn. Sau mỗi thao tác màn GET lại chi tiết đơn (`onDone`). Xác nhận thủ công chuyển khoản
 * vẫn ở "Lịch sử thanh toán".
 */
export default function AttentionActions({
  order,
  hasConfirm,
  onDone,
}: {
  order: OrderDetail;
  hasConfirm: boolean;
  onDone: () => Promise<void>;
}) {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const { message } = App.useApp();
  const plan = useMemo(() => attentionPlan(order), [order]);

  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState<RefundReasonCode>("OTHER");
  const [note, setNote] = useState("");
  const [lineIds, setLineIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  if (!plan.needsAttention || !chainId || !branchId) return null;
  const scope = { chainId, branchId };
  const oos = plan.outOfStockLines;
  const hasAction = !!plan.refund || oos.length > 0 || plan.canResolve;
  // Chuyển thiếu (BR-28): BE không cho xác nhận thủ công, nên không gợi ý.
  const showConfirmHint =
    hasConfirm && !(plan.kind === "AMOUNT_MISMATCH" && plan.refund);
  if (!hasAction && !showConfirmHint) return null;

  const open = (next: Exclude<Dialog, null>) => {
    setReason(
      next.kind === "refund-lines"
        ? "OUT_OF_STOCK"
        : (plan.refund?.defaultReason ?? "OTHER"),
    );
    setNote("");
    setLineIds(oos.map((l) => l.id));
    setDialog(next);
  };
  const close = () => !saving && setDialog(null);

  const run = async (work: () => Promise<void>, success: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await work();
      setDialog(null);
      message.success(success);
      await onDone();
    } catch (err) {
      showApiError(message.error, err, "Không xử lý được đơn. Thử lại sau.");
      // 409/404: dữ liệu trên màn đã cũ (ai đó vừa xử lý) → đóng hộp và tải lại.
      if (
        err instanceof ApiError &&
        (err.status === 409 || err.status === 404)
      ) {
        setDialog(null);
        await onDone();
      }
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const refundAmount =
    dialog?.kind === "refund-lines"
      ? linesRefundAmount(order, lineIds)
      : (plan.refund?.amount ?? 0);
  const refundReady =
    refundAmount > 0 &&
    refundReasonValid(reason, note) &&
    (dialog?.kind !== "refund-lines" || lineIds.length > 0);

  const submitRefund = () =>
    run(
      () =>
        orderApi.attentionRefund(scope, order.id, {
          reasonCode: reason,
          note: note.trim() || undefined,
          orderItemIds: dialog?.kind === "refund-lines" ? lineIds : undefined,
        }),
      `Đã ghi nhận hoàn ${formatVnd(refundAmount)} tiền mặt cho khách.`,
    );
  const submitResume = () =>
    run(
      () =>
        orderApi.resumeOutOfStock(scope, order.id, {
          orderItemIds: lineIds,
          note: note.trim() || undefined,
        }),
      "Đã đưa món trở lại hàng chờ pha.",
    );
  const submitResolve = () =>
    run(
      () => orderApi.resolveAttention(scope, order.id, note),
      "Đã đánh dấu đơn là đã xử lý.",
    );

  const lineChooser = (
    <Checkbox.Group
      value={lineIds}
      onChange={(v) => setLineIds(v as string[])}
      style={{ display: "grid", gap: 6, marginBottom: 12 }}
      data-testid="attention-lines"
    >
      {oos.map((l) => (
        <Checkbox
          key={l.id}
          value={l.id}
          data-testid={`attention-line-${l.id}`}
        >
          {l.quantity} × {l.name} · {formatVnd(l.total)}
        </Checkbox>
      ))}
    </Checkbox.Group>
  );

  return (
    <Card
      title="Xử lý đơn"
      data-testid="attention-actions"
      style={{ borderRadius: 14, marginBottom: 16 }}
    >
      {hasAction && (
        <Space wrap>
          {plan.refund && (
            <Button
              type="primary"
              danger
              data-testid="attention-refund-open"
              onClick={() => open({ kind: "refund-all" })}
            >
              {plan.refund.label} · {formatVnd(plan.refund.amount)}
            </Button>
          )}
          {oos.length > 0 && (
            <>
              <Button
                data-testid="attention-refund-lines-open"
                onClick={() => open({ kind: "refund-lines" })}
              >
                Hoàn tiền món hết
              </Button>
              <Button
                data-testid="attention-resume-open"
                onClick={() => open({ kind: "resume" })}
              >
                Làm tiếp món (đã có hàng)
              </Button>
            </>
          )}
          {plan.canResolve && (
            <Button
              data-testid="attention-resolve-open"
              onClick={() => open({ kind: "resolve" })}
            >
              Đánh dấu đã xử lý
            </Button>
          )}
        </Space>
      )}
      {showConfirmHint && (
        <Typography.Paragraph
          type="secondary"
          style={{ margin: hasAction ? "10px 0 0" : 0, fontSize: 13 }}
          data-testid="attention-confirm-hint"
        >
          Tiền đã vào tài khoản của quán và đủ số? Dùng “Xác nhận thủ công” ở
          mục Lịch sử thanh toán để đơn xuống pha chế.
        </Typography.Paragraph>
      )}

      <Modal
        title={
          dialog?.kind === "refund-lines"
            ? "Hoàn tiền món hết"
            : (plan.refund?.label ?? "Hoàn tiền")
        }
        open={dialog?.kind === "refund-all" || dialog?.kind === "refund-lines"}
        onCancel={close}
        onOk={() => void submitRefund()}
        okText="Đã đưa tiền mặt cho khách"
        okButtonProps={
          {
            danger: true,
            disabled: !refundReady,
            "data-testid": "attention-refund-submit",
          } as never
        }
        confirmLoading={saving}
        destroyOnHidden
      >
        <div data-testid="attention-refund-dialog">
          {dialog?.kind === "refund-lines" && (
            <>
              <Typography.Text strong>Món hoàn tiền</Typography.Text>
              <div style={{ marginTop: 6 }}>{lineChooser}</div>
            </>
          )}
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={
              <span>
                Đưa{" "}
                <b data-testid="attention-refund-amount">
                  {formatVnd(refundAmount)}
                </b>{" "}
                tiền mặt cho khách rồi bấm xác nhận.
              </span>
            }
            description={
              dialog?.kind === "refund-lines"
                ? "Các món chọn bị huỷ; các món còn lại vẫn tiếp tục pha chế."
                : plan.refund?.cancelsOrder
                  ? "Đơn sẽ bị huỷ. Hoàn tiền mặt, ghi vào sổ quỹ ca và in phiếu hoàn; không hoàn tác được."
                  : "Hoàn tiền mặt, ghi vào sổ quỹ ca và in phiếu hoàn; không hoàn tác được."
            }
          />
          <Typography.Text strong>Lý do</Typography.Text>
          <Select<RefundReasonCode>
            value={reason}
            onChange={setReason}
            options={REASON_OPTIONS}
            style={{ width: "100%", margin: "6px 0 12px" }}
            data-testid="attention-refund-reason"
          />
          <Typography.Text strong>
            Ghi chú
            {reason === "OTHER"
              ? ` (bắt buộc, từ ${REFUND_NOTE_MIN} ký tự)`
              : " (tuỳ chọn)"}
          </Typography.Text>
          <Input.TextArea
            data-testid="attention-refund-note"
            rows={3}
            maxLength={450}
            showCount
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: khách đã về, trả lại tiền chuyển khoản"
            style={{ marginTop: 6 }}
          />
        </div>
      </Modal>

      <Modal
        title="Làm tiếp món"
        open={dialog?.kind === "resume"}
        onCancel={close}
        onOk={() => void submitResume()}
        okText="Đưa lại hàng chờ pha"
        okButtonProps={
          {
            disabled: lineIds.length === 0,
            "data-testid": "attention-resume-submit",
          } as never
        }
        confirmLoading={saving}
        destroyOnHidden
      >
        <div data-testid="attention-resume-dialog">
          <Typography.Paragraph>
            Chọn món đã có hàng trở lại. Món (hoặc tuỳ chọn) phải được mở bán
            lại trước, nếu không pha chế sẽ lại báo hết.
          </Typography.Paragraph>
          {lineChooser}
          <Input.TextArea
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)"
            data-testid="attention-resume-note"
          />
        </div>
      </Modal>

      <Modal
        title="Đánh dấu đã xử lý"
        open={dialog?.kind === "resolve"}
        onCancel={close}
        onOk={() => void submitResolve()}
        okText="Đánh dấu đã xử lý"
        okButtonProps={
          {
            disabled: note.trim().length < RESOLVE_NOTE_MIN,
            "data-testid": "attention-resolve-submit",
          } as never
        }
        confirmLoading={saving}
        destroyOnHidden
      >
        <div data-testid="attention-resolve-dialog">
          <Typography.Paragraph>
            Đơn không có lý do rõ ràng. Ghi lại bạn đã kiểm tra gì; đơn trở về
            trạng thái bình thường và ghi vào nhật ký.
          </Typography.Paragraph>
          <Input.TextArea
            rows={3}
            maxLength={500}
            showCount
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Từ ${RESOLVE_NOTE_MIN} ký tự, VD: đã kiểm tra với thu ngân, đơn bình thường`}
            data-testid="attention-resolve-note"
          />
        </div>
      </Modal>
    </Card>
  );
}
