import { Alert, App, Button, Drawer, Empty, Input, InputNumber, Select, Space, Spin, Switch, Tabs, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";
import { branchApi, describeApiError, showApiError } from "../../api";
import type { ApiBranchArea, ApiBranchAreaInput, ApiBranchAreaType, ApiBranchDetail, ApiOperatingHour, ApiSpecialHour } from "../../types";
import { palette } from "../../theme";

const DAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const AREA_TYPES: { value: ApiBranchAreaType; label: string }[] = [
  { value: "DINING", label: "Khu ăn uống" },
  { value: "KITCHEN", label: "Bếp" },
  { value: "BAR", label: "Quầy pha chế" },
  { value: "CASHIER", label: "Thu ngân" },
  { value: "PICKUP", label: "Nhận món" },
];
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
  const [areas, setAreas] = useState<ApiBranchArea[]>([]);
  const [date, setDate] = useState("");
  const [specialClosed, setSpecialClosed] = useState(false);
  const [specialOpen, setSpecialOpen] = useState("08:00");
  const [specialClose, setSpecialClose] = useState("22:00");
  const [note, setNote] = useState("");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [area, setArea] = useState<ApiBranchAreaInput>({ code: "", name: "", type: "DINING", floor: 1 });

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await branchApi.getBranch(branchId);
      setDetail(next);
      setHours(weekRows(next.operatingHours ?? []));
      setSpecial(next.specialHours ?? []);
      setAreas(next.areas ?? []);
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

  const saveArea = () => {
    if (!branchId || !area.code.trim() || !area.name.trim()) { message.error("Nhập mã và tên khu vực"); return; }
    void run(async () => {
      const input = { ...area, code: area.code.trim().toUpperCase(), name: area.name.trim() };
      if (areaId) await branchApi.updateArea(branchId, areaId, input);
      else await branchApi.createArea(branchId, input);
      setAreas(await branchApi.listAreas(branchId));
      setAreaId(null);
      setArea({ code: "", name: "", type: "DINING", floor: 1 });
    }, areaId ? "Đã cập nhật khu vực" : "Đã thêm khu vực");
  };

  const toggleArea = (item: ApiBranchArea) => {
    if (!branchId) return;
    void run(async () => {
      await branchApi.updateAreaStatus(branchId, item.id, item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      setAreas(await branchApi.listAreas(branchId));
    }, "Đã đổi trạng thái khu vực");
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
    <Drawer title={detail ? `Quản lý · ${detail.name}` : "Quản lý chi nhánh"} open={!!branchId} onClose={onClose} destroyOnHidden width={720}>
      {loading && <div style={{ padding: 40, textAlign: "center" }}><Spin tip="Đang tải chi tiết chi nhánh…" /></div>}
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
            <Button loading={busy} onClick={() => saveHour(hour)}>Lưu</Button>
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
          <Button type="primary" loading={busy} onClick={saveSpecial}>Lưu ngày đặc biệt</Button>
          {special.length === 0 ? <Empty description="Chưa có lịch ngày đặc biệt" /> : special.map((item) => <div key={item.date} style={{ padding: "12px 0", borderBottom: "1px solid var(--ant-color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div><b>{item.date.slice(0, 10)}</b> · {item.isClosed ? "Nghỉ" : `${item.openTime}–${item.closeTime}`} {item.note && <span style={{ color: palette.textMuted }}>· {item.note}</span>}</div>
            <Space><Button onClick={() => editSpecial(item)}>Sửa</Button><Button danger onClick={() => removeSpecial(item)}>Xoá</Button></Space>
          </div>)}
        </div> },
        { key: "areas", label: "Khu vực", children: <div>
          <Space wrap style={{ marginBottom: 12 }}>
            <Input aria-label="Mã khu vực" placeholder="Mã khu vực" value={area.code} maxLength={50} onChange={(e) => setArea({ ...area, code: e.target.value })} style={{ width: 150 }} />
            <Input aria-label="Tên khu vực" placeholder="Tên khu vực" value={area.name} maxLength={150} onChange={(e) => setArea({ ...area, name: e.target.value })} style={{ width: 190 }} />
            <Select aria-label="Loại khu vực" value={area.type} onChange={(type) => setArea({ ...area, type })} options={AREA_TYPES} style={{ width: 155 }} />
            <InputNumber aria-label="Tầng" min={-10} max={200} value={area.floor} onChange={(floor) => setArea({ ...area, floor: floor ?? 1 })} style={{ width: 75 }} />
          </Space>
          <Space><Button type="primary" loading={busy} onClick={saveArea}>{areaId ? "Lưu khu vực" : "Thêm khu vực"}</Button>{areaId && <Button onClick={() => { setAreaId(null); setArea({ code: "", name: "", type: "DINING", floor: 1 }); }}>Huỷ sửa</Button>}</Space>
          {areas.length === 0 ? <Empty description="Chưa có khu vực" /> : areas.map((item) => <div key={item.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--ant-color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div><b>{item.name}</b> · {item.code} · {AREA_TYPES.find((type) => type.value === item.type)?.label} · Tầng {item.floor} <Tag color={item.status === "ACTIVE" ? "green" : "default"}>{item.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}</Tag></div>
            <Space><Button onClick={() => { setAreaId(item.id); setArea({ code: item.code, name: item.name, type: item.type, floor: item.floor }); }}>Sửa</Button><Button loading={busy} onClick={() => toggleArea(item)}>{item.status === "ACTIVE" ? "Tạm ngưng" : "Mở lại"}</Button></Space>
          </div>)}
        </div> },
        { key: "archive", label: "Lưu trữ", children: <Alert type="warning" showIcon message="Lưu trữ chi nhánh" description="Thao tác này ngừng hoạt động chi nhánh và giải phóng hạn mức của gói." action={<Button danger onClick={archive}>Lưu trữ chi nhánh</Button>} /> },
      ]} />}
    </Drawer>
  );
}
