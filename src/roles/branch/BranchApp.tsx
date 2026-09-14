import { useState } from "react";
import { Card, Col, Row, Table } from "antd";
import {
  Banknote,
  History,
  LayoutDashboard,
  LayoutGrid,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import RoleShell, { type NavItem } from "../../layout/RoleShell";
import {
  branchShortName,
  currentBranchId,
  money,
  transactions,
  type Transaction,
  type TxStatus,
} from "../../data";
import { SectionTitle, page } from "../../components/bits";
import Kpis from "./Kpis";
import RevenueChart from "./RevenueChart";
import FloorPlan from "./FloorPlan";
import BranchMenu from "./BranchMenu";
import StaffTable from "./StaffTable";
import Payment from "./Payment";
import { txMeta } from "./TxList";

const nav: NavItem[] = [
  { key: "dashboard", label: "Tổng quan", icon: <LayoutDashboard size={18} /> },
  { key: "floor", label: "Sơ đồ bàn", icon: <LayoutGrid size={18} /> },
  { key: "menu", label: "Món tại chi nhánh", icon: <UtensilsCrossed size={18} /> },
  { key: "staff", label: "Nhân viên", icon: <UsersRound size={18} /> },
  { key: "payment", label: "Thanh toán", icon: <Banknote size={18} /> },
  { key: "history", label: "Lịch sử giao dịch", icon: <History size={18} /> },
];

export default function BranchApp({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState("dashboard");
  const branchTxs = transactions.filter((t) => t.branchId === currentBranchId);

  return (
    <RoleShell
      role="branch"
      nav={nav}
      section={section}
      onSection={setSection}
      onLogout={onLogout}
      branchChip={branchShortName(currentBranchId)}
      searchPlaceholder="Tìm bàn, món, nhân viên, đơn…"
    >
      <div style={page}>
        {section === "dashboard" && (
          <>
            <Kpis />
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={24}>
                <RevenueChart />
              </Col>
            </Row>
          </>
        )}
        {section === "floor" && <FloorPlan />}
        {section === "menu" && <BranchMenu />}
        {section === "staff" && <StaffTable />}
        {section === "payment" && <Payment />}

        {section === "history" && (
          <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
            <SectionTitle title="Lịch sử giao dịch" sub="Toàn bộ giao dịch của chi nhánh trong ca hiện tại" />
            <Table<Transaction>
              dataSource={branchTxs}
              rowKey="id"
              pagination={false}
              size="middle"
              columns={[
                { title: "Mã đơn", dataIndex: "id", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
                { title: "Bàn", dataIndex: "table" },
                { title: "Phiên", dataIndex: "session" },
                { title: "Phương thức", dataIndex: "method" },
                { title: "Giờ", dataIndex: "time" },
                { title: "Số tiền", dataIndex: "amount", align: "right", render: (v) => money(v) },
                {
                  title: "Trạng thái",
                  dataIndex: "status",
                  render: (s: TxStatus) => (
                    <span
                      style={{
                        background: txMeta[s].bg,
                        color: txMeta[s].color,
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {txMeta[s].label}
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        )}
      </div>
    </RoleShell>
  );
}
