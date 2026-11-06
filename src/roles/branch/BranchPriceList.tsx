import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Card, Input, Table, Tag } from "antd";
import type { BranchPriceRow } from "../../types";
import { branchPricesApi, describeApiError } from "../../api";
import { SectionTitle } from "../../components/bits";
import { money } from "../../data";
import ActionButton from "../../plan/ActionButton";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

/**
 * Mục 29.3: Store Manager xem bảng giá của CHI NHÁNH MÌNH, chỉ đọc (chỉ Brand Manager sửa giá — BR-84). Giá hiệu lực = giá chi nhánh nếu có,
 * không thì giá chuỗi. Chi nhánh lấy từ token ở BE; web chỉ truyền mã chi nhánh đang chọn.
 */
export default function BranchPriceList() {
  const branchId = useAppStore((s) => s.currentBranchId);
  const [rows, setRows] = useState<BranchPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      setRows(await branchPricesApi.getBranchPrices(branchId));
      setError(null);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => !needle || r.name.toLowerCase().includes(needle)).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  }, [rows, search]);

  return (
    <div data-testid="branch-price-list">
      <SectionTitle title="Bảng giá chi nhánh" sub="Giá đang áp dụng tại chi nhánh của bạn. Chỉ chủ chuỗi (Brand Manager) đổi được giá." />
      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Không tải được bảng giá" description={error} action={<ActionButton onClick={() => void load()}>Thử lại</ActionButton>} />}
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <Input.Search allowClear placeholder="Tìm món hoặc combo" style={{ maxWidth: 280, marginBottom: 12 }} onChange={(e) => setSearch(e.target.value)} />
        <Table<BranchPriceRow>
          rowKey={(r) => `${r.type}:${r.productId}`}
          loading={loading}
          dataSource={shown}
          pagination={false}
          size="middle"
          locale={{ emptyText: error ? "—" : "Chi nhánh chưa bán món hoặc combo nào" }}
          columns={[
            { title: "Tên", dataIndex: "name", render: (name: string, r) => <span><b>{name}</b> <span style={{ fontSize: 12, color: palette.textSubtle }}>{r.type === "COMBO" ? "Combo" : "Món"}</span></span> },
            { title: "Giá chuỗi", dataIndex: "chainPrice", align: "right", render: (v: number) => money(v) },
            {
              title: "Giá tại chi nhánh",
              align: "right",
              render: (_, r) => (
                <span style={{ fontWeight: r.priceOverride !== null ? 700 : 400 }} data-testid={`branch-price-${r.productId}`}>
                  {money(r.effectivePrice)}
                  {r.priceOverride !== null && (
                    <Tag style={{ marginLeft: 8 }} color="default">
                      Giá riêng
                    </Tag>
                  )}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
