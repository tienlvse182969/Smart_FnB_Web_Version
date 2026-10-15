import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, App, Button, Card, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { describeApiError, orderApi, reportApi, showApiError } from "../../api";
import { formatDateTime, formatVnd, type DateRange } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { ChainRefundRow, CompleteRefundInput } from "../../types";
import { CompleteRefundModal } from "../branch/RefundModals";

/** Vai trò người huỷ: BE `8a315ad` chỉ trả vai trò, không trả tên (ghi api-contract-plan). */
const ROLE_LABEL: Record<string, string> = { MANAGER: "Quản lý chi nhánh", OWNER: "Chủ chuỗi", SYSTEM: "Hệ thống" };
export const requesterLabel = (role: string | null) => (role ? (ROLE_LABEL[role] ?? role) : "—");

interface Props {
  range: DateRange;
  /** Bỏ trống = mọi chi nhánh Owner được xem. */
  branchIds?: string[];
}

/**
 * OW-08 / BR-49 (#99): khoản chờ CHỦ CHUỖI hoàn trong phạm vi báo cáo. Đánh dấu "Đã hoàn" dùng hộp 7.6; KHÔNG khoá khi gói hết hạn
 * (QĐ 122) nên dùng `Button`, không dùng `ActionButton`. Lỗi tải chỉ nằm trong khối này, không ảnh hưởng báo cáo.
 */
export default function ChainPendingRefunds({ range, branchIds }: Props) {
  const { message } = App.useApp();
  const chainId = useAppStore((s) => s.chainId);
  const [rows, setRows] = useState<ChainRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ChainRefundRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const seq = useRef(0);
  const branchKey = (branchIds ?? []).join(",");

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const page = await reportApi.listPendingRefunds({
        chainId: chainId ?? undefined,
        branchIds: branchKey ? branchKey.split(",") : undefined,
        from: dayjs(range.from).startOf("day").toISOString(),
        to: dayjs(range.to).endOf("day").toISOString(),
      });
      if (mine !== seq.current) return;
      setRows(page.items);
    } catch (err) {
      if (mine !== seq.current) return;
      setRows([]);
      setError(describeApiError(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [chainId, branchKey, range.from, range.to]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load]);

  const submit = async (input: CompleteRefundInput) => {
    if (inFlight.current || !target || !chainId) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await orderApi.completeRefund({ chainId, branchId: target.branchId }, target.id, input);
      setTarget(null);
      message.success("Đã đánh dấu khoản hoàn là đã hoàn tiền.");
      await load();
    } catch (err) {
      showApiError(message.error, err, "Không đánh dấu được khoản hoàn. Thử lại sau.");
      setTarget(null);
      await load();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<ChainRefundRow> = [
    { title: "Mã đơn", dataIndex: "orderCode", render: (v: string) => <span style={{ fontFamily: "monospace" }}>{v}</span> },
    { title: "Chi nhánh", dataIndex: "branchName" },
    {
      title: "Số tiền",
      dataIndex: "amount",
      align: "right",
      render: (v: number) => (
        <b data-testid="chain-refund-amount" style={{ color: palette.warning.text }}>
          {formatVnd(v)}
        </b>
      ),
    },
    { title: "Lý do", dataIndex: "reason" },
    { title: "Người huỷ", dataIndex: "requestedByRole", render: (v: string | null) => requesterLabel(v) },
    { title: "Thời điểm", dataIndex: "requestedAt", width: 160, render: (v: string | null) => formatDateTime(v) },
    {
      title: "",
      key: "action",
      align: "right",
      width: 130,
      render: (_: unknown, row) => (
        <Button size="small" type="primary" data-testid="chain-refund-open" onClick={() => setTarget(row)}>
          Đã hoàn
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Khoản chờ chủ chuỗi hoàn"
      data-testid="chain-pending-refunds"
      style={{ borderRadius: 14, marginTop: 16 }}
      styles={{ body: { padding: 0 } }}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          style={{ margin: 16 }}
          message="Không tải được khoản chờ hoàn"
          description={error}
          action={
            <Button size="small" onClick={() => void load()}>
              Thử lại
            </Button>
          }
        />
      )}
      <Table<ChainRefundRow>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        scroll={{ x: 760 }}
        locale={{ emptyText: error ? "—" : "Không có khoản nào chờ hoàn trong phạm vi này." }}
      />
      {target && (
        <CompleteRefundModal
          open
          order={{ orderCode: target.orderCode }}
          refund={{ id: target.id, amount: target.amount, reason: target.reason }}
          submitting={submitting}
          onCancel={() => setTarget(null)}
          onSubmit={(input) => void submit(input)}
        />
      )}
    </Card>
  );
}
