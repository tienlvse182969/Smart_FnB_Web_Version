import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, App, Card, Empty, Input, Switch, Tabs, Tag, Tooltip } from "antd";
import { money } from "../../data";
import type { BranchMenuItem, BranchOptionRow } from "../../types";
import { SectionTitle } from "../../components/bits";
import { branchOptionsApi, groupBranchOptions, showApiError } from "../../api";
import { useAppStore } from "../../store";
import { ActionSwitch } from "../../plan/ActionButton";
import { palette } from "../../theme";
import {
  listBranchCombos, listBranchExtras,
  setBranchComboAvailability, setBranchExtraAvailability,
  type BranchCombo, type BranchExtra,
} from "../../api/modules/branchMenuAvailability";

/** Gộp hoa/thường và dấu để tìm theo tên. */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

const OWNER_OFF_HINT = "Owner đã tắt, chi nhánh không bật lại được";
const rowStyle = (ownerDisabled: boolean) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderTop: `1px solid ${palette.lineSubtle}`,
  background: ownerDisabled ? palette.paperSubtle : undefined,
  opacity: ownerDisabled ? 0.7 : 1,
});

/** Công tắc của dòng bị Owner tắt: luôn khoá, tooltip nêu lý do, không gọi API. */
function OwnerLockedSwitch({ testId }: { testId: string }) {
  return (
    <Tooltip title={OWNER_OFF_HINT}>
      <span style={{ display: "inline-block" }}>
        <Switch size="small" data-testid={testId} checked={false} disabled />
      </span>
    </Tooltip>
  );
}

function SwitchCell({ children }: { children: ReactNode }) {
  return (
    <span style={{ width: 170, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, fontSize: 13 }}>
      Còn bán hôm nay
      {children}
    </span>
  );
}

/**
 * Món và tuỳ chọn tại chi nhánh (BM-02, BR-12) — tên/giá/ảnh thuộc Owner, chi nhánh chỉ bật/tắt "còn bán hôm nay".
 * Hai tab dùng state cục bộ (không đổi URL: không có lý do liên kết thẳng vào một tab) và dùng chung ô tìm kiếm.
 * Món — real: BE chỉ trả món Owner đang bật nên dòng "Owner đã tắt" chỉ có ở mock (api-contract-plan #19); web chỉ gửi `isAvailable`.
 * Tuỳ chọn — `branchOptionsApi` (real `/manager/menu-options`): Owner tắt = tuỳ chọn hoặc nhóm bị tắt; BE vẫn lưu cờ nếu gửi, nên web khoá công tắc.
 */
export default function BranchMenu() {
  const { message, modal } = App.useApp();
  const branchMenu = useAppStore((s) => s.branchMenu);
  const toggleMenuItemAvailability = useAppStore((s) => s.toggleMenuItemAvailability);
  const currentBranchId = useAppStore((s) => s.currentBranchId);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<BranchOptionRow[]>([]);
  const [extras, setExtras] = useState<BranchExtra[]>([]);
  const [combos, setCombos] = useState<BranchCombo[]>([]);

  const loadExtraCombos = useCallback(async () => {
    if (!currentBranchId) { setExtras([]); setCombos([]); return; }
    const [extraResult, comboResult] = await Promise.allSettled([listBranchExtras(), listBranchCombos()]);
    if (extraResult.status === "fulfilled") setExtras(extraResult.value);
    else showApiError(message.error, extraResult.reason, "Không tải được topping tại chi nhánh");
    if (comboResult.status === "fulfilled") setCombos(comboResult.value);
    else showApiError(message.error, comboResult.reason, "Không tải được combo tại chi nhánh");
  }, [currentBranchId, message]);

  const loadOptions = useCallback(async () => {
    if (!currentBranchId) {
      setOptions([]);
      return;
    }
    try {
      setOptions(await branchOptionsApi.listBranchStates(currentBranchId));
    } catch (err) {
      showApiError(message.error, err, "Không tải được tuỳ chọn");
    }
  }, [currentBranchId, message]);

  useEffect(() => {
    void loadOptions();
    void loadExtraCombos();
  }, [loadOptions, loadExtraCombos]);

  const needle = fold(search.trim());

  const itemGroups = useMemo(() => {
    const byCategory = new Map<string, BranchMenuItem[]>();
    for (const item of branchMenu) {
      if (needle && !fold(item.name).includes(needle)) continue;
      byCategory.set(item.categoryName, [...(byCategory.get(item.categoryName) ?? []), item]);
    }
    return [...byCategory.entries()];
  }, [branchMenu, needle]);

  const optionGroups = useMemo(
    () => groupBranchOptions(options).map((g) => ({ ...g, options: g.options.filter((o) => !needle || fold(o.name).includes(needle) || fold(g.groupName).includes(needle)) })).filter((g) => g.options.length > 0),
    [options, needle],
  );

  const writeItem = async (item: BranchMenuItem, on: boolean) => {
    try {
      await toggleMenuItemAvailability(item.menuItemId, on);
      message.success(on ? "Đã bật bán món hôm nay" : "Đã tạm ngừng bán món hôm nay");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được");
    }
  };

  const toggleItem = (item: BranchMenuItem, on: boolean) => {
    if (on) {
      void writeItem(item, true);
      return;
    }
    modal.confirm({
      title: `Tắt bán "${item.name}"?`,
      content: <span data-testid="confirm-menu-off">Món sẽ ẩn khỏi POS của chi nhánh ngay.</span>,
      okText: "Tắt bán",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () => writeItem(item, false),
    });
  };

  const writeOption = async (row: BranchOptionRow, on: boolean) => {
    if (!currentBranchId || row.ownerDisabled) return; // dòng Owner tắt không bao giờ gọi API
    try {
      const result = await branchOptionsApi.setBranchOptionAvailable(currentBranchId, row.optionId, on);
      if (on) message.success("Đã bật bán tuỳ chọn hôm nay");
      else message.success(result.affectedOrderCount > 0 ? `Đã tắt. ${result.affectedOrderCount} đơn đã thanh toán chuyển Hết món.` : "Đã tắt.");
    } catch (err) {
      showApiError(message.error, err, "Không cập nhật được");
    }
    await loadOptions();
  };

  const toggleOption = (row: BranchOptionRow, on: boolean) => {
    if (on) {
      void writeOption(row, true);
      return;
    }
    modal.confirm({
      title: `Tắt bán "${row.name}"?`,
      content: (
        <span data-testid="confirm-option-off">
          Tuỳ chọn sẽ ẩn khỏi POS của chi nhánh ngay. Đơn đã thanh toán có tuỳ chọn này sẽ chuyển Hết món.
        </span>
      ),
      okText: "Tắt bán",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () => writeOption(row, false),
    });
  };

  const ownerTag = (
    <Tag style={{ marginLeft: 8 }} data-testid="owner-disabled-tag">
      Owner đã tắt
    </Tag>
  );

  const toggleExtra = (extra: BranchExtra, on: boolean) => {
    const save = async () => {
      try {
        await setBranchExtraAvailability(extra.id, on);
        message.success(on ? "Đã bật bán topping" : "Đã tắt bán topping tại chi nhánh");
        await loadExtraCombos();
      } catch (failure) { showApiError(message.error, failure, "Không cập nhật được topping"); }
    };
    if (on) void save();
    else modal.confirm({ title: `Tắt bán topping "${extra.name}"?`, content: "Topping sẽ ẩn khỏi POS của chi nhánh.", okText: "Tắt bán", okButtonProps: { danger: true }, onOk: save });
  };

  const toggleCombo = (row: BranchCombo, on: boolean) => {
    const save = async () => {
      try {
        await setBranchComboAvailability(row.comboId, on);
        message.success(on ? "Đã bật bán combo" : "Đã tắt bán combo tại chi nhánh");
        await loadExtraCombos();
      } catch (failure) { showApiError(message.error, failure, "Không cập nhật được combo"); }
    };
    if (on) void save();
    else modal.confirm({ title: `Tắt bán combo "${row.combo.name}"?`, content: "Combo sẽ ẩn khỏi POS của chi nhánh.", okText: "Tắt bán", okButtonProps: { danger: true }, onOk: save });
  };

  const itemsTab =
    itemGroups.length === 0 ? (
      <Empty description={search ? "Không có món khớp" : "Chi nhánh chưa có món"} />
    ) : (
      itemGroups.map(([category, items]) => (
        <div key={category} data-testid="branch-menu-group" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, margin: "8px 0", color: palette.textMuted }}>{category}</div>
          {items.map((item) => (
            <div key={item.menuItemId} data-testid="branch-menu-row" data-owner-disabled={item.ownerDisabled} style={rowStyle(item.ownerDisabled)}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                {item.ownerDisabled && ownerTag}
              </div>
              <span style={{ color: palette.textSubtle }}>{money(item.price)}</span>
              <SwitchCell>
                {item.ownerDisabled ? (
                  <OwnerLockedSwitch testId="branch-menu-switch" />
                ) : (
                  <ActionSwitch size="small" data-testid="branch-menu-switch" checked={item.isAvailable} onChange={(on) => toggleItem(item, on)} />
                )}
              </SwitchCell>
            </div>
          ))}
        </div>
      ))
    );

  const optionsTab =
    optionGroups.length === 0 ? (
      <Empty description={search ? "Không có tuỳ chọn khớp" : "Chuỗi chưa có tuỳ chọn"} />
    ) : (
      optionGroups.map((g) => (
        <div key={g.groupId} data-testid="branch-option-group" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, margin: "8px 0", color: palette.textMuted }}>{g.groupName}</div>
          {g.options.map((o) => (
            <div key={o.optionId} data-testid="branch-option-row" data-owner-disabled={o.ownerDisabled} style={rowStyle(o.ownerDisabled)}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{o.name}</span>
                {o.ownerDisabled && ownerTag}
              </div>
              <span style={{ color: palette.textSubtle }}>{o.priceDelta === 0 ? "Không cộng thêm" : `+${o.priceDelta.toLocaleString("vi-VN")}đ`}</span>
              <SwitchCell>
                {o.ownerDisabled ? (
                  <OwnerLockedSwitch testId="branch-option-switch" />
                ) : (
                  <ActionSwitch size="small" data-testid="branch-option-switch" checked={o.isAvailable} onChange={(on) => toggleOption(o, on)} />
                )}
              </SwitchCell>
            </div>
          ))}
        </div>
      ))
    );

  const extrasTab = extras.filter((extra) => !needle || fold(extra.name).includes(needle)).map((extra) => (
    <div key={extra.id} data-testid="branch-extra-row" style={rowStyle(!extra.chainAvailable)}>
      <div style={{ flex: 1 }}><b>{extra.name}</b>{!extra.chainAvailable && ownerTag}</div>
      <span style={{ color: palette.textSubtle }}>{money(Number(extra.price))}</span>
      <SwitchCell>{extra.chainAvailable ? (
        <ActionSwitch size="small" checked={extra.branchAvailable} onChange={(on) => toggleExtra(extra, on)} />
      ) : <OwnerLockedSwitch testId="branch-extra-locked" />}</SwitchCell>
    </div>
  ));

  const combosTab = combos.filter((row) => !needle || fold(row.combo.name).includes(needle)).map((row) => (
    <div key={row.comboId} data-testid="branch-combo-row" style={rowStyle(!row.combo.isActive)}>
      <div style={{ flex: 1 }}><b>{row.combo.name}</b>{!row.combo.isActive && ownerTag}</div>
      <span style={{ color: palette.textSubtle }}>{money(Number(row.combo.price))}</span>
      <SwitchCell>{row.combo.isActive ? (
        <ActionSwitch size="small" checked={row.isAvailable} onChange={(on) => toggleCombo(row, on)} />
      ) : <OwnerLockedSwitch testId="branch-combo-locked" />}</SwitchCell>
    </div>
  ));

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
        placeholder="Tìm theo tên"
        style={{ maxWidth: 300, marginBottom: 6 }}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Tabs
        defaultActiveKey="items"
        items={[
          { key: "items", label: "Món", children: itemsTab },
          { key: "options", label: "Tuỳ chọn", children: optionsTab },
          { key: "extras", label: "Topping", children: extrasTab.length ? extrasTab : <Empty description="Chưa có topping" /> },
          { key: "combos", label: "Combo", children: combosTab.length ? combosTab : <Empty description="Chưa có combo" /> },
        ]}
      />
    </Card>
  );
}
