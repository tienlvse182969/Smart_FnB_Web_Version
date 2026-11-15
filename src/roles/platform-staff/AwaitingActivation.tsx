import { App, Table, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { platformStaffApi, type AwaitingActivation } from "../../api/platformStaff";
import { showApiError } from "../../api";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { palette } from "../../theme";

const PAGE_SIZE = 10;
const SOON_MS = 48 * 60 * 60_000;

/** Trạng thái QR kỳ đầu: "đã tạo QR" là đã sinh link PayOS, KHÔNG phải đã thanh toán. */
export function qrLabel(qr: AwaitingActivation["firstPeriodQr"]): { text: string; color: string } {
  if (qr.paid) return { text: "Đã thanh toán — đang kích hoạt", color: "success" };
  if (qr.needsReview) return { text: "Thanh toán lệch — chờ Admin xác nhận", color: "warning" };
  if (qr.created) return { text: "Đã tạo QR, chưa thanh toán", color: "processing" };
  return { text: "Chưa tạo QR", color: "default" };
}

function linkLabel(row: AwaitingActivation) {
  if (row.linkExpired) return <Tag color="error">Link đã hết hạn</Tag>;
  const left = row.activationExpiresAt ? new Date(row.activationExpiresAt).getTime() - Date.now() : 0;
  return left < SOON_MS ? <Tag color="warning">Sắp hết hạn</Tag> : null;
}

/**
 * PS-01 / 30.3 "Đã duyệt — chờ kích hoạt": để Platform Staff chủ động liên hệ khách sắp hết hạn link.
 * Chỉ dữ liệu hồ sơ và thanh toán nền tảng (BR-07). Bấm một dòng để mở chi tiết (đổi gói, gửi lại link — bắt buộc ghi chú).
 */
export default function AwaitingActivationTable({ search, reloadKey, onOpen }: { search?: string; reloadKey?: unknown; onOpen: (id: string) => void }) {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof platformStaffApi.listAwaitingActivation>>>();
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPage(1); }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await platformStaffApi.listAwaitingActivation({ page, limit: PAGE_SIZE, search })); }
    catch (err) { showApiError(message.error, err, "Không tải được danh sách chờ kích hoạt"); }
    finally { setLoading(false); }
  }, [page, search, message]);
  useEffect(() => { void load(); }, [load, reloadKey]);

  return (
    <Table<AwaitingActivation>
      data-testid="awaiting-activation"
      rowKey="id"
      size="middle"
      loading={loading}
      dataSource={data?.items ?? []}
      scroll={{ x: 980 }}
      pagination={{ current: data?.pagination.page ?? page, pageSize: PAGE_SIZE, total: data?.pagination.total ?? 0, showSizeChanger: false, onChange: setPage }}
      onRow={(r) => ({ onClick: () => onOpen(r.id), style: { cursor: "pointer" } })}
      locale={{ emptyText: "Không có hồ sơ nào đang chờ kích hoạt" }}
      columns={[
        { title: "Hồ sơ", render: (_, r) => <div><div style={{ fontWeight: 600 }}>{r.businessName}</div><div style={{ fontSize: 12, color: palette.textSubtle }}>{r.applicationCode} · {r.representativeName}</div><div style={{ fontSize: 12, color: palette.textSubtle }}>{r.representativeEmail} · {r.representativePhone}</div></div> },
        { title: "Gói", render: (_, r) => r.approvedPlan ? <div>{r.approvedPlan.name}<div style={{ fontSize: 12, color: palette.textSubtle }}>{formatVnd(r.approvedPlan.monthlyPrice)}/tháng</div></div> : "—" },
        { title: "Gửi link", render: (_, r) => (r.activationSentAt ? formatDateTime(r.activationSentAt) : "—") },
        { title: "Hạn link", render: (_, r) => <div>{r.activationExpiresAt ? formatDateTime(r.activationExpiresAt) : "—"}<div>{linkLabel(r)}</div></div> },
        { title: "Mở link gần nhất", render: (_, r) => (r.activationLastOpenedAt ? formatDateTime(r.activationLastOpenedAt) : <span style={{ color: palette.textSubtle }}>Chưa mở</span>) },
        { title: "QR kỳ đầu", render: (_, r) => { const q = qrLabel(r.firstPeriodQr); return <div><Tag color={q.color}>{q.text}</Tag>{r.firstPeriodQr.createdAt && <div style={{ fontSize: 12, color: palette.textSubtle }}>{formatDateTime(r.firstPeriodQr.createdAt)}</div>}</div>; } },
      ]}
    />
  );
}
