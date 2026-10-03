import { useMemo, useState } from "react";
import { Alert, App, Card, Empty, Input, Tag } from "antd";
import { money } from "../../data";
import type { BranchMenuItem } from "../../types";
import { SectionTitle } from "../../components/bits";
import { showApiError } from "../../api";
import { useAppStore } from "../../store";
import { ActionSwitch } from "../../plan/ActionButton";
import { palette } from "../../theme";

/** Gộp hoa/thường và dấu để tìm tên món. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

/**
 * Món tại chi nhánh (BM-02, BR-12) — tên/giá/ảnh thuộc Owner, chi nhánh chỉ bật/tắt "còn bán hôm nay".
 * Real: BE chỉ trả món Owner đang bật và đã gán chi nhánh, nên dòng "Owner đã tắt" chỉ có ở mock (api-contract-plan #19).
 * Web chỉ gửi `isAvailable`; không bao giờ gửi `isEnabled` hay `remainingPortions`.
 */
export default function BranchMenu() {
  const { message, modal } = App.useApp();
  const branchMenu = useAppStore((s) => s.branchMenu);
  const toggleMenuItemAvailability = useAppStore((s) => s.toggleMenuItemAvailability);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const needle = fold(search.trim());
    const byCategory = new Map<string, BranchMenuItem[]>();
    for (const item of branchMenu) {
      if (needle && !fold(item.name).includes(needle)) continue;
      byCategory.set(item.categoryName, [...(byCategory.get(item.categoryName) ?? []), item]);
    }
    return [...byCategory.entries()];
  }, [branchMenu, search]);

  const write = async (item: BranchMenuItem, on: boolean) => {
    try {
      await toggleMenuItemAvailability(item.menuItemId, on);
      message.success(on ? "Đã bật bán món hôm nay" : "Đã tạm ngừng bán món hôm nay");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được");
    }
  };

  const toggle = (item: BranchMenuItem, on: boolean) => {
    if (on) {
      void write(item, true);
      return;
    }
    modal.confirm({
      title: `Tắt bán "${item.name}"?`,
      content: <span data-testid="confirm-menu-off">Món sẽ ẩn khỏi POS của chi nhánh ngay.</span>,
      okText: "Tắt bán",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () => write(item, false),
    });
  };

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle title="Món tại chi nhánh" />
      <Alert
        type="info"
        showIcon
        data-testid="branch-menu-banner"
        style={{ marginBottom: 14 }}
        message="Bật/tắt chỉ áp dụng cho chi nhánh này trong ngày. Tên, giá, ảnh do Owner quản lý."
      />
      <Input.Search
        allowClear
        data-testid="branch-menu-search"
        placeholder="Tìm theo tên món"
        style={{ maxWidth: 300, marginBottom: 14 }}
        onChange={(e) => setSearch(e.target.value)}
      />
      {groups.length === 0 && <Empty description={search ? "Không có món khớp" : "Chi nhánh chưa có món"} />}
      {groups.map(([category, items]) => (
        <div key={category} data-testid="branch-menu-group" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, margin: "8px 0", color: palette.textMuted }}>{category}</div>
          {items.map((item) => (
            <div
              key={item.menuItemId}
              data-testid="branch-menu-row"
              data-owner-disabled={item.ownerDisabled}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderTop: `1px solid ${palette.lineSubtle}`,
                background: item.ownerDisabled ? palette.paperSubtle : undefined,
                opacity: item.ownerDisabled ? 0.7 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                {item.ownerDisabled && (
                  <Tag style={{ marginLeft: 8 }} data-testid="owner-disabled-tag">
                    Owner đã tắt
                  </Tag>
                )}
              </div>
              <span style={{ color: palette.textSubtle }}>{money(item.price)}</span>
              <span style={{ width: 150, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, fontSize: 13 }}>
                Còn bán hôm nay
                <ActionSwitch
                  size="small"
                  data-testid="branch-menu-switch"
                  checked={item.isAvailable}
                  disabled={item.ownerDisabled}
                  onChange={(on) => toggle(item, on)}
                />
              </span>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}
