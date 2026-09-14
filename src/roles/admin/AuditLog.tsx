import { Card, Table, Tag } from "antd";
import { auditLog, type AuditEntry } from "../../data";
import { SectionTitle } from "../../components/bits";

export default function AuditLog() {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Nhật ký hệ thống"
        sub="Mọi thao tác nhạy cảm đều ghi lại kèm người thực hiện & thời điểm (BR-11)"
      />
      <Table<AuditEntry>
        dataSource={auditLog}
        rowKey="id"
        pagination={false}
        size="middle"
        columns={[
          { title: "Thời điểm", dataIndex: "time", width: 110 },
          {
            title: "Người thực hiện",
            dataIndex: "actor",
            render: (v) => <Tag>{v}</Tag>,
          },
          {
            title: "Hành động",
            dataIndex: "action",
            render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>,
          },
          { title: "Đối tượng", dataIndex: "target" },
        ]}
      />
    </Card>
  );
}
