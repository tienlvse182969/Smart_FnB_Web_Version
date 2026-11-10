import { Alert, Card, DatePicker, Select, Table } from "antd";
import { SectionTitle } from "../../components/bits";
import { palette } from "../../theme";

/**
 * BM-07 (đặc tả 17.3, mục 32, BR-93, BR-94): Sổ giao dịch bán hàng của chi nhánh — MỚI CHỈ LÀ KHUNG MÀN HÌNH.
 * Chưa có dữ liệu vì BE chưa có API sổ giao dịch (GAP-300); khi BE có thì nối ở phase "Sổ giao dịch" (GAP-301).
 * Bộ lọc và bảng bên dưới đúng cột theo mục 32.5 nhưng bị khoá, KHÔNG hiện số giả.
 */
export default function TransactionLedger() {
  return (
    <div data-testid="ledger-page">
      <SectionTitle title="Sổ giao dịch" sub="Mọi khoản tiền vào, ra của chi nhánh qua hệ thống — chỉ xem" />
      <Alert
        data-testid="ledger-pending-note"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Sổ giao dịch đang được xây dựng"
        description="Dữ liệu sẽ hiển thị khi backend cung cấp API sổ giao dịch. Màn này chỉ xem, không có thao tác sửa hay xoá."
      />
      <Card style={{ borderRadius: 14, marginBottom: 16 }} styles={{ body: { padding: 16 } }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <DatePicker.RangePicker disabled format="DD/MM/YYYY" aria-label="Khoảng ngày" />
          <Select disabled placeholder="Loại (Thu, Chi)" style={{ minWidth: 160 }} aria-label="Loại" />
          <Select disabled placeholder="Hình thức (Tiền mặt, QR)" style={{ minWidth: 200 }} aria-label="Hình thức" />
          <Select disabled placeholder="Thu ngân" style={{ minWidth: 180 }} aria-label="Thu ngân" />
        </div>
      </Card>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
        <Table
          size="small"
          pagination={false}
          dataSource={[]}
          locale={{ emptyText: <span style={{ color: palette.textMuted }}>Chưa có dữ liệu</span> }}
          columns={[
            { title: "Thời điểm", dataIndex: "at" },
            { title: "Loại", dataIndex: "kind" },
            { title: "Hình thức", dataIndex: "method" },
            { title: "Số tiền", dataIndex: "amount", align: "right" },
            { title: "Mã đơn", dataIndex: "orderCode" },
            { title: "Số gọi", dataIndex: "callNumber" },
            { title: "Người thao tác", dataIndex: "actor" },
            { title: "Ghi chú", dataIndex: "note" },
          ]}
        />
      </Card>
    </div>
  );
}
