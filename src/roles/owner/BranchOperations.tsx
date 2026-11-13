import { Alert, App, Button, Drawer, Empty, Input, Space, Spin, Switch, Tabs } from "antd";
import { useCallback, useEffect, useState } from "react";
import { branchApi, describeApiError, showApiError } from "../../api";
import type { ApiBranchDetail, ApiOperatingHour, ApiSpecialHour } from "../../types";
import { palette } from "../../theme";
import ActionButton from "../../plan/ActionButton";

const DAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const weekRows = (saved: ApiOperatingHour[]) => DAYS.map((_, dayOfWeek) => saved.find((hour) => hour.dayOfWeek === dayOfWeek) ?? {
  dayOfWeek, isClosed: true, openTime: null, closeTime: null,
});

type Props = { branchId: string | null; onClose: () => void; onArchived: () => Promise<void> };

export default function BranchOperations({ branchId, onClose, onArchived }: Props) {
  const { message, modal } = App.useApp();
  const [detail, setDetail] = useState<ApiBranchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hours, setHours] = useState<ApiOperatingHour[]>([]);
  const [special, setSpecial] = useState<ApiSpecialHour[]>([]);
  const [date, setDate] = useState("");
  const [specialClosed, setSpecialClosed] = useState(false);
  const [specialOpen, setSpecialOpen] = useState("08:00");
  const [specialClose, setSpecialClose] = useState("22:00");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await branchApi.getBranch(branchId);
      setDetail(next);
      setHours(weekRows(next.operatingHours ?? []));
      setSpecial(next.specialHours ?? []);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    if (branchId) void load();
    else { setDetail(null); setError(null); }
  }, [branchId, load]);

  const run = async (work: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await work();
      message.success(success);
    } catch (err) {
      showApiError(message.error, err);
    } finally {
      setBusy(false);
    }
  };

  const updateHour = (dayOfWeek: number, patch: Partial<ApiOperatingHour>) =>
    setHours((current) => current.map((hour) => hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour));

  const saveHour = (hour: ApiOperatingHour) => {
    if (!branchId) return;
    if (!hour.isClosed && (!TIME.test(hour.openTime ?? "") || !TIME.test(hour.closeTime ?? ""))) {
      message.error("Giờ mở và đóng cửa phải có dạng HH:mm");
      return;
    }
    void run(async () => {
      await branchApi.saveOperatingHour(branchId, hour.dayOfWeek, {
        isClosed: hour.isClosed,
        ...(!hour.isClosed ? { openTime: hour.openTime!, closeTime: hour.closeTime! } : {}),
      });
      setHours(weekRows(await branchApi.listOperatingHours(branchId)));
    }, `Đã lưu giờ hoạt động ${DAYS[hour.dayOfWeek]}`);
  };

  const editSpecial = (item: ApiSpecialHour) => {
    setDate(item.date.slice(0, 10));
    setSpecialClosed(item.isClosed);
    setSpecialOpen(item.openTime ?? "08:00");
    setSpecialClose(item.closeTime ?? "22:00");
    setNote(item.note ?? "");
  };

  const saveSpecial = () => {
    if (!branchId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { message.error("Vui lòng chọn ngày"); return; }
    if (!specialClosed && (!TIME.test(specialOpen) || !TIME.test(specialClose))) {
      message.error("Giờ mở và đóng cửa phải có dạng HH:mm"); return;
    }
    void run(async () => {
      await branchApi.saveSpecialHour(branchId, date, {
        isClosed: specialClosed,
        ...(!specialClosed ? { openTime: specialOpen, closeTime: specialClose } : {}),
        note: note.trim(),
      });
      setSpecial(await branchApi.listSpecialHours(branchId));
      setDate(""); setNote("");
    }, "Đã lưu lịch ngày đặc biệt");
  };

  const removeSpecial = (item: ApiSpecialHour) => {
    if (!branchId) return;
    const day = item.date.slice(0, 10);
    modal.confirm({
      title: `Xoá lịch ngày ${day}?`,
      okText: "Xoá lịch", okButtonProps: { danger: true }, cancelText: "Huỷ",
      onOk: () => run(async () => {
        await branchApi.deleteSpecialHour(branchId, day);
        setSpecial(await branchApi.listSpecialHours(branchId));
      }, "Đã xoá lịch ngày đặc biệt"),
    });
  };

  const archive = () => {
    if (!branchId || !detail) return;
    modal.confirm({
      title: `Lưu trữ chi nhánh “${detail.name}”?`,
      content: "Chi nhánh sẽ ngừng hoạt động và nhường lại hạn mức gói. Không thể lưu trữ khi còn lượt bàn đang mở.",
      okText: "Lưu trữ", okButtonProps: { danger: true }, cancelText: "Huỷ",
      onOk: () => run(async () => {
        await branchApi.archiveBranch(branchId);
        await onArchived();
        onClose();
      }, "Đã lưu trữ chi nhánh"),
    });
  };

  return (
    <Drawer title={detail ? `Quản lý · ${detail.name}` : "Quản lý chi nhánh"} open={!!branchId} onClose={onClose} destroyOnHidden size={720}>
      {loading && <div style={{ padding: 40, textAlign: "center" }}><Spin /><div style={{ marginTop: 8, color: palette.textMuted }}>Đang tải chi tiết chi nhánh…</div></div>}
      {error && <Alert type="error" showIcon message="Không tải được chi nhánh" description={error} action={<Button onClick={() => void load()}>Thử lại</Button>} />}
      {!loading && !error && detail && <Tabs items={[
        { key: "hours", label: "Giờ hoạt động", children: <div>
          <p style={{ color: palette.textMuted }}>Đặt lịch riêng cho từng ngày. Ngày đóng cửa sẽ không cần giờ mở và đóng.</p>
          {hours.map((hour) => <div key={hour.dayOfWeek} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 0", borderBottom: "1px solid var(--ant-color-border)" }}>
            <span style={{ width: 75, fontWeight: 600 }}>{DAYS[hour.dayOfWeek]}</span>
            <Switch checked={hour.isClosed} onChange={(isClosed) => updateHour(hour.dayOfWeek, { isClosed })} aria-label={`Đóng cửa ${DAYS[hour.dayOfWeek]}`} />
            <span>{hour.isClosed ? "Nghỉ" : "Mở"}</span>
            <Input aria-label={`Giờ mở ${DAYS[hour.dayOfWeek]}`} type="time" value={hour.openTime ?? ""} disabled={hour.isClosed} onChange={(e) => updateHour(hour.dayOfWeek, { openTime: e.target.value })} style={{ width: 115 }} />
            <Input aria-label={`Giờ đóng ${DAYS[hour.dayOfWeek]}`} type="time" value={hour.closeTime ?? ""} disabled={hour.isClosed} onChange={(e) => updateHour(hour.dayOfWeek, { closeTime: e.target.value })} style={{ width: 115 }} />
            <ActionButton loading={busy} data-testid={`hour-save-${hour.dayOfWeek}`} onClick={() => saveHour(hour)}>Lưu</ActionButton>
          </div>)}
        </div> },
        { key: "special", label: "Ngày đặc biệt", children: <div>
          <Space wrap style={{ marginBottom: 16 }}>
            <Input type="date" aria-label="Ngày đặc biệt" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 155 }} />
            <Switch checked={specialClosed} onChange={setSpecialClosed} aria-label="Đóng cửa ngày đặc biệt" />
            <span>Nghỉ</span>
            <Input type="time" aria-label="Giờ mở ngày đặc biệt" value={specialOpen} disabled={specialClosed} onChange={(e) => setSpecialOpen(e.target.value)} style={{ width: 115 }} />
            <Input type="time" aria-label="Giờ đóng ngày đặc biệt" value={specialClose} disabled={specialClosed} onChange={(e) => setSpecialClose(e.target.value)} style={{ width: 115 }} />
          </Space>
          <Input aria-label="Ghi chú ngày đặc biệt" placeholder="Ghi chú (tuỳ chọn)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 12 }} />
          <ActionButton type="primary" loading={busy} data-testid="special-save" onClick={saveSpecial}>Lưu ngày đặc biệt</ActionButton>
          {special.length === 0 ? <Empty description="Chưa có lịch ngày đặc biệt" /> : special.map((item) => <div key={item.date} style={{ padding: "12px 0", borderBottom: "1px solid var(--ant-color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div><b>{item.date.slice(0, 10)}</b> · {item.isClosed ? "Nghỉ" : `${item.openTime}–${item.closeTime}`} {item.note && <span style={{ color: palette.textMuted }}>· {item.note}</span>}</div>
            <Space><Button onClick={() => editSpecial(item)}>Sửa</Button><ActionButton danger data-testid="special-delete" onClick={() => removeSpecial(item)}>Xoá</ActionButton></Space>
          </div>)}
        </div> },
        { key: "archive", label: "Lưu trữ", children: <Alert type="warning" showIcon message="Lưu trữ chi nhánh" description="Thao tác này ngừng hoạt động chi nhánh và giải phóng hạn mức của gói." action={<ActionButton danger data-testid="branch-archive" onClick={archive}>Lưu trữ chi nhánh</ActionButton>} /> },
      ]} />}
    </Drawer>
  );
}
