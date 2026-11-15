import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Col, DatePicker, Row, Segmented, Select, Skeleton, Table, Tag } from "antd";
import dayjs from "dayjs";
import { ArrowDownLeft, ArrowUpRight, Banknote, QrCode, RefreshCw, Wallet } from "lucide-react";
import { cashLedgerApi, type LedgerDirection, type LedgerEntry, type LedgerPage, type LedgerSource } from "../../api/cashLedger";
import { describeApiError } from "../../api";
import { paymentMethodInfo } from "../../api/modules/order/codes";
import { SectionTitle, StatCard } from "../../components/bits";
import { RANGE_PRESETS, describeRange, formatDateTime, formatVnd, presetRange, type DateRange, type RangePreset } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

const DAY = "YYYY-MM-DD";
const ALL = "__all__";
const PAGE_SIZE = 50;

const SOURCE_LABEL: Record<LedgerSource, string> = {
  CASH_PAYMENT: "Thu tiền mặt",
  PAYOS_WEBHOOK: "Thu QR PayOS",
  PAYOS_RECHECK: "Thu QR (kiểm tra lại)",
  MANUAL_CONFIRMATION: "Xác nhận chuyển khoản thủ công",
  REFUND: "Hoàn tiền",
};

/**
 * Mục 32 — Sổ giao dịch bán hàng. Mỗi khoản tiền vào (+) hoặc ra (−) qua hệ thống là một dòng chỉ-thêm.
 * Store Manager: sổ chi nhánh mình (BM-07). Brand Manager: sổ từng chi nhánh hoặc tổng sổ chuỗi kèm bảng tổng theo chi nhánh (OW-08).
 * Web chỉ hiện số BE trả; tổng sổ khớp số tiền mặt của báo cáo (BR-83, BR-93).
 */
export default function CashLedger({ scope }: { scope: "branch" | "chain" }) {
  const chainId = useAppStore((s) => s.chainId);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const apiBranches = useAppStore((s) => s.apiBranches);
  const branches = apiBranches.filter((b) => b.chainId === chainId);
  const [preset, setPreset] = useState<RangePreset | "custom">("7d");
  const [range, setRange] = useState<DateRange>(() => presetRange("7d"));
  const [branchFilter, setBranchFilter] = useState<string>(ALL);
  const [direction, setDirection] = useState<LedgerDirection | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LedgerPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const branchId = scope === "branch" ? currentBranchId : branchFilter === ALL ? null : branchFilter;

  const load = useCallback(async () => {
    const query = { ...range, page, pageSize: PAGE_SIZE, direction: direction === "ALL" ? undefined : direction };
    if (scope === "branch" && !currentBranchId) return;
    if (scope === "chain" && !branchId && !chainId) return;
    setLoading(true);
    setError(null);
    try {
      setData(branchId ? await cashLedgerApi.branch(branchId, query) : await cashLedgerApi.chain(chainId!, query));
    } catch (err) {
      setData(null);
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [range, page, direction, scope, currentBranchId, branchId, chainId]);

  useEffect(() => {
    void load();
  }, [load, nonce]);

  useEffect(() => setPage(1), [range, direction, branchFilter]);

  if (scope === "branch" && !currentBranchId) return <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />;

  const scopeLabel = scope === "branch" ? "Chi nhánh của bạn" : branchId ? (branches.find((b) => b.id === branchId)?.name ?? "Chi nhánh") : `Toàn chuỗi · ${branches.length} chi nhánh`;
  const s = data?.summary;

  return (
    <div data-testid="cash-ledger">
      <SectionTitle
        title="Sổ giao dịch bán hàng"
        sub={`${scopeLabel} · ${describeRange(range)} · giờ Việt Nam · mỗi khoản tiền vào (+) hoặc ra (−) là một dòng không sửa, không xoá`}
        extra={<Button icon={<RefreshCw size={15} />} loading={loading && !!data} onClick={() => setNonce((n) => n + 1)}>Làm mới</Button>}
      />
      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <Segmented
            value={preset}
            onChange={(value) => {
              if (value === "custom") return;
              setPreset(value as RangePreset);
              setRange(presetRange(value as RangePreset));
            }}
            options={[...RANGE_PRESETS.map((p) => ({ label: p.label, value: p.key as RangePreset | "custom" })), { label: "Tuỳ chọn", value: "custom" as const }]}
          />
          <DatePicker.RangePicker
            allowClear={false}
            format="DD/MM/YYYY"
            value={[dayjs(range.from, DAY), dayjs(range.to, DAY)]}
            onChange={(values) => {
              if (!values?.[0] || !values?.[1]) return;
              setPreset("custom");
              setRange({ from: values[0].format(DAY), to: values[1].format(DAY) });
            }}
          />
          {scope === "chain" && (
            <Select
              data-testid="ledger-branch"
              value={branchFilter}
              onChange={setBranchFilter}
              style={{ minWidth: 220 }}
              options={[{ value: ALL, label: `Tổng sổ toàn chuỗi (${branches.length})` }, ...branches.map((b) => ({ value: b.id, label: `${b.name} · ${b.code}` }))]}
            />
          )}
          <Segmented
            value={direction}
            onChange={(value) => setDirection(value as LedgerDirection | "ALL")}
            options={[
              { label: "Tất cả", value: "ALL" },
              { label: "Tiền vào", value: "INFLOW" },
              { label: "Tiền ra", value: "OUTFLOW" },
            ]}
          />
        </div>
      </Card>

      {error && <Alert type="error" showIcon message="Không tải được sổ giao dịch" description={error} action={<Button size="small" onClick={() => setNonce((n) => n + 1)}>Thử lại</Button>} />}
      {!error && !data && <Skeleton active paragraph={{ rows: 8 }} />}
      {!error && data && s && (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} lg={6}><StatCard label="Tiền mặt đã thu" value={formatVnd(s.cashCollected)} icon={<Banknote size={18} />} /></Col>
            <Col xs={12} lg={6}><StatCard label="QR đã thu" value={formatVnd(s.qrCollected)} icon={<QrCode size={18} />} /></Col>
            <Col xs={12} lg={6}><StatCard label="Tiền mặt đã hoàn" value={formatVnd(s.cashRefunded)} hint="gồm hoàn cho đơn trả bằng QR (BR-81)" icon={<ArrowUpRight size={18} />} /></Col>
            <Col xs={12} lg={6}><StatCard label="Tiền mặt thuần trong két" value={formatVnd(s.netCash)} hint={`Tổng thuần (cả QR): ${formatVnd(s.netTotal)}`} icon={<Wallet size={18} />} emphasis /></Col>
          </Row>

          {scope === "chain" && !branchId && data.branches.length > 0 && (
            <Card title="Tổng sổ theo chi nhánh" style={{ borderRadius: 14, marginTop: 16 }} data-testid="ledger-branches">
              <Table
                size="small"
                rowKey={(row) => row.branch.id}
                pagination={false}
                scroll={{ x: 640 }}
                dataSource={data.branches}
                columns={[
                  { title: "Chi nhánh", render: (_, row) => <Button type="link" style={{ padding: 0 }} onClick={() => setBranchFilter(row.branch.id)}>{row.branch.name}</Button> },
                  { title: "Tiền mặt thu", align: "right", render: (_, row) => formatVnd(row.summary.cashCollected) },
                  { title: "QR thu", align: "right", render: (_, row) => formatVnd(row.summary.qrCollected) },
                  { title: "Tiền mặt hoàn", align: "right", render: (_, row) => formatVnd(row.summary.cashRefunded) },
                  { title: "Tiền mặt thuần", align: "right", render: (_, row) => <b>{formatVnd(row.summary.netCash)}</b> },
                ]}
              />
            </Card>
          )}

          <Card title={`Các dòng sổ · ${data.pagination.total} dòng`} style={{ borderRadius: 14, marginTop: 16 }}>
            <Table<LedgerEntry>
              data-testid="ledger-entries"
              size="small"
              rowKey="id"
              scroll={{ x: 900 }}
              dataSource={data.items}
              locale={{ emptyText: "Không có giao dịch trong kỳ" }}
              pagination={{ current: data.pagination.page, pageSize: PAGE_SIZE, total: data.pagination.total, showSizeChanger: false, onChange: setPage }}
              columns={[
                { title: "Thời điểm", dataIndex: "occurredAt", width: 150, render: (v: string) => formatDateTime(v) },
                ...(scope === "chain" && !branchId ? [{ title: "Chi nhánh", render: (_: unknown, row: LedgerEntry) => row.branch?.name ?? "—" }] : []),
                {
                  title: "Loại",
                  render: (_, row) => (
                    <Tag icon={row.direction === "INFLOW" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />} color={row.direction === "INFLOW" ? "success" : "error"}>
                      {SOURCE_LABEL[row.sourceType] ?? row.sourceType}
                    </Tag>
                  ),
                },
                { title: "Hình thức", dataIndex: "paymentMethod", render: (v: string | null) => (v ? paymentMethodInfo(v).label : "—") },
                {
                  title: "Số tiền",
                  dataIndex: "amount",
                  align: "right",
                  render: (v: number, row) => (
                    <b style={{ color: row.direction === "INFLOW" ? palette.success.text : palette.error.text }} data-testid="ledger-amount">
                      {row.direction === "INFLOW" ? "+" : "−"}
                      {formatVnd(v)}
                    </b>
                  ),
                },
                { title: "Đơn", render: (_, row) => (row.orderCode ? `${row.orderCode}${row.callNumber ? ` · số ${row.callNumber}` : ""}` : "—") },
                { title: "Người thực hiện", dataIndex: "actorName", render: (v: string | null) => v ?? "—" },
                { title: "Ghi chú", dataIndex: "note", render: (v: string | null) => v ?? "—" },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
