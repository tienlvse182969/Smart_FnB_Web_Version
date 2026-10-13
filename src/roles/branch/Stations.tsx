import { App, Card, Input, Modal, Radio, Table, Tag, Tooltip } from "antd";
import { Link2, Pencil, Plus, Unlink } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PRINTER_CONNECTION_LABEL, type BranchDevice, type DisplayKind, type PrinterConnection, type Station, type StationDevice, type StationInput, type StationPatch } from "../../types";
import { branchDeviceState, showApiError, stationsApi, validateStationInput, validateStationPatch } from "../../api";
import { describePairingError, isPairingCode } from "../../api/modules/stations/pairing";
import ActionButton from "../../plan/ActionButton";
import { SectionTitle } from "../../components/bits";
import PairingCodeInput from "../../components/PairingCodeInput";
import { formatDateTime } from "../../lib/reportFormat";
import { relativeTime } from "../../lib/relativeTime";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

/**
 * BM-01: quầy và máy in của chi nhánh (đặc tả 11.10). Real `GET/POST/PATCH /stations`, `GET /display-devices`. Từ BE `fb7cae9`
 * (#27, #28, QĐ 126): đổi tên, ngừng/mở lại quầy (có hộp xác nhận), sửa máy in; xem và thu hồi màn hình gọi số theo `deviceId`.
 * Không giới hạn số quầy (Khánh đã chốt). Hết hạn gói thì chỉ đọc (ActionButton).
 */
export default function Stations() {
  const { message, modal } = App.useApp();
  const branchId = useAppStore((s) => s.currentBranchId);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  // Hộp ghép: màn hình khách (gắn một quầy) hoặc màn hình gọi số (gắn chi nhánh).
  const [pairing, setPairing] = useState<{ kind: DisplayKind; station?: Station } | null>(null);

  const revoke = (station: Station, device: StationDevice) => {
    modal.confirm({
      title: `Thu hồi ${device.name ?? "màn hình khách"}?`,
      content: (
        <div data-testid="confirm-revoke" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          <b>{device.name ?? "Màn hình khách"}</b> ở <b>{station.name}</b> (ghép {formatDateTime(device.pairedAt)}) sẽ không nhận được dữ liệu của quầy nữa; muốn dùng lại phải ghép lại bằng mã mới.
        </div>
      ),
      okText: "Thu hồi",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!branchId) return;
        try {
          await stationsApi.revokeDevice(branchId, device.id);
          message.success("Đã thu hồi thiết bị");
        } catch (err) {
          showApiError(message.error, err, "Không thu hồi được thiết bị");
        } finally {
          await load();
        }
      },
    });
  };

  const [editing, setEditing] = useState<Station | null>(null);
  // Màn hình gọi số của chi nhánh (BE `GET /display-devices`, #28). null = chưa tải; lỗi tải không chặn phần quầy.
  const [calling, setCalling] = useState<BranchDevice[] | null>(null);
  const [callingError, setCallingError] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      setStations(await stationsApi.listStations(branchId));
    } catch (err) {
      showApiError(message.error, err, "Không tải được danh sách quầy");
    } finally {
      setLoading(false);
    }
    try {
      const devices = await stationsApi.listDisplayDevices(branchId);
      setCalling(devices.filter((d) => d.type === "CALLING_DISPLAY"));
      setCallingError(false);
    } catch {
      setCalling(null);
      setCallingError(true);
    }
  }, [branchId, message]);

  /** Sửa quầy; `confirmText` có nghĩa là thao tác cần hộp xác nhận (ngừng dùng). */
  const patchStation = async (station: Station, patch: StationPatch, success: string) => {
    if (!branchId) return false;
    try {
      await stationsApi.updateStation(branchId, station.id, patch);
      message.success(success);
      await load();
      return true;
    } catch (err) {
      showApiError(message.error, err, "Không sửa được quầy");
      return false;
    }
  };

  const toggleStatus = (station: Station) => {
    if (station.status === "ACTIVE") {
      modal.confirm({
        title: `Ngừng dùng ${station.name}?`,
        content: (
          <div data-testid="confirm-station-off" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
            Thu ngân không chọn được <b>{station.name}</b> trên POS và không ghép thêm màn hình khách vào quầy này. Mở lại bất cứ lúc nào.
          </div>
        ),
        okText: "Ngừng dùng",
        okButtonProps: { danger: true },
        cancelText: "Huỷ",
        onOk: async () => {
          await patchStation(station, { status: "INACTIVE" }, `Đã ngừng dùng ${station.name}`);
        },
      });
    } else {
      void patchStation(station, { status: "ACTIVE" }, `Đã mở lại ${station.name}`);
    }
  };

  const revokeCalling = (device: BranchDevice) => {
    modal.confirm({
      title: `Thu hồi ${device.name ?? "màn hình gọi số"}?`,
      content: (
        <div data-testid="confirm-revoke-calling" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          <b>{device.name ?? "Màn hình gọi số"}</b> (ghép {formatDateTime(device.pairedAt)}) sẽ ngừng hiển thị số của chi nhánh ngay; muốn dùng lại phải ghép lại bằng mã mới.
        </div>
      ),
      okText: "Thu hồi",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        if (!branchId) return;
        try {
          await stationsApi.revokeDevice(branchId, device.id);
          message.success("Đã thu hồi màn hình gọi số");
        } catch (err) {
          showApiError(message.error, err, "Không thu hồi được màn hình gọi số");
        } finally {
          await load();
        }
      },
    });
  };

  useEffect(() => {
    void load();
  }, [load]);

  const create = (input: StationInput) =>
    new Promise<void>((resolve) => {
      modal.confirm({
        title: `Tạo quầy "${input.name.trim()}"?`,
        content: (
          <div data-testid="confirm-station" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
            Máy in: <b>{PRINTER_CONNECTION_LABEL[input.printerConnection]}</b>
            {input.printerConnection !== "NONE" && <> · <b>{input.printerAddress?.trim()}</b></>}
            <br />
            Quầy mới ở trạng thái đang dùng; thu ngân chọn quầy này trên POS.
          </div>
        ),
        okText: "Tạo quầy",
        cancelText: "Huỷ",
        onCancel: () => resolve(),
        onOk: async () => {
          if (!branchId) return;
          try {
            await stationsApi.createStation(branchId, input);
            message.success("Đã tạo quầy");
            setAdding(false);
            await load();
          } catch (err) {
            showApiError(message.error, err, "Không tạo được quầy");
          } finally {
            resolve();
          }
        },
      });
    });

  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <SectionTitle
        title="Quầy và máy in"
        sub="Mỗi quầy gồm một tablet POS, tối đa một màn hình khách và một máy in; thu ngân chọn quầy khi đăng nhập POS"
        extra={
          <ActionButton type="primary" icon={<Plus size={15} />} data-testid="station-add" onClick={() => setAdding(true)}>
            Thêm quầy
          </ActionButton>
        }
      />
      <Table<Station>
        dataSource={stations}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 980 }}
        locale={{ emptyText: <span data-testid="stations-empty">Chưa có quầy nào — thêm quầy để thu ngân chọn khi đăng nhập POS</span> }}
        expandable={{
          // Mở rộng để xem màn hình khách đã ghép: tên, ngày ghép, lần cuối thấy, nút thu hồi (không bao giờ có token).
          rowExpandable: (r) => r.devices.length > 0,
          expandedRowRender: (station) => (
            <div data-testid={`station-devices-${station.name}`} style={{ display: "grid", gap: 8 }}>
              {station.devices.map((d) => (
                <div key={d.id} data-testid="station-device-row" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, minWidth: 180 }}>{d.name ?? "Màn hình khách"}</span>
                  <span style={{ color: palette.textMuted, fontSize: 13 }}>Ghép {formatDateTime(d.pairedAt)}</span>
                  <span data-testid="device-last-seen" style={{ color: palette.textMuted, fontSize: 13 }}>
                    Lần cuối thấy: {relativeTime(d.lastSeenAt)}
                  </span>
                  <ActionButton size="small" danger icon={<Unlink size={13} />} data-testid="device-revoke" onClick={() => revoke(station, d)}>
                    Thu hồi
                  </ActionButton>
                </div>
              ))}
            </div>
          ),
        }}
        columns={[
          { title: "Quầy", dataIndex: "name", render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span> },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (s: Station["status"]) => <Tag color={s === "ACTIVE" ? "green" : undefined}>{s === "ACTIVE" ? "Đang dùng" : "Ngừng dùng"}</Tag>,
          },
          {
            title: "Máy in",
            render: (_, r) =>
              r.printerConnection === "NONE" ? (
                <span style={{ color: palette.textSubtle }}>{PRINTER_CONNECTION_LABEL.NONE}</span>
              ) : (
                <div>
                  <div>{PRINTER_CONNECTION_LABEL[r.printerConnection]}</div>
                  <div style={{ fontSize: 12, color: palette.textSubtle }}>{r.printerAddress}</div>
                </div>
              ),
          },
          {
            title: "Màn hình đã ghép",
            render: (_, r) =>
              r.devices.length === 0 ? (
                <span style={{ color: palette.textSubtle }}>Chưa có</span>
              ) : (
                <Tooltip title={r.devices.map((d) => `${d.name ?? "Màn hình khách"} · ghép ${formatDateTime(d.pairedAt)}`).join("\n")}>
                  <span data-testid="station-devices">{r.devices.length} màn hình</span>
                </Tooltip>
              ),
          },
          {
            title: "",
            align: "right",
            render: (_, station) => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <ActionButton size="small" icon={<Link2 size={13} />} disabled={station.status !== "ACTIVE"} data-testid="station-pair" onClick={() => setPairing({ kind: "CUSTOMER_DISPLAY", station })}>
                  Ghép màn hình khách
                </ActionButton>
                <ActionButton size="small" icon={<Pencil size={13} />} data-testid="station-edit" onClick={() => setEditing(station)}>
                  Sửa
                </ActionButton>
                <ActionButton size="small" danger={station.status === "ACTIVE"} data-testid="station-toggle" onClick={() => toggleStatus(station)}>
                  {station.status === "ACTIVE" ? "Ngừng dùng" : "Dùng lại"}
                </ActionButton>
              </div>
            ),
          },
        ]}
      />

      <div data-testid="calling-display-section" style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${palette.line}` }}>
        <SectionTitle
          title="Màn hình gọi số"
          sub="Một màn hình ở khu nhận món của chi nhánh (TV hoặc tablet), ghép bằng mã như màn hình khách; ghép máy mới thì máy gọi số cũ bị thu hồi"
          extra={
            <ActionButton icon={<Link2 size={14} />} data-testid="calling-pair" onClick={() => setPairing({ kind: "CALLING_DISPLAY" })}>
              Ghép màn hình gọi số
            </ActionButton>
          }
        />
        {callingError ? (
          <div data-testid="calling-display-note" style={{ fontSize: 12.5, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "8px 12px" }}>
            Chưa tải được danh sách màn hình gọi số. Bấm "Thử lại" hoặc tải lại trang.{" "}
            <a onClick={() => void load()} data-testid="calling-retry">
              Thử lại
            </a>
          </div>
        ) : (
          <Table<BranchDevice>
            data-testid="calling-devices"
            rowKey="id"
            size="small"
            loading={calling === null}
            pagination={false}
            dataSource={calling ?? []}
            locale={{ emptyText: <span data-testid="calling-empty">Chi nhánh chưa ghép màn hình gọi số nào.</span> }}
            columns={[
              { title: "Tên máy", dataIndex: "name", render: (v: string | null) => <span style={{ fontWeight: 600 }}>{v ?? "Màn hình gọi số"}</span> },
              { title: "Ghép lúc", dataIndex: "pairedAt", render: (v: string) => formatDateTime(v) },
              { title: "Lần cuối thấy", dataIndex: "lastSeenAt", render: (v: string | null) => relativeTime(v) },
              { title: "Hạn token", dataIndex: "tokenExpiresAt", render: (v: string | null) => (v ? formatDateTime(v) : "—") },
              {
                title: "Trạng thái",
                key: "state",
                render: (_: unknown, d: BranchDevice) => {
                  const state = branchDeviceState(d);
                  return (
                    <Tag data-testid="calling-state" color={state === "ACTIVE" ? "green" : undefined}>
                      {state === "ACTIVE" ? "Đang dùng" : state === "REVOKED" ? "Đã thu hồi" : "Hết hạn (cần ghép lại)"}
                    </Tag>
                  );
                },
              },
              {
                title: "",
                align: "right",
                render: (_: unknown, d: BranchDevice) =>
                  branchDeviceState(d) === "REVOKED" ? null : (
                    <ActionButton size="small" danger icon={<Unlink size={13} />} data-testid="calling-revoke" onClick={() => revokeCalling(d)}>
                      Thu hồi
                    </ActionButton>
                  ),
              },
            ]}
          />
        )}
      </div>
      <EditStationModal station={editing} existing={stations} onClose={() => setEditing(null)} onSubmit={async (patch) => (editing ? patchStation(editing, patch, "Đã lưu quầy") : false)} />

      <AddStationModal open={adding} existing={stations} onClose={() => setAdding(false)} onSubmit={create} />
      <PairModal
        target={pairing}
        onClose={() => setPairing(null)}
        onPaired={async () => {
          setPairing(null);
          await load();
        }}
      />
    </Card>
  );
}

/** Hộp ghép màn hình bằng mã 6 số (BR-45). Mã do chính màn hình sinh, hết hạn sau 5 phút, dùng một lần. */
function PairModal({ target, onClose, onPaired }: { target: { kind: DisplayKind; station?: Station } | null; onClose: () => void; onPaired: () => Promise<void> }) {
  const { message, modal } = App.useApp();
  const branchId = useAppStore((s) => s.currentBranchId);
  const [code, setCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setCode("");
      setDeviceName("");
      setError(null);
    }
  }, [target]);

  if (!target) return <Modal open={false} footer={null} />;
  const { kind, station } = target;
  const customer = kind === "CUSTOMER_DISPLAY";
  const replaced = customer ? station?.devices.find((d) => d.type === "CUSTOMER_DISPLAY") : undefined;
  const label = customer ? "màn hình khách" : "màn hình gọi số";

  const submit = () => {
    modal.confirm({
      title: customer ? `Ghép ${label} vào ${station?.name}?` : `Ghép ${label} cho chi nhánh?`,
      content: (
        <div data-testid="confirm-pair" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          Mã ghép <b>{code}</b>
          {deviceName.trim() && <> · tên máy <b>{deviceName.trim()}</b></>}.
          {customer && replaced && (
            <div style={{ color: palette.warning.text }}>
              Quầy đã có màn hình: ghép máy mới sẽ thu hồi <b>{replaced.name ?? "màn hình khách hiện tại"}</b>.
            </div>
          )}
          {!customer && <div style={{ color: palette.textMuted }}>Nếu chi nhánh đã có màn hình gọi số, máy cũ sẽ bị thu hồi.</div>}
        </div>
      ),
      okText: "Ghép",
      cancelText: "Huỷ",
      onOk: async () => {
        if (!branchId) return;
        setError(null);
        try {
          if (customer && station) await stationsApi.pairCustomerDisplay(branchId, station.id, code, deviceName);
          else await stationsApi.pairCallingDisplay(branchId, code, deviceName);
          message.success(customer ? `Đã ghép màn hình khách vào ${station?.name}` : "Đã ghép màn hình gọi số");
          await onPaired();
        } catch (err) {
          const text = describePairingError(err, kind);
          if (text) setError(text);
          else showApiError(message.error, err, `Không ghép được ${label}`);
        }
      },
    });
  };

  return (
    <Modal data-testid="pair-modal" title={customer ? `Ghép màn hình khách · ${station?.name}` : "Ghép màn hình gọi số"} open onCancel={onClose} footer={null} destroyOnHidden>
      <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 14 }}>
        Mở app ở chế độ {label} trên thiết bị: màn hình hiện mã 6 số (hết hạn sau 5 phút). Nhập hoặc dán mã vào đây.
      </div>
      <PairingCodeInput value={code} onChange={(c) => { setCode(c); setError(null); }} />
      <Input data-testid="pair-device-name" style={{ marginTop: 14 }} value={deviceName} maxLength={150} onChange={(e) => setDeviceName(e.target.value)} placeholder="Tên máy (tuỳ chọn), VD: Tablet khách quầy 1" />
      {customer && replaced && (
        <div data-testid="pair-warning" style={{ marginTop: 12, fontSize: 13, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "8px 12px" }}>
          Ghép máy mới sẽ thu hồi <b>{replaced.name ?? "màn hình khách hiện tại"}</b> (mỗi quầy tối đa một màn hình khách).
        </div>
      )}
      {error && (
        <div data-testid="pair-error" style={{ marginTop: 12, fontSize: 13, color: palette.error.text }}>
          {error}
        </div>
      )}
      <ActionButton type="primary" block style={{ marginTop: 16 }} disabled={!isPairingCode(code)} data-testid="pair-submit" onClick={submit}>
        Ghép {label}
      </ActionButton>
    </Modal>
  );
}

/** Sửa tên và máy in của một quầy (#27). Trạng thái đổi bằng nút "Ngừng dùng/Dùng lại" ở dòng quầy. Chỉ gửi trường đã đổi. */
function EditStationModal({ station, existing, onClose, onSubmit }: { station: Station | null; existing: Station[]; onClose: () => void; onSubmit: (patch: StationPatch) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [connection, setConnection] = useState<PrinterConnection>("NONE");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (station) {
      setName(station.name);
      setConnection(station.printerConnection);
      setAddress(station.printerAddress ?? "");
    }
  }, [station]);

  if (!station) return <Modal open={false} footer={null} />;
  const next = { name, printerConnection: connection, printerAddress: connection === "NONE" ? undefined : address };
  const errors = validateStationPatch(station, next, existing);
  const patch: StationPatch = {};
  if (name.trim() !== station.name) patch.name = name.trim();
  const addressNow = connection === "NONE" ? null : address.trim();
  if (connection !== station.printerConnection || addressNow !== station.printerAddress) {
    patch.printerConnection = connection;
    if (connection !== "NONE") patch.printerAddress = address;
  }
  const changed = Object.keys(patch).length > 0;
  const label = (text: string) => <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "14px 0 6px" }}>{text}</div>;

  return (
    <Modal data-testid="edit-station-modal" title={`Sửa quầy · ${station.name}`} open onCancel={onClose} footer={null} destroyOnHidden>
      {label("Tên quầy")}
      <Input data-testid="edit-station-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
      {label("Máy in")}
      <Radio.Group data-testid="edit-station-connection" value={connection} onChange={(e) => setConnection(e.target.value as PrinterConnection)} optionType="button">
        {(["NONE", "WIFI", "BLUETOOTH"] as PrinterConnection[]).map((c) => (
          <Radio.Button key={c} value={c}>
            {c === "NONE" ? "Không khai báo" : c === "WIFI" ? "WiFi" : "Bluetooth"}
          </Radio.Button>
        ))}
      </Radio.Group>
      {connection !== "NONE" && (
        <>
          {label(connection === "WIFI" ? "Địa chỉ IP (có thể kèm cổng)" : "Địa chỉ MAC")}
          <Input data-testid="edit-station-address" value={address} maxLength={255} onChange={(e) => setAddress(e.target.value)} />
        </>
      )}
      {errors.length > 0 && (
        <ul data-testid="edit-station-errors" style={{ margin: "12px 0 0", paddingLeft: 18, color: palette.error.text, fontSize: 12.5 }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <ActionButton
        type="primary"
        block
        style={{ marginTop: 16 }}
        loading={saving}
        disabled={!changed || errors.length > 0 || saving}
        data-testid="edit-station-save"
        onClick={async () => {
          setSaving(true);
          try {
            if (await onSubmit(patch)) onClose();
          } finally {
            setSaving(false);
          }
        }}
      >
        Lưu thay đổi
      </ActionButton>
    </Modal>
  );
}

function AddStationModal({ open, existing, onClose, onSubmit }: { open: boolean; existing: Station[]; onClose: () => void; onSubmit: (input: StationInput) => Promise<void> }) {
  const [name, setName] = useState("");
  const [connection, setConnection] = useState<PrinterConnection>("NONE");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setConnection("NONE");
      setAddress("");
    }
  }, [open]);

  const input: StationInput = { name, printerConnection: connection, printerAddress: connection === "NONE" ? undefined : address };
  const errors = useMemo(() => (open && (name || address) ? validateStationInput(input, existing) : []), [open, name, address, connection, existing]);
  const canSave = !!name.trim() && validateStationInput(input, existing).length === 0 && !saving;

  const label = (text: string) => <div style={{ fontSize: 12.5, fontWeight: 600, color: palette.textMuted, margin: "14px 0 6px" }}>{text}</div>;

  return (
    <Modal title="Thêm quầy" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      {label("Tên quầy")}
      <Input data-testid="station-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="VD: Quầy 1" />

      {label("Máy in")}
      <Radio.Group data-testid="station-connection" value={connection} onChange={(e) => setConnection(e.target.value as PrinterConnection)} optionType="button">
        {(["NONE", "WIFI", "BLUETOOTH"] as PrinterConnection[]).map((c) => (
          <Radio.Button key={c} value={c} data-testid={`station-conn-${c}`}>
            {c === "NONE" ? "Không khai báo" : c === "WIFI" ? "WiFi" : "Bluetooth"}
          </Radio.Button>
        ))}
      </Radio.Group>

      {connection !== "NONE" && (
        <>
          {label(connection === "WIFI" ? "Địa chỉ IP (có thể kèm cổng)" : "Địa chỉ MAC")}
          <Input
            data-testid="station-address"
            value={address}
            maxLength={255}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={connection === "WIFI" ? "192.168.1.50 hoặc 192.168.1.50:9100" : "AA:BB:CC:DD:EE:FF"}
          />
          {connection === "BLUETOOTH" && (
            <div data-testid="station-bt-note" style={{ fontSize: 12, color: palette.textSubtle, marginTop: 6 }}>
              Theo đặc tả (11.10), Bluetooth được chọn trên tablet POS từ máy đã ghép; BE hiện bắt buộc có địa chỉ nên tạm nhập MAC ở đây (api-contract-plan #34).
            </div>
          )}
        </>
      )}

      {errors.length > 0 && (
        <ul data-testid="station-errors" style={{ margin: "12px 0 0", paddingLeft: 18, color: palette.error.text, fontSize: 12.5 }}>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <ActionButton
        type="primary"
        block
        style={{ marginTop: 16 }}
        loading={saving}
        disabled={!canSave}
        data-testid="station-save"
        onClick={async () => {
          setSaving(true);
          try {
            await onSubmit({ ...input, name: name.trim() });
          } finally {
            setSaving(false);
          }
        }}
      >
        Tạo quầy
      </ActionButton>
    </Modal>
  );
}
