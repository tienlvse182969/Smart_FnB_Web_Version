import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Drawer, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { describeApiError, ledgerApi } from "../../api";
import { SectionTitle } from "../../components/bits";
import { formatVnd, type DateRange } from "../../lib/reportFormat";
import { palette } from "../../theme";
import type { LedgerBranchSummary, LedgerSummary } from "../../types";
import { LedgerPanel, SummaryRow } from "../branch/TransactionLedger";

/**
 * OW-08 + BM-07 (mục 32.5, BR-94): bảng tổng sổ giao dịch theo chi nhánh trong báo cáo. Một lời gọi
 * `GET /restaurant-chains/:chainId/cash-ledger` trả tổng cả chuỗi và tổng từng chi nhánh (`branches[].summary`); Web KHÔNG tự cộng.
 * Bấm một chi nhánh mở sổ chi tiết của chi nhánh đó.
 */
export default function LedgerByBranch({ chainId, range }: { chainId: string | undefined; range: DateRange }) {
  const [rows, setRows] = useState<LedgerBranchSummary[]>([]);
  const [total, setTotal] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState<LedgerBranchSummary | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!chainId) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      // `pageSize: 1`: chỉ cần phần tổng, không cần danh sách dòng.
      const ledger = await ledgerApi.getChainLedger(chainId, { from: range.from, to: range.to, page: 1, pageSize: 1 });
      if (mine !== seq.current) return;
      setRows(ledger.branches);
      setTotal(ledger.summary);
    } catch (err) {
      if (mine !== seq.current) return;
      setRows([]);
      setTotal(null);
      setError(describeApiError(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [chainId, range.from, range.to]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load, nonce]);

  const money = (pick: (s: LedgerSummary) => number): ColumnsType<LedgerBranchSummary>[number]["render"] =>
    (_v, row) => formatVnd(pick(row.summary));

  const columns: ColumnsType<LedgerBranchSummary> = [
    { title: "Chi nhánh", key: "branch", render: (_v, r) => `${r.name} · ${r.code}` },
    { title: "Thu tiền mặt", key: "cashIn", align: "right", render: money((s) => s.cashCollected) },
    { title: "Thu QR", key: "qrIn", align: "right", render: money((s) => s.qrCollected) },
    { title: "Chi tiền mặt", key: "cashOut", align: "right", render: money((s) => s.cashRefunded) },
    { title: "Tiền mặt thuần", key: "netCash", align: "right", render: money((s) => s.netCash) },
    { title: "Thuần tổng", key: "netTotal", align: "right", render: money((s) => s.netTotal) },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) => (
        <Button size="small" onClick={() => setOpen(r)} data-testid={`ledger-open-${r.branchId}`}>
          Xem sổ chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Card data-testid="ledger-by-branch" style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
      <SectionTitle title="Sổ giao dịch theo chi nhánh" sub="Tổng thu, chi trong khoảng ngày đang chọn — chỉ xem" />
      {error && (
        <Alert
          data-testid="ledger-by-branch-error"
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={error}
          action={
            <Button size="small" onClick={() => setNonce((n) => n + 1)}>
              Thử lại
            </Button>
          }
        />
      )}
      {total && <SummaryRow summary={total} />}
      <Table<LedgerBranchSummary>
        size="small"
        rowKey="branchId"
        loading={loading}
        pagination={false}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 760 }}
        locale={{ emptyText: <span style={{ color: palette.textMuted }}>{error ? "Không tải được sổ giao dịch" : "Không có giao dịch trong khoảng ngày này"}</span> }}
      />
      <Drawer open={open !== null} onClose={() => setOpen(null)} width={960} destroyOnHidden title={open ? `Sổ giao dịch — ${open.name}` : ""}>
        {open && <LedgerPanel branchId={open.branchId} initialRange={[range.from, range.to]} />}
      </Drawer>
    </Card>
  );
}
