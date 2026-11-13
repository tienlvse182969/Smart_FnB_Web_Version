import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Drawer, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { describeApiError, ledgerApi } from "../../api";
import { SectionTitle } from "../../components/bits";
import { formatVnd, type DateRange } from "../../lib/reportFormat";
import { palette } from "../../theme";
import type { LedgerSummary } from "../../types";
import { LedgerPanel } from "../branch/TransactionLedger";

interface BranchRef {
  id: string;
  name: string;
  code: string;
}

type Row = { branch: BranchRef; state: "loading" } | { branch: BranchRef; state: "error"; error: string } | { branch: BranchRef; state: "ok"; summary: LedgerSummary };

/**
 * OW-08 + BM-07 (mục 32.5, BR-94): bảng tổng sổ giao dịch theo chi nhánh trong báo cáo. Mỗi chi nhánh gọi
 * `GET /branches/:id/cash-ledger` và hiện đúng 3 tổng BE trả; Web KHÔNG tự cộng. Tổng 5 số (thu tiền mặt, thu QR, chi tiền mặt, tiền mặt
 * thuần) chờ BE (`_audit/05` L6). Bấm một chi nhánh mở sổ chi tiết.
 */
export default function LedgerByBranch({ branches, range }: { branches: BranchRef[]; range: DateRange }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState<BranchRef | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setRows(branches.map((branch) => ({ branch, state: "loading" })));
    const next = await Promise.all(
      branches.map(async (branch): Promise<Row> => {
        try {
          const ledger = await ledgerApi.getBranchLedger(branch.id, range);
          return { branch, state: "ok", summary: ledger.summary };
        } catch (err) {
          return { branch, state: "error", error: describeApiError(err) };
        }
      }),
    );
    if (mine === seq.current) setRows(next);
  }, [branches, range]);

  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load, nonce]);

  const money = (render: (s: LedgerSummary) => number): ColumnsType<Row>[number]["render"] =>
    (_v, row) => (row.state === "ok" ? formatVnd(render(row.summary)) : row.state === "loading" ? "…" : "—");

  const columns: ColumnsType<Row> = [
    { title: "Chi nhánh", key: "branch", render: (_v, r) => `${r.branch.name} · ${r.branch.code}` },
    { title: "Tổng thu", key: "in", align: "right", render: money((s) => s.inflow) },
    { title: "Tổng chi", key: "out", align: "right", render: money((s) => s.outflow) },
    { title: "Thuần", key: "net", align: "right", render: money((s) => s.net) },
    {
      title: "",
      key: "action",
      width: 150,
      render: (_v, r) =>
        r.state === "error" ? (
          <span style={{ color: palette.error.text }}>
            {r.error}{" "}
            <Button size="small" type="link" onClick={() => setNonce((n) => n + 1)}>
              Thử lại
            </Button>
          </span>
        ) : (
          <Button size="small" onClick={() => setOpen(r.branch)} data-testid={`ledger-open-${r.branch.id}`}>
            Xem sổ chi tiết
          </Button>
        ),
    },
  ];

  return (
    <Card data-testid="ledger-by-branch" style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
      <SectionTitle title="Sổ giao dịch theo chi nhánh" sub="Tổng thu, chi trong khoảng ngày đang chọn — chỉ xem" />
      {branches.length === 0 ? (
        <Alert type="info" showIcon message="Chưa có chi nhánh nào" />
      ) : (
        <Table<Row> size="small" rowKey={(r) => r.branch.id} pagination={false} dataSource={rows} columns={columns} scroll={{ x: 600 }} />
      )}
      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        width={960}
        destroyOnHidden
        title={open ? `Sổ giao dịch — ${open.name}` : ""}
      >
        {open && <LedgerPanel branchId={open.id} initialRange={[range.from, range.to]} />}
      </Drawer>
    </Card>
  );
}
