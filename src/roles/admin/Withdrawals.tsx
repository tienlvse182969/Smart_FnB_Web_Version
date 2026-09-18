import { useEffect, useState } from "react";
import { App, Button, Card, Drawer, Input, Table, Tag } from "antd";
import { Ban, Banknote, CheckCircle2, XCircle } from "lucide-react";
import type { Tenant, WithdrawalRequest, WithdrawalStatus } from "../../types";
import {
  approveWithdrawalRequest,
  failWithdrawalRequest,
  listTenants,
  listWithdrawalRequests,
  markWithdrawalPaid,
  rejectWithdrawalRequest,
} from "../../services";
import { money } from "../../data";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

const STATUS_META: Record<WithdrawalStatus, { label: string; color: string }> = {
  pending: { label: "Chờ duyệt", color: "gold" },
  approved: { label: "Đã duyệt · chờ chuyển", color: "blue" },
  paid: { label: "Đã chuyển khoản", color: "green" },
  rejected: { label: "Bị từ chối", color: "red" },
  cancelled: { label: "Đã huỷ", color: "default" },
  failed: { label: "Chuyển thất bại", color: "red" },
};

/** PA-09: Platform Admin duyệt/từ chối/xác nhận chuyển khoản cho mọi doanh nghiệp. */
export default function Withdrawals() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [failReason, setFailReason] = useState("");
  const [bankTxnRef, setBankTxnRef] = useState("");
  const [showRejectFor, setShowRejectFor] = useState<string | null>(null);
  const [showFailFor, setShowFailFor] = useState<string | null>(null);
  const [showPaidFor, setShowPaidFor] = useState<string | null>(null);

  const tenantName = (id: string) => tenants.find((t) => t.id === id)?.name ?? id;
  const sel = requests.find((r) => r.id === selId) ?? null;

  const load = async () => {
    setRequests(await listWithdrawalRequests("admin"));
    setTenants(await listTenants());
  };
  useEffect(() => {
    load();
  }, []);

  const actorEmail = currentUser?.email ?? "admin@platform.vn";

  const doApprove = async (id: string) => {
    await approveWithdrawalRequest(id, actorEmail, "admin");
    message.success("Đã duyệt yêu cầu rút");
    await load();
  };

  const doReject = async () => {
    if (!showRejectFor) return;
    try {
      await rejectWithdrawalRequest(showRejectFor, rejectReason, actorEmail, "admin");
      message.success("Đã từ chối — tiền trả về số dư khả dụng");
      setShowRejectFor(null);
      setRejectReason("");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không từ chối được");
    }
  };

  const doFail = async () => {
    if (!showFailFor) return;
    try {
      await failWithdrawalRequest(showFailFor, failReason, actorEmail, "admin");
      message.success("Đã đánh dấu chuyển thất bại — tiền trả về số dư khả dụng");
      setShowFailFor(null);
      setFailReason("");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không thực hiện được");
    }
  };

  const doMarkPaid = async () => {
    if (!showPaidFor) return;
    try {
      await markWithdrawalPaid(showPaidFor, bankTxnRef, actorEmail, "admin");
      message.success("Đã xác nhận chuyển khoản");
      setShowPaidFor(null);
      setBankTxnRef("");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không xác nhận được");
    }
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Yêu cầu rút tiền" sub="Duyệt, từ chối (bắt buộc lý do) hoặc xác nhận đã chuyển khoản (bắt buộc mã GD)" />
      <Table<WithdrawalRequest>
        dataSource={requests}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        size="middle"
        onRow={(r) => ({ onClick: () => setSelId(r.id), style: { cursor: "pointer" } })}
        columns={[
          { title: "Doanh nghiệp", dataIndex: "tenantId", render: tenantName },
          { title: "Ngày tạo", dataIndex: "createdAt", render: (v) => new Date(v).toLocaleString("vi-VN") },
          { title: "Số tiền", dataIndex: "amount", align: "right", render: money },
          { title: "Tài khoản nhận", key: "acc", render: (_, r) => `${r.payoutAccountSnapshot.bankName} · ${r.payoutAccountSnapshot.accountNumber}` },
          { title: "Trạng thái", dataIndex: "status", render: (s: WithdrawalStatus) => <Tag color={STATUS_META[s].color}>{STATUS_META[s].label}</Tag> },
        ]}
      />

      <Drawer title={sel ? `Yêu cầu ${sel.id}` : ""} open={!!sel} onClose={() => setSelId(null)} styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}>
        {sel && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{money(sel.amount)}</div>
            <div style={{ fontSize: 13, color: "#71717a", marginBottom: 16 }}>{tenantName(sel.tenantId)}</div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>
              Nhận tại: <b>{sel.payoutAccountSnapshot.bankName} · {sel.payoutAccountSnapshot.accountNumber}</b>
            </div>
            <div style={{ fontSize: 12.5, color: "#a1a1aa", marginBottom: 20 }}>{sel.payoutAccountSnapshot.accountName}</div>

            {sel.rejectReason && (
              <div style={{ background: "#fff1f0", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, color: "#cf1322", marginBottom: 16 }}>
                Lý do: {sel.rejectReason}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sel.status === "pending" && (
                <>
                  <Button type="primary" icon={<CheckCircle2 size={16} />} onClick={() => doApprove(sel.id)}>
                    Duyệt yêu cầu
                  </Button>
                  <Button danger icon={<Ban size={16} />} onClick={() => setShowRejectFor(sel.id)}>
                    Từ chối
                  </Button>
                </>
              )}
              {sel.status === "approved" && (
                <>
                  <Button type="primary" icon={<Banknote size={16} />} onClick={() => setShowPaidFor(sel.id)}>
                    Xác nhận đã chuyển khoản
                  </Button>
                  <Button danger icon={<XCircle size={16} />} onClick={() => setShowFailFor(sel.id)}>
                    Đánh dấu chuyển thất bại
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </Drawer>

      <Drawer title="Từ chối yêu cầu rút" open={!!showRejectFor} onClose={() => setShowRejectFor(null)} styles={{ wrapper: { width: 380 }, body: { padding: 24 } }}>
        <Input.TextArea rows={3} placeholder="Lý do từ chối (bắt buộc)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ marginBottom: 12 }} />
        <Button type="primary" danger block disabled={!rejectReason.trim()} onClick={doReject}>
          Xác nhận từ chối
        </Button>
      </Drawer>

      <Drawer title="Đánh dấu chuyển thất bại" open={!!showFailFor} onClose={() => setShowFailFor(null)} styles={{ wrapper: { width: 380 }, body: { padding: 24 } }}>
        <Input.TextArea rows={3} placeholder="Lý do thất bại (bắt buộc)" value={failReason} onChange={(e) => setFailReason(e.target.value)} style={{ marginBottom: 12 }} />
        <Button type="primary" danger block disabled={!failReason.trim()} onClick={doFail}>
          Xác nhận thất bại
        </Button>
      </Drawer>

      <Drawer title="Xác nhận đã chuyển khoản" open={!!showPaidFor} onClose={() => setShowPaidFor(null)} styles={{ wrapper: { width: 380 }, body: { padding: 24 } }}>
        <Input placeholder="Mã giao dịch ngân hàng (bắt buộc)" value={bankTxnRef} onChange={(e) => setBankTxnRef(e.target.value)} style={{ marginBottom: 12 }} />
        <Button type="primary" block disabled={!bankTxnRef.trim()} onClick={doMarkPaid}>
          Xác nhận
        </Button>
      </Drawer>
    </Card>
  );
}
