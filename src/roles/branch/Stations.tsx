import { App, Card, Input, Modal, Radio, Table, Tag, Tooltip } from "antd";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PRINTER_CONNECTION_LABEL, type PrinterConnection, type Station, type StationInput } from "../../types";
import { showApiError, stationsApi, validateStationInput } from "../../api";
import ActionButton from "../../plan/ActionButton";
import { SectionTitle } from "../../components/bits";
import { formatDateTime } from "../../lib/reportFormat";
import { useAppStore } from "../../store";
import { palette } from "../../theme";

const PENDING_BE = "Chờ BE (api-contract-plan #27)";

/**
 * BM-01: quầy và máy in của chi nhánh (đặc tả 11.10). Real `GET/POST /stations`. Đổi tên, ngừng dùng, sửa máy in chưa có ở BE
 * (#27) nên các nút bị khoá. Không giới hạn số quầy (Khánh đã chốt). Hết hạn gói thì chỉ đọc (ActionButton).
 */
export default function Stations() {
  const { message, modal } = App.useApp();
  const branchId = useAppStore((s) => s.currentBranchId);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

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
  }, [branchId, message]);

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
      <div data-testid="stations-pending-note" style={{ fontSize: 12.5, color: palette.warning.text, background: palette.paperSubtle, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
        Đổi tên, ngừng dùng quầy và sửa máy in {PENDING_BE.toLowerCase()} — hiện chỉ tạo và xem được. Ghép/thu hồi màn hình khách làm ở bước sau.
      </div>
      <Table<Station>
        dataSource={stations}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        scroll={{ x: 820 }}
        locale={{ emptyText: <span data-testid="stations-empty">Chưa có quầy nào — thêm quầy để thu ngân chọn khi đăng nhập POS</span> }}
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
            render: () => (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {["Đổi tên", "Ngừng dùng", "Sửa máy in"].map((label) => (
                  <Tooltip key={label} title={PENDING_BE}>
                    <span style={{ display: "inline-block" }}>
                      <ActionButton size="small" disabled data-testid="station-pending-action">
                        {label}
                      </ActionButton>
                    </span>
                  </Tooltip>
                ))}
              </div>
            ),
          },
        ]}
      />
      <AddStationModal open={adding} existing={stations} onClose={() => setAdding(false)} onSubmit={create} />
    </Card>
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
