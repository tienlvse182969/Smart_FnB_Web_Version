import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, DatePicker, Input, Modal, Select, Table, Tabs, Tag } from "antd";
import { Banknote, Clock, Info, Plus, Wallet as WalletIcon } from "lucide-react";
import type { Dayjs } from "dayjs";
import type { LedgerEntry, LedgerEntryType, Payment, PayoutAccount, SettlementBatch, WithdrawalRequest, WithdrawalStatus } from "../../types";
import {
  createPayoutAccount,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
  getSettlementBatchDetail,
  getWalletBalance,
  listLedger,
  listPayments,
  listPayoutAccounts,
  listSettlementBatches,
  listWithdrawalRequests,
  updatePayoutAccount,
  type SettlementBatchDetail,
  type WalletBalance,
} from "../../services";
import { money } from "../../data";
import { SectionTitle, StatCard } from "../../components/bits";
import { useAppStore } from "../../store";

const LEDGER_TYPE_LABEL: Record<LedgerEntryType, string> = {
  hold: "Tạm giữ (thu QR)",
  settle: "Quyết toán",
  fee: "Phí dịch vụ",
  refund: "Hoàn tiền (GĐ2)",
  withdraw_hold: "Giữ để rút",
  withdraw_release: "Trả lại (huỷ/từ chối)",
  withdraw_paid: "Đã chuyển khoản",
};

const WITHDRAW_STATUS_META: Record<WithdrawalStatus, { label: string; color: string }> = {
  pending: { label: "Chờ duyệt", color: "gold" },
  approved: { label: "Đã duyệt · chờ chuyển", color: "blue" },
  paid: { label: "Đã chuyển khoản", color: "green" },
  rejected: { label: "Bị từ chối", color: "red" },
  cancelled: { label: "Đã huỷ", color: "default" },
  failed: { label: "Chuyển thất bại", color: "red" },
};

/** OW-08/12/13: Ví doanh nghiệp — số dư (BR-34), sổ cái, lịch sử quyết toán, tài khoản nhận tiền, yêu cầu rút. */
export default function Wallet() {
  return (
    <div>
      <SectionTitle title="Ví doanh nghiệp" sub="Mọi số dư tính từ sổ cái — không có chỗ nào sửa trực tiếp (BR-34)" />
      <Tabs
        items={[
          { key: "overview", label: "Tổng quan", children: <Overview /> },
          { key: "payout", label: "Tài khoản nhận tiền", children: <PayoutAccounts /> },
          { key: "withdraw", label: "Yêu cầu rút", children: <WithdrawRequests /> },
        ]}
      />
    </div>
  );
}

/* ============================ TỔNG QUAN ============================ */

function Overview() {
  const currentUser = useAppStore((s) => s.currentUser);
  const branches = useAppStore((s) => s.branches);
  const tenantId = currentUser?.tenantId ?? null;

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [batchDetails, setBatchDetails] = useState<Record<string, SettlementBatchDetail>>({});
  const [payments, setPayments] = useState<Payment[]>([]);

  const [branchFilter, setBranchFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | undefined>();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  useEffect(() => {
    if (!tenantId || !currentUser) return;
    getWalletBalance(tenantId, currentUser.role).then(setBalance);
    listLedger(tenantId, currentUser.role).then(setLedger);
    listPayments(undefined, tenantId).then(setPayments);
    listSettlementBatches(tenantId, currentUser.role).then(async (list) => {
      setBatches(list);
      const details = await Promise.all(list.map((b) => getSettlementBatchDetail(b.id, currentUser.role)));
      setBatchDetails(Object.fromEntries(details.filter((d): d is SettlementBatchDetail => !!d).map((d) => [d.batch.id, d])));
    });
  }, [tenantId, currentUser]);

  const filteredLedger = ledger.filter((e) => {
    if (branchFilter && e.branchId !== branchFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (dateRange) {
      const t = new Date(e.createdAt).getTime();
      if (t < dateRange[0].startOf("day").valueOf() || t > dateRange[1].endOf("day").valueOf()) return false;
    }
    return true;
  });

  const confirmed = payments.filter((p) => p.status === "confirmed");
  const totalRevenue = confirmed.reduce((s, p) => s + p.amount, 0);
  const qrRevenue = confirmed.filter((p) => p.method === "qr").reduce((s, p) => s + p.amount, 0);
  const cashRevenue = confirmed.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        <StatCard label="Số dư tạm giữ" value={money(balance?.heldBalance ?? 0)} hint="chưa đủ thời gian tạm giữ" icon={<Clock size={18} />} />
        <StatCard label="Số dư khả dụng" value={money(balance?.availableBalance ?? 0)} hint="được phép tạo yêu cầu rút" icon={<WalletIcon size={18} />} emphasis />
        <StatCard label="Đang chờ rút" value={money(balance?.pendingWithdraw ?? 0)} hint="đã tạo yêu cầu, chưa xử lý xong" icon={<Banknote size={18} />} />
      </div>

      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#52525b" }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Doanh thu đã xác nhận: <b>{money(totalRevenue)}</b> (QR {money(qrRevenue)} · Tiền mặt {money(cashRevenue)}).
            Chỉ QR chảy vào ví doanh nghiệp — tiền mặt nằm trong két chi nhánh, không đi qua nền tảng. Vì vậy doanh thu luôn ≥ tiền vào ví.
          </div>
        </div>
      </Card>

      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle title="Sổ cái" sub="Lọc theo chi nhánh, loại bút toán và khoảng thời gian" />
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <Select
            allowClear
            placeholder="Tất cả chi nhánh"
            style={{ width: 200 }}
            value={branchFilter}
            onChange={setBranchFilter}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
          />
          <Select
            allowClear
            placeholder="Tất cả loại bút toán"
            style={{ width: 220 }}
            value={typeFilter}
            onChange={setTypeFilter}
            options={Object.entries(LEDGER_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <DatePicker.RangePicker value={dateRange} onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)} />
        </div>
        <Table<LedgerEntry>
          dataSource={filteredLedger}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Thời gian", dataIndex: "createdAt", render: (v) => new Date(v).toLocaleString("vi-VN") },
            { title: "Loại", dataIndex: "type", render: (t: LedgerEntryType) => LEDGER_TYPE_LABEL[t] },
            { title: "Chi nhánh", dataIndex: "branchId", render: (id?: string) => branches.find((b) => b.id === id)?.name ?? "—" },
            { title: "Số tiền", dataIndex: "amount", align: "right", render: money },
            { title: "Ghi chú", dataIndex: "note", ellipsis: true },
          ]}
        />
      </Card>

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle title="Lịch sử quyết toán" sub="Tổng thu, đã hoàn, phí và thực nhận của từng đợt" />
        <Table<SettlementBatch>
          dataSource={batches}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            { title: "Ngày quyết toán", dataIndex: "settledAt", render: (v) => (v ? new Date(v).toLocaleString("vi-VN") : "—") },
            { title: "Tổng thu", key: "gross", align: "right", render: (_, r) => money(batchDetails[r.id]?.grossCollected ?? 0) },
            { title: "Đã hoàn (GĐ2)", key: "refund", align: "right", render: (_, r) => money(batchDetails[r.id]?.totalRefunded ?? 0) },
            { title: "Phí", key: "fee", align: "right", render: (_, r) => money(batchDetails[r.id]?.totalFee ?? 0) },
            { title: "Thực nhận", key: "net", align: "right", render: (_, r) => <b>{money(batchDetails[r.id]?.netReceived ?? 0)}</b> },
          ]}
        />
      </Card>
    </div>
  );
}

/* ============================ TÀI KHOẢN NHẬN TIỀN ============================ */

function PayoutAccounts() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const tenantId = currentUser?.tenantId ?? null;
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [editing, setEditing] = useState<PayoutAccount | "new" | null>(null);

  const load = () => {
    if (tenantId && currentUser) listPayoutAccounts(tenantId, currentUser.role).then(setAccounts);
  };
  useEffect(load, [tenantId]);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Tài khoản nhận tiền rút"
        sub="Khai báo tài khoản ngân hàng để Owner rút số dư khả dụng về"
        extra={
          <Button type="primary" icon={<Plus size={15} />} onClick={() => setEditing("new")}>
            Thêm tài khoản
          </Button>
        }
      />
      <Table<PayoutAccount>
        dataSource={accounts}
        rowKey="id"
        pagination={false}
        size="middle"
        onRow={(r) => ({ onClick: () => setEditing(r), style: { cursor: "pointer" } })}
        columns={[
          { title: "Ngân hàng", dataIndex: "bankName" },
          { title: "Số tài khoản", dataIndex: "accountNumber" },
          { title: "Chủ tài khoản", dataIndex: "accountName" },
          { title: "", dataIndex: "isDefault", align: "right", render: (d: boolean) => (d ? <Tag color="black">Mặc định</Tag> : null) },
        ]}
      />

      <PayoutAccountModal
        account={editing}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          if (!tenantId || !currentUser) return;
          try {
            if (editing === "new") {
              await createPayoutAccount(tenantId, data, currentUser.email, currentUser.role);
              message.success("Đã thêm tài khoản nhận tiền");
            } else if (editing) {
              await updatePayoutAccount(editing.id, data, currentUser.email, currentUser.role);
              message.success("Đã cập nhật tài khoản");
            }
            setEditing(null);
            load();
          } catch (err) {
            message.error(err instanceof Error ? err.message : "Không lưu được");
          }
        }}
      />
    </Card>
  );
}

function PayoutAccountModal({
  account,
  onClose,
  onSave,
}: {
  account: PayoutAccount | "new" | null;
  onClose: () => void;
  onSave: (data: { bankName: string; accountNumber: string; accountName: string }) => void;
}) {
  const existing = account === "new" ? null : account;
  const [bankName, setBankName] = useState(existing?.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber ?? "");
  const [accountName, setAccountName] = useState(existing?.accountName ?? "");

  useEffect(() => {
    setBankName(existing?.bankName ?? "");
    setAccountNumber(existing?.accountNumber ?? "");
    setAccountName(existing?.accountName ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  return (
    <Modal
      open={!!account}
      onCancel={onClose}
      title={account === "new" ? "Thêm tài khoản nhận tiền" : "Sửa tài khoản nhận tiền"}
      onOk={() => onSave({ bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountName: accountName.trim() })}
      okButtonProps={{ disabled: !bankName.trim() || !accountNumber.trim() || !accountName.trim() }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <Input placeholder="Ngân hàng (VD: Vietcombank)" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        <Input placeholder="Số tài khoản" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        <Input placeholder="Tên chủ tài khoản" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ============================ YÊU CẦU RÚT ============================ */

function WithdrawRequests() {
  const { message } = App.useApp();
  const currentUser = useAppStore((s) => s.currentUser);
  const tenantId = currentUser?.tenantId ?? null;
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [amount, setAmount] = useState<number | null>(null);
  const [payoutAccountId, setPayoutAccountId] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!tenantId || !currentUser) return;
    setBalance(await getWalletBalance(tenantId, currentUser.role));
    setAccounts(await listPayoutAccounts(tenantId, currentUser.role));
    setRequests(await listWithdrawalRequests(currentUser.role, tenantId));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const submit = async () => {
    if (!tenantId || !currentUser || !amount || !payoutAccountId) return;
    setBusy(true);
    try {
      await createWithdrawalRequest(tenantId, amount, payoutAccountId, currentUser.email, currentUser.role, note.trim() || undefined);
      message.success("Đã tạo yêu cầu rút tiền");
      setAmount(null);
      setNote("");
      await load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không tạo được yêu cầu");
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async (id: string) => {
    if (!currentUser) return;
    await cancelWithdrawalRequest(id, currentUser.email, currentUser.role);
    message.success("Đã huỷ yêu cầu — tiền trả lại số dư khả dụng");
    await load();
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)", gap: 16 }}>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle title="Tạo yêu cầu rút" sub={`Số dư khả dụng: ${money(balance?.availableBalance ?? 0)}`} />
        {accounts.length === 0 ? (
          <div style={{ fontSize: 13, color: "#a1a1aa" }}>Chưa có tài khoản nhận tiền — khai báo ở tab "Tài khoản nhận tiền" trước.</div>
        ) : (
          <>
            <Select
              placeholder="Chọn tài khoản nhận tiền"
              style={{ width: "100%", marginBottom: 10 }}
              value={payoutAccountId}
              onChange={setPayoutAccountId}
              options={accounts.map((a) => ({ value: a.id, label: `${a.bankName} · ${a.accountNumber}` }))}
            />
            <Input
              type="number"
              placeholder="Số tiền muốn rút"
              value={amount ?? ""}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : null)}
              style={{ marginBottom: 10 }}
            />
            <Input placeholder="Ghi chú (tuỳ chọn)" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 12 }} />
            <Button type="primary" block loading={busy} disabled={!amount || !payoutAccountId} onClick={submit}>
              Gửi yêu cầu rút
            </Button>
          </>
        )}
      </Card>

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <SectionTitle title="Lịch sử yêu cầu rút" />
        <Table<WithdrawalRequest>
          dataSource={requests}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 6 }}
          columns={[
            { title: "Ngày tạo", dataIndex: "createdAt", render: (v) => new Date(v).toLocaleString("vi-VN") },
            { title: "Số tiền", dataIndex: "amount", align: "right", render: money },
            { title: "Tài khoản nhận", key: "acc", render: (_, r) => `${r.payoutAccountSnapshot.bankName} · ${r.payoutAccountSnapshot.accountNumber}` },
            { title: "Trạng thái", dataIndex: "status", render: (s: WithdrawalStatus) => <Tag color={WITHDRAW_STATUS_META[s].color}>{WITHDRAW_STATUS_META[s].label}</Tag> },
            {
              title: "",
              key: "act",
              align: "right",
              render: (_, r) => (r.status === "pending" ? <Button size="small" danger onClick={() => doCancel(r.id)}>Huỷ</Button> : null),
            },
          ]}
        />
      </Card>
    </div>
  );
}
