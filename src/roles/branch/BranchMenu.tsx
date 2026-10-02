import { App, Card, Switch, Table } from "antd";
import { money } from "../../data";
import type { BranchMenuItem } from "../../types";
import { SectionTitle } from "../../components/bits";
import { showApiError } from "../../api";
import { useAppStore } from "../../store";
import { useWriteGuard } from "../../plan/useReadOnly";
import { palette } from "../../theme";

/**
 * Món tại chi nhánh (đặc tả 4.5, BR-12) — tên/giá/ảnh thuộc Owner, chi nhánh chỉ bật/tắt "còn bán hôm nay". BE chỉ trả món Owner
 * đang bật và đã gán cho chi nhánh, nên không có dòng "Owner tắt món". Màn này sẽ làm lại ở giai đoạn 5.
 */
export default function BranchMenu() {
  const { message } = App.useApp();
  const branchMenu = useAppStore((s) => s.branchMenu);
  const toggleMenuItemAvailability = useAppStore((s) => s.toggleMenuItemAvailability);
  const writeGuard = useWriteGuard();

  const toggle = async (r: BranchMenuItem, on: boolean) => {
    try {
      await toggleMenuItemAvailability(r.menuItemId, on);
      message.success(on ? "Đã bật bán món hôm nay" : "Đã tạm ngừng bán món hôm nay");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được");
    }
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Món tại chi nhánh" sub="Tên, giá, ảnh do Owner quản ở cấp chuỗi — chi nhánh chỉ bật/tắt bán trong ngày" />
      <Table<BranchMenuItem>
        dataSource={branchMenu}
        rowKey="menuItemId"
        pagination={false}
        size="middle"
        columns={[
          {
            title: "Món",
            dataIndex: "name",
            render: (v: string, r) => (
              <div>
                <div style={{ fontWeight: 600 }}>{v}</div>
                <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.categoryName}</div>
              </div>
            ),
          },
          {
            title: "Giá",
            dataIndex: "price",
            align: "right",
            render: (v: number) => <span style={{ color: palette.textSubtle }}>{money(v)}</span>,
          },
          {
            title: "Còn bán hôm nay",
            dataIndex: "isAvailable",
            align: "center",
            render: (on: boolean, r) => <Switch checked={on} size="small" disabled={writeGuard.disabled} onChange={(c) => toggle(r, c)} />,
          },
        ]}
      />
    </Card>
  );
}
