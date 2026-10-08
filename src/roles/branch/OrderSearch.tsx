import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, DatePicker, Input, Select, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { Search, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { describeApiError, modeOf, orderApi } from "../../api";
import { useOrderRealtime } from "../../api/realtime/useOrderRealtime";
import RealtimeBadge from "../../components/RealtimeBadge";
import { orderPaymentInfo, orderStatusInfo, paymentMethodInfo, ORDER_PAYMENT_FILTER, ORDER_STATUS_FILTER, PAYMENT_METHOD_FILTER } from "../../api/modules/order/codes";
import { ORDER_PAGE_SIZES } from "../../api/modules/order/query";
import { SectionTitle } from "../../components/bits";
import { formatDateTime, formatVnd } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";
import type { OrderPage, OrderSummary } from "../../types";
import { Chip } from "../admin/adminUi";
import type { OrderDetailLocationState } from "./OrderDetail";
import { cleanCallNumber, cleanOrderCode, filtersToSearch, hasExtraFilters, isDefaultFilters, parseFilters, toOrderQuery, type OrderFilters } from "./orderFilters";

const { RangePicker } = DatePicker;
const DAY = "YYYY-MM-DD";
const EMPTY_RANGE_TEXT = "Không có đơn trong khoảng thời gian này";
const EMPTY_FILTER_TEXT = "Không có đơn nào khớp bộ lọc";

function methodsOf(order: OrderSummary): string {
  const labels = [...new Set(order.payments.map((p) => paymentMethodInfo(p.method).label))];
  return labels.length ? labels.join(", ") : "—";
}

/** `search` = chuỗi truy vấn đang lọc (có dấu `?` hoặc rỗng), truyền sang chi tiết để "Quay lại" giữ đúng bộ lọc và trang. */
const buildColumns = (search: string): ColumnsType<OrderSummary> => [
  {
    title: "Số gọi",
    dataIndex: "callNumber",
    width: 90,
    render: (v: number | null, o) => (
      <Link to={`/manager/orders/${o.id}`} state={{ from: search } satisfies OrderDetailLocationState} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 600 }}>
        {v ?? "—"}
      </Link>
    ),
  },
  { title: "Mã đơn", dataIndex: "orderCode", render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: 12.5 }}>{v}</span> },
  { title: "Thời gian đặt", dataIndex: "placedAt", width: 150, render: (v: string | null) => formatDateTime(v) },
  { title: "Tổng tiền", dataIndex: "total", align: "right", width: 120, render: (v: number) => formatVnd(v) },
  {
    title: "Trạng thái đơn",
    dataIndex: "status",
    width: 150,
    render: (v: string) => {
      const info = orderStatusInfo(v);
      return <Chip tone={info.tone}>{info.label}</Chip>;
    },
  },
  {
    title: "Thanh toán",
    key: "payment",
    width: 160,
    render: (_: unknown, o) => {
      const info = orderPaymentInfo(o);
      return <Chip tone={info.tone}>{info.label}</Chip>;
    },
  },
  { title: "Hình thức", key: "method", width: 160, render: (_: unknown, o) => methodsOf(o) },
  { title: "Thu ngân", dataIndex: "cashierName", width: 150, render: (v: string | null) => v ?? "—" },
];

/**
 * BM-04: tra cứu đơn của chi nhánh (Branch Manager). Real `GET /manager/orders` (luôn `type=COUNTER_PICKUP`, quyết định 61).
 * Bộ lọc và trang nằm trên URL (F5 giữ nguyên, quyết định 68): đổi bộ lọc về trang 1; ô Số gọi và Mã đơn áp dụng khi bấm Tìm
 * hoặc Enter (không gọi API mỗi phím gõ). Lỗi đọc hiện thành khối lỗi trong trang kèm Thử lại (`INLINE_ERROR_ROUTES`).
 */
export default function OrderSearch() {
  const chainId = useAppStore((s) => s.chainId);
  const branchId = useAppStore((s) => s.currentBranchId);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);
  const search = useMemo(() => {
    const text = filtersToSearch(filters).toString();
    return text ? `?${text}` : "";
  }, [filters]);
  const columns = useMemo(() => buildColumns(search), [search]);

  const [callInput, setCallInput] = useState(filters.callNumber);
  const [codeInput, setCodeInput] = useState(filters.orderCode);
  // URL đổi từ ngoài (Xoá bộ lọc, nút Back) thì ô gõ theo URL.
  useEffect(() => {
    setCallInput(filters.callNumber);
    setCodeInput(filters.orderCode);
  }, [filters.callNumber, filters.orderCode]);

  const [data, setData] = useState<OrderPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const apply = useCallback(
    (patch: Partial<OrderFilters>, { keepPage = false }: { keepPage?: boolean } = {}) => {
      const next = { ...filtersRef.current, ...patch };
      if (!keepPage) next.page = 1;
      setParams(filtersToSearch(next), { replace: false });
    },
    [setParams],
  );

  const query = useMemo(() => toOrderQuery(filters), [filters]);
  const seq = useRef(0);
  /** `silent` = làm tươi do socket: không bật vòng quay, không xoá dữ liệu cũ, lỗi thì giữ nguyên bảng đang hiện. */
  const load = useCallback(
    async (silent: boolean) => {
      if (!chainId || !branchId) return;
      const mine = ++seq.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const page = await orderApi.listOrders({ chainId, branchId }, query);
        if (mine !== seq.current) return;
        // Trang vượt quá số trang hiện có (URL cũ, dữ liệu vừa đổi): về trang cuối.
        if (page.items.length === 0 && page.total > 0 && query.page > 1) {
          setParams(filtersToSearch({ ...filtersRef.current, page: Math.max(1, Math.ceil(page.total / page.limit)) }), { replace: true });
          return;
        }
        setData(page);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (mine !== seq.current) return;
        setLoading(false);
        if (!silent) setError(describeApiError(err));
      }
    },
    [chainId, branchId, query, setParams],
  );
  useEffect(() => {
    void load(false);
    return () => {
      seq.current++;
    };
  }, [load, nonce]);

  // Tự làm tươi qua socket (quyết định 74): tải lại đúng trang đang xem, giữ bộ lọc; bảng không nhảy trang.
  const realtimeOn = modeOf("order") === "real" && !!branchId;
  const realtime = useOrderRealtime(() => void load(true), { enabled: realtimeOn });

  const submitText = () => apply({ callNumber: cleanCallNumber(callInput), orderCode: cleanOrderCode(codeInput) });
  const clearAll = () => {
    setParams(new URLSearchParams(), { replace: false });
  };

  if (!branchId) return <Alert type="warning" showIcon message="Tài khoản chưa được gán chi nhánh nào" />;

  const emptyText = hasExtraFilters(filters) ? EMPTY_FILTER_TEXT : EMPTY_RANGE_TEXT;

  return (
    <>
      <SectionTitle title="Tra cứu đơn" sub="Đơn quầy của chi nhánh theo số gọi, mã đơn, thời gian, trạng thái và hình thức thanh toán (BM-04)" extra={realtimeOn ? <RealtimeBadge status={realtime} /> : undefined} />
      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }} data-testid="order-filters">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <RangePicker
            data-testid="order-range"
            allowClear={false}
            format="DD/MM/YYYY"
            value={[dayjs(filters.from, DAY), dayjs(filters.to, DAY)]}
            onChange={(range) => {
              if (range?.[0] && range[1]) apply({ from: range[0].format(DAY), to: range[1].format(DAY) });
            }}
          />
          <Input
            data-testid="order-call"
            style={{ width: 120 }}
            placeholder="Số gọi"
            inputMode="numeric"
            maxLength={10}
            value={callInput}
            onChange={(e) => setCallInput(e.target.value.replace(/\D/g, ""))}
            onPressEnter={submitText}
          />
          <Input
            data-testid="order-code"
            style={{ width: 200 }}
            placeholder="Mã đơn"
            maxLength={50}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onPressEnter={submitText}
          />
          <Select
            data-testid="order-status"
            style={{ width: 170 }}
            placeholder="Trạng thái đơn"
            allowClear
            value={filters.status || undefined}
            options={ORDER_STATUS_FILTER}
            onChange={(v) => apply({ status: v ?? "" })}
          />
          <Select
            data-testid="order-payment"
            style={{ width: 170 }}
            placeholder="Thanh toán"
            allowClear
            value={filters.payment || undefined}
            options={ORDER_PAYMENT_FILTER}
            onChange={(v) => apply({ payment: v ?? "" })}
          />
          <Select
            data-testid="order-method"
            style={{ width: 180 }}
            placeholder="Hình thức"
            allowClear
            value={filters.method || undefined}
            options={PAYMENT_METHOD_FILTER}
            onChange={(v) => apply({ method: v ?? "" })}
          />
          <Button type="primary" icon={<Search size={15} />} onClick={submitText} data-testid="order-search">
            Tìm
          </Button>
          <Button icon={<X size={15} />} onClick={clearAll} disabled={isDefaultFilters(filters) && !callInput && !codeInput} data-testid="order-clear">
            Xoá bộ lọc
          </Button>
        </div>
      </Card>

      {error ? (
        <Alert
          data-testid="order-error"
          type="error"
          showIcon
          message="Không tải được danh sách đơn"
          description={error}
          action={
            <Button size="small" onClick={() => setNonce((n) => n + 1)} data-testid="order-retry">
              Thử lại
            </Button>
          }
        />
      ) : (
        <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 0 } }}>
          <div data-testid="order-total" style={{ padding: "12px 16px", color: palette.textMuted, fontSize: 13 }}>
            {data ? `${data.total.toLocaleString("vi-VN")} đơn` : "Đang tải…"}
          </div>
          <Table<OrderSummary>
            data-testid="order-table"
            rowKey="id"
            size="middle"
            columns={columns}
            dataSource={data?.items ?? []}
            loading={loading}
            scroll={{ x: 1000 }}
            locale={{ emptyText }}
            onRow={(order) => ({
              onClick: () => navigate(`/manager/orders/${order.id}`, { state: { from: search } satisfies OrderDetailLocationState }),
              style: { cursor: "pointer" },
            })}
            pagination={{
              current: filters.page,
              pageSize: filters.limit,
              total: data?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: ORDER_PAGE_SIZES.map(String),
              showTotal: (total, range) => `${range[0]}–${range[1]} / ${total}`,
              onChange: (page, pageSize) => {
                if (pageSize !== filters.limit) apply({ limit: pageSize });
                else apply({ page }, { keepPage: true });
              },
            }}
          />
        </Card>
      )}
    </>
  );
}
