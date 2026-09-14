import { App, Button, Card, InputNumber, Switch, Table, Tag } from "antd";
import { Infinity as InfinityIcon, TriangleAlert } from "lucide-react";
import { useState } from "react";
import {
  branchMenuItems as bmiSeed,
  currentBranchId,
  menuItems,
  money,
  type BranchMenuItem,
} from "../../data";
import { SectionTitle } from "../../components/bits";

type Row = BranchMenuItem & {
  name: string;
  category: string;
  price: number;
  activeChain: boolean;
};

export default function BranchMenu() {
  const { message } = App.useApp();
  const [bmis, setBmis] = useState<BranchMenuItem[]>(bmiSeed);

  const rows: Row[] = bmis
    .filter((b) => b.branchId === currentBranchId)
    .map((b) => {
      const m = menuItems.find((x) => x.id === b.menuItemId)!;
      return { ...b, name: m.name, category: m.category, price: m.price, activeChain: m.activeChain };
    });

  const patch = (menuItemId: string, next: Partial<BranchMenuItem>) =>
    setBmis((p) =>
      p.map((b) =>
        b.branchId === currentBranchId && b.menuItemId === menuItemId ? { ...b, ...next } : b,
      ),
    );

  const toggle = (r: Row, on: boolean) => {
    patch(r.menuItemId, { available: on });
    message.success(on ? "Đã bật bán món hôm nay" : "Đã tạm ngừng bán món hôm nay");
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Món tại chi nhánh"
        sub="Tên, giá, ảnh do Owner quản ở cấp chuỗi — chi nhánh chỉ bật/tắt bán và đặt số suất"
      />
      <Table<Row>
        dataSource={rows}
        rowKey="menuItemId"
        pagination={false}
        size="middle"
        columns={[
          {
            title: "Món",
            dataIndex: "name",
            render: (v, r) => (
              <div style={{ opacity: r.activeChain ? 1 : 0.45 }}>
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                  {v}
                  {!r.activeChain && <Tag>Chuỗi đã tắt</Tag>}
                </div>
                <div style={{ fontSize: 12, color: "#a1a1aa" }}>{r.category}</div>
              </div>
            ),
          },
          {
            title: "Giá",
            dataIndex: "price",
            align: "right",
            render: (v) => <span style={{ color: "#a1a1aa" }}>{money(v)}</span>,
          },
          {
            title: "Còn bán hôm nay",
            dataIndex: "available",
            align: "center",
            render: (on: boolean, r) =>
              r.activeChain ? (
                <Switch checked={on} size="small" onChange={(c) => toggle(r, c)} />
              ) : (
                <Switch checked={false} size="small" disabled />
              ),
          },
          {
            title: "Suất còn lại",
            dataIndex: "remaining",
            align: "right",
            render: (rem: number | null, r) => {
              if (!r.activeChain) {
                return <span style={{ fontSize: 12, color: "#a1a1aa" }}>Owner tắt món này</span>;
              }
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  {rem === 0 && (
                    <Tag color="black" icon={<TriangleAlert size={12} />} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      Hết suất
                    </Tag>
                  )}
                  <InputNumber
                    value={rem ?? undefined}
                    placeholder="∞"
                    min={0}
                    size="small"
                    style={{ width: 92 }}
                    onChange={(v) => patch(r.menuItemId, { remaining: v ?? 0 })}
                  />
                  <Button
                    size="small"
                    icon={<InfinityIcon size={14} />}
                    type={rem === null ? "primary" : "default"}
                    onClick={() => patch(r.menuItemId, { remaining: null })}
                  >
                    Không giới hạn
                  </Button>
                </div>
              );
            },
          },
        ]}
      />
    </Card>
  );
}
