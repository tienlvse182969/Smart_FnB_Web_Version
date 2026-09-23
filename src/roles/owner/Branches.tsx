import { Alert, App, Button, Card, Drawer, Input, Select, Spin } from "antd";
import { Hash, MapPin, Plus, Table2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { Branch } from "../../types";
import { useAppStore } from "../../store";
import { describeBranchError, type ApiBranch } from "../../services/branchApi";
import { listTables } from "../../services/tablesApi";
import { PROVINCE_OPTIONS, isKnownProvince } from "../../constants/provinces";
import type { BranchFormData } from "../../store";

function BranchCard({
  b,
  code,
  tableCount,
  onEdit,
}: {
  b: Branch;
  code: string;
  tableCount: number;
  onEdit: () => void;
}) {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{b.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#71717a", fontSize: 13, marginTop: 4 }}>
            <MapPin size={14} /> {b.address || "—"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#71717a", fontSize: 13, marginTop: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Hash size={14} /> {code}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Table2 size={14} /> {tableCount} bàn
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Users size={14} /> {b.phone || "—"}
            </span>
          </div>
        </div>
        <span
          style={{
            background: b.status === "open" ? "#e7f7ec" : "#f4f4f5",
            color: b.status === "open" ? "#0a0a0a" : "#71717a",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {b.status === "open" ? "Đang mở cửa" : b.status === "closed" ? "Đóng cửa" : "Tạm ngưng"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <Button size="small" onClick={onEdit}>
          Sửa chi nhánh
        </Button>
      </div>
    </Card>
  );
}

/** OW-01: CRUD chi nhánh — chặn ở service khi vượt maxBranches của gói (BR-23). */
export default function Branches() {
  const { message } = App.useApp();
  const branches = useAppStore((s) => s.branches);
  const apiBranches = useAppStore((s) => s.apiBranches);
  const plan = useAppStore((s) => s.plan);
  const quotas = useAppStore((s) => s.quotas);
  const scopeStatus = useAppStore((s) => s.scopeStatus);
  const scopeError = useAppStore((s) => s.scopeError);
  const createBranch = useAppStore((s) => s.createBranch);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  // Số bàn lấy thật, mỗi chi nhánh một lượt gọi. Chi nhánh nào đọc lỗi thì
  // hiện 0 thay vì làm hỏng cả danh sách.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      branches.map(async (b) => {
        try {
          return [b.id, (await listTables(b.id)).length] as const;
        } catch {
          return [b.id, 0] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setTableCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [branches]);

  const codeById = Object.fromEntries(apiBranches.map((b) => [b.id, b.code]));
  const branchQuota = quotas.find((q) => q.resource === "branches");

  if (scopeStatus === "loading" || scopeStatus === "idle") {
    return (
      <div style={{ display: "grid", placeItems: "center", padding: 60 }}>
        <Spin tip="Đang tải chi nhánh…" />
      </div>
    );
  }

  if (scopeStatus === "error") {
    return <Alert type="error" showIcon message="Không tải được danh sách chi nhánh" description={scopeError} />;
  }

  return (
    <div>
      <SectionHeader
        onAdd={() => setEditing("new")}
        quotaLabel={
          branchQuota && plan
            ? `Gói ${plan.name} · đã dùng ${branchQuota.used}/${branchQuota.limit} chi nhánh`
            : null
        }
        addDisabled={!!branchQuota && branchQuota.remaining <= 0}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {branches.map((b) => (
          <BranchCard
            key={b.id}
            b={b}
            code={codeById[b.id] ?? "—"}
            tableCount={tableCounts[b.id] ?? 0}
            onEdit={() => setEditing(b)}
          />
        ))}
      </div>

      <BranchDrawer
        branch={editing}
        existing={editing && editing !== "new" ? apiBranches.find((b) => b.id === editing.id) : undefined}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          setSaving(true);
          try {
            if (editing === "new") {
              await createBranch(data);
              message.success("Đã tạo chi nhánh mới");
            } else if (editing) {
              await updateBranch(editing.id, data);
              message.success("Đã cập nhật chi nhánh");
            }
            setEditing(null);
          } catch (err) {
            message.error(describeBranchError(err));
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}

function SectionHeader({
  onAdd,
  quotaLabel,
  addDisabled,
}: {
  onAdd: () => void;
  quotaLabel: string | null;
  addDisabled: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Chi nhánh</div>
        <div style={{ fontSize: 12.5, color: "#71717a", marginTop: 2 }}>
          {quotaLabel ?? "Mỗi chi nhánh có sơ đồ bàn, menu và nhân viên riêng"}
        </div>
      </div>
      <Button
        type="primary"
        icon={<Plus size={15} />}
        onClick={onAdd}
        title={addDisabled ? "Đã dùng hết số chi nhánh của gói hiện tại" : undefined}
      >
        Thêm chi nhánh
      </Button>
    </div>
  );
}

function BranchDrawer({
  branch,
  existing: apiBranch,
  saving,
  onClose,
  onSave,
}: {
  branch: Branch | "new" | null;
  existing: ApiBranch | undefined;
  saving: boolean;
  onClose: () => void;
  onSave: (data: BranchFormData & { status?: "open" | "closed" | "suspended" }) => void;
}) {
  const isNew = branch === "new";
  const existing = isNew ? null : branch;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [ward, setWard] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [status, setStatus] = useState<"open" | "closed" | "suspended">("open");

  useEffect(() => {
    setCode(apiBranch?.code ?? "");
    setName(apiBranch?.name ?? "");
    setAddressLine1(apiBranch?.addressLine1 ?? "");
    setWard(apiBranch?.ward ?? "");
    // Chi nhánh cũ có thể mang tên tỉnh đã sáp nhập, hoặc mang chuỗi địa chỉ do
    // form một ô trước đây ghi đè. Không đoán — để trống và yêu cầu chọn lại.
    setCity(isKnownProvince(apiBranch?.city) ? (apiBranch?.city ?? "") : "");
    setPhone(apiBranch?.phone ?? "");
    setOpenTime("07:00");
    setCloseTime("22:00");
    setStatus(existing?.status ?? "open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, apiBranch]);

  const cityNeedsReview = !isNew && !!apiBranch && !isKnownProvince(apiBranch.city);

  return (
    <Drawer
      title={isNew ? "Thêm chi nhánh" : `Sửa chi nhánh · ${existing?.name}`}
      open={!!branch}
      onClose={onClose}
      styles={{ wrapper: { width: 420 }, body: { padding: 24 } }}
    >
      <Field label="Mã chi nhánh">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: HCM-Q10" />
      </Field>
      <Field label="Tên chi nhánh">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Chi nhánh Quận 10" />
      </Field>
      <Field label="Số nhà, tên đường">
        <Input
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="VD: 123 Nguyễn Huệ"
        />
      </Field>
      <Field label="Phường/Xã">
        <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="VD: Phường Bến Nghé" />
      </Field>
      <Field label="Tỉnh/Thành phố">
        <Select
          value={city || undefined}
          onChange={setCity}
          style={{ width: "100%" }}
          showSearch
          optionFilterProp="label"
          placeholder="Chọn tỉnh/thành phố"
          options={PROVINCE_OPTIONS}
          status={cityNeedsReview && !city ? "warning" : undefined}
        />
        {cityNeedsReview && !city && (
          <div style={{ fontSize: 12, color: "#9a640c", marginTop: 6 }}>
            Vui lòng chọn lại tỉnh/thành. Giá trị đang lưu (“{apiBranch?.city}”) không nằm trong danh
            sách 34 tỉnh/thành sau sáp nhập 2025.
          </div>
        )}
      </Field>
      <Field label="Số điện thoại">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      {/* Giờ mở/đóng chỉ gửi được lúc tạo — backend không trả lại hai trường
          này trong response chi nhánh, nên khi sửa thì ẩn đi. */}
      {isNew && (
        <>
          <Field label="Giờ mở cửa">
            <Input value={openTime} onChange={(e) => setOpenTime(e.target.value)} placeholder="07:00" />
          </Field>
          <Field label="Giờ đóng cửa">
            <Input value={closeTime} onChange={(e) => setCloseTime(e.target.value)} placeholder="22:00" />
          </Field>
        </>
      )}
      {!isNew && (
        <Field label="Trạng thái">
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: "100%" }}
            options={[
              { value: "open", label: "Đang mở cửa" },
              { value: "closed", label: "Đóng cửa" },
              { value: "suspended", label: "Tạm ngưng" },
            ]}
          />
        </Field>
      )}
      <Button
        type="primary"
        block
        loading={saving}
        style={{ marginTop: 8 }}
        disabled={!code.trim() || !name.trim() || !addressLine1.trim() || !city}
        onClick={() =>
          onSave({
            code: code.trim(),
            name: name.trim(),
            addressLine1: addressLine1.trim(),
            ward: ward.trim(),
            city,
            phone: phone.trim(),
            openTime,
            closeTime,
            status: isNew ? undefined : status,
          })
        }
      >
        {isNew ? "Tạo chi nhánh" : "Lưu thay đổi"}
      </Button>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#71717a", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
