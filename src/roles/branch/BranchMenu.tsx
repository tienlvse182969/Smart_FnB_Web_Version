import { App, Button, Card, InputNumber, Switch, Table, Tag } from "antd";
import { Infinity as InfinityIcon, TriangleAlert } from "lucide-react";
import { money } from "../../data";
import type { BranchMenuItem } from "../../types";
import { SectionTitle } from "../../components/bits";
import { useAppStore } from "../../store";

type Row = BranchMenuItem & {
  name: string;
  category: string;
  price: number;
  activeChain: boolean;
};

/** Món tại chi nhánh (mục 4.5.G, BR-06) — tên/giá/ảnh thuộc Owner, chỉ bật/tắt & đặt số suất ở đây. */
export default function BranchMenu() {
  const { message } = App.useApp();
  const menuItems = useAppStore((s) => s.menuItems);
  const branchMenuItems = useAppStore((s) => s.branchMenuItems);
  const toggleMenuItemAvailability = useAppStore((s) => s.toggleMenuItemAvailability);
  const updateRemainingToday = useAppStore((s) => s.updateRemainingToday);

  const rows: Row[] = branchMenuItems
    .map((b) => {
      const m = menuItems.find((x) => x.id === b.menuItemId);
      if (!m) return null;
      return { ...b, name: m.name, category: m.category, price: m.price, activeChain: m.activeChain };
    })
    .filter((r): r is Row => r !== null);

  const toggle = async (r: Row, on: boolean) => {
    try {
      await toggleMenuItemAvailability(r.menuItemId, on);
      message.success(on ? "Đã bật bán món hôm nay" : "Đã tạm ngừng bán món hôm nay");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Không cập nhật được");
    }
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
            dataIndex: "isAvailable",
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
            dataIndex: "remainingToday",
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
                    onChange={(v) => updateRemainingToday(r.menuItemId, v ?? 0)}
                  />
                  <Button
                    size="small"
                    icon={<InfinityIcon size={14} />}
                    type={rem === null ? "primary" : "default"}
                    onClick={() => updateRemainingToday(r.menuItemId, null)}
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
