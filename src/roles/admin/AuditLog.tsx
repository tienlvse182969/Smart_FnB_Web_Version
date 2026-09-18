import { useEffect, useState } from "react";
import { Card, Table, Tag } from "antd";
import type { AuditEntryLegacy } from "../../mock/db";
import { listAuditLog } from "../../services";
import { SectionTitle } from "../../components/bits";

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntryLegacy[]>([]);

  useEffect(() => {
    listAuditLog().then(setEntries);
  }, []);

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Nhật ký hệ thống"
        sub="Mọi thao tác nhạy cảm đều ghi lại kèm người thực hiện & thời điểm (BR-20)"
      />
      <Table<AuditEntryLegacy>
        dataSource={entries}
        rowKey="id"
        pagination={false}
        size="middle"
        columns={[
          { title: "Thời điểm", dataIndex: "time", width: 200 },
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
