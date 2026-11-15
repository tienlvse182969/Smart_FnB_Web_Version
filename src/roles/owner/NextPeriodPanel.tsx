import { Alert, App, Button, Checkbox, Input, InputNumber, Modal, Select, Skeleton, Tag } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { describeApiError, showApiError } from "../../api";
import { ApiError } from "../../api/http/errors";
import { supportNextPeriodApi, type KeepCandidates, type NextDraft, type NextInvoicePreview, type NextPeriodInput } from "../../api/subscriptionSchedule";
import { formatDateVN, formatVnd } from "../../lib/reportFormat";
import { addonViolation, computeLimits, MAX_ACCOUNT_PACKS, MAX_TOTAL_BRANCHES, type PricingPlan } from "../../lib/subscriptionPricing";
import { palette } from "../../theme";
import type { ServicePlan } from "../../types";

export interface NextPeriodAdapter {
  preview: (draft?: NextDraft) => Promise<NextInvoicePreview>;
  candidates: () => Promise<KeepCandidates>;
  save: (input: NextPeriodInput & { clear?: boolean; note?: string }) => Promise<NextInvoicePreview>;
}

/** Platform Staff / Admin register for a customer (BR-74): same panel, note required, audited by BE. */
export function supportAdapter(basePath: "/platform-staff" | "/admin", businessId: string): NextPeriodAdapter {
  const api = supportNextPeriodApi(basePath, businessId);
  return {
    preview: async (draft) => (await api.load(draft)).preview,
    candidates: async () => (await api.load()).candidates,
    save: (input) => api.save({ ...input, note: input.note ?? "" }),
  };
}

type Selection = { planId?: string; extraBranches: number; accountPacks: number };

const asPricing = (plan: ServicePlan): PricingPlan => ({
  id: plan.id,
  code: plan.code,
  name: plan.name,
  monthlyPrice: Number(plan.monthlyPrice),
  maxBranches: plan.maxBranches,
  maxAccounts: plan.maxAccounts,
  extraBranchPrice: Number(plan.extraBranchPrice ?? 0),
  extraBranchAccounts: Number(plan.extraBranchAccounts ?? 8),
  extraAccountPackPrice: Number(plan.extraAccountPackPrice ?? 0),
  extraBranchEnabled: !!plan.extraBranchEnabled,
  isActive: plan.isActive,
});

/** BR-11: what the selected limits force out, given what is ticked to keep. */
export function keepPlan(candidates: KeepCandidates, limits: { branchLimit: number; accountLimit: number }, keepBranchIds: string[], keepAccountIds: string[]) {
  const branchNeeded = candidates.branches.length > limits.branchLimit;
  const keptBranches = new Set(branchNeeded ? keepBranchIds : candidates.branches.map((b) => b.id));
  const activeIds = new Set(candidates.branches.map((b) => b.id));
  const followers = candidates.accounts.filter((a) => activeIds.has(a.branchId) && !keptBranches.has(a.branchId));
  const pool = candidates.accounts.filter((a) => !followers.includes(a));
  const capacity = Math.max(0, limits.accountLimit - candidates.owners);
  const accountNeeded = pool.length > capacity;
  const keptAccounts = new Set(accountNeeded ? keepAccountIds.filter((id) => pool.some((a) => a.id === id)) : pool.map((a) => a.id));
  return {
    branchNeeded,
    accountNeeded,
    needed: branchNeeded || accountNeeded,
    suspendedBranches: candidates.branches.filter((b) => !keptBranches.has(b.id)),
    lockedAccounts: candidates.accounts.filter((a) => !keptAccounts.has(a.id)),
    followers,
    pool,
    capacity,
    branchOk: !branchNeeded || (keepBranchIds.length <= limits.branchLimit && keepBranchIds.length > 0),
    accountOk: !accountNeeded || keptAccounts.size <= capacity,
  };
}

/**
 * Gói và phần mua thêm cho kỳ tới (31.4): xem trước hoá đơn nhiều dòng, khoá nút khi vi phạm BR-92 kèm gợi ý nâng gói,
 * bước chọn chi nhánh/tài khoản được giữ khi hạn mức kỳ tới nhỏ hơn số đang dùng (BR-11). Kỳ hiện tại không đổi.
 */
export default function NextPeriodPanel({ adapter, catalog, requireNote = false, onSaved }: { adapter: NextPeriodAdapter; catalog: ServicePlan[]; requireNote?: boolean; onSaved?: (preview: NextInvoicePreview) => void | Promise<void> }) {
  const { message } = App.useApp();
  const [preview, setPreview] = useState<NextInvoicePreview | null>(null);
  const [selection, setSelection] = useState<Selection>({ extraBranches: 0, accountPacks: 0 });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [candidates, setCandidates] = useState<KeepCandidates | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [keepBranchIds, setKeepBranchIds] = useState<string[]>([]);
  const [keepAccountIds, setKeepAccountIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const paidPlans = useMemo(() => catalog.filter((p) => p.isActive && p.code !== "TRIAL" && Number(p.monthlyPrice) > 0), [catalog]);
  const pricing = useMemo(() => paidPlans.map(asPricing), [paidPlans]);

  const reset = useCallback((next: NextInvoicePreview) => {
    setPreview(next);
    setSelection({ planId: next.plan.id, extraBranches: next.extraBranches, accountPacks: next.accountPacks });
    setWarnings(next.warnings ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    adapter.preview().then((next) => { if (!cancelled) reset(next); }).catch((error) => { if (!cancelled) setLoadError(describeApiError(error)); });
    return () => { cancelled = true; };
  }, [adapter, reset, reloadKey]);

  const plan = pricing.find((p) => p.id === selection.planId) ?? (preview ? asPricing(preview.plan) : null);
  const violation = plan ? addonViolation(plan, selection, pricing) : null;
  const limits = plan ? computeLimits(plan, selection) : null;
  const lines = plan
    ? [
        { kind: "PLAN", label: `Gói ${plan.name}`, qty: 1, unit: plan.monthlyPrice },
        ...(selection.extraBranches ? [{ kind: "EXTRA_BRANCH", label: `Thêm chi nhánh (kèm ${plan.extraBranchAccounts} tài khoản)`, qty: selection.extraBranches, unit: plan.extraBranchPrice }] : []),
        ...(selection.accountPacks ? [{ kind: "ACCOUNT_PACK", label: "Thêm 5 tài khoản", qty: selection.accountPacks, unit: plan.extraAccountPackPrice }] : []),
      ]
    : [];
  const total = lines.reduce((sum, line) => sum + line.qty * line.unit, 0);
  const startsAt = preview ? formatDateVN(preview.startsAt) : "";
  const unchanged = !!preview && selection.planId === preview.plan.id && selection.extraBranches === preview.extraBranches && selection.accountPacks === preview.accountPacks;
  const noteOk = !requireNote || note.trim().length >= 3;

  const changePlan = async (planId: string) => {
    setSelection((current) => ({ ...current, planId }));
    try {
      // BE carries add-ons over (upgrade drops extra branches, downgrade trims them, 31.5) and says why.
      const draft = await adapter.preview({ planId, accountPacks: selection.accountPacks });
      setSelection({ planId, extraBranches: draft.extraBranches, accountPacks: draft.accountPacks });
      setWarnings(draft.warnings ?? []);
    } catch (error) { showApiError(message.error, error, "Không tính được hoá đơn kỳ tới"); }
  };

  const submit = async (input: NextPeriodInput & { clear?: boolean }) => {
    setBusy(true);
    try {
      const saved = await adapter.save({ ...input, ...(requireNote ? { note: note.trim() } : {}) });
      reset(saved);
      setKeepOpen(false);
      setNote("");
      message.success(input.clear ? "Đã huỷ đăng ký kỳ tới" : `Đã lưu đăng ký kỳ tới — áp dụng từ ${formatDateVN(saved.startsAt)}`);
      await onSaved?.(saved);
    } catch (error) {
      const body = error instanceof ApiError ? (error.body as { error?: string } | undefined) : undefined;
      const code = error instanceof ApiError ? (error.code ?? body?.error) : undefined;
      // Usage changed since the page loaded (BR-11): reopen the selection with fresh candidates.
      if ((code === "KEEP_SELECTION_REQUIRED" || code === "KEEP_LIST_TOO_LONG") && !keepOpen) await openKeep();
      showApiError(message.error, error, "Không lưu được đăng ký kỳ tới");
    } finally { setBusy(false); }
  };

  const openKeep = async () => {
    const list = await adapter.candidates();
    setCandidates(list);
    const preKeptBranches = preview?.keepBranchIds ?? list.branches.slice(0, limits?.branchLimit ?? 0).map((b) => b.id);
    setKeepBranchIds(preKeptBranches.filter((id) => list.branches.some((b) => b.id === id)));
    setKeepAccountIds(preview?.keepAccountIds ?? list.accounts.map((a) => a.id));
    setKeepOpen(true);
  };

  const register = async () => {
    if (!limits || violation) return;
    const list = candidates ?? (await adapter.candidates().catch(() => null));
    if (list) setCandidates(list);
    const plan = list ? keepPlan(list, limits, preview?.keepBranchIds ?? [], preview?.keepAccountIds ?? []) : null;
    if (plan?.needed) { await openKeep(); return; }
    await submit({ planId: selection.planId, extraBranches: selection.extraBranches, accountPacks: selection.accountPacks });
  };

  const keep = candidates && limits ? keepPlan(candidates, limits, keepBranchIds, keepAccountIds) : null;

  if (loadError && !preview) {
    return (
      <Alert
        showIcon
        type="error"
        data-testid="next-load-error"
        message="Không tải được kỳ thuê bao tiếp theo"
        description={loadError}
        action={<Button size="small" onClick={() => setReloadKey((n) => n + 1)}>Thử lại</Button>}
      />
    );
  }
  if (!preview || !plan || !limits) return <div data-testid="next-loading"><Skeleton active paragraph={{ rows: 4 }} /></div>;
  return (
    <div style={{ display: "grid", gap: 12 }} data-testid="next-period">
      <div style={{ color: palette.textMuted, fontSize: 13.5 }}>
        Áp dụng từ <b data-testid="next-starts">{startsAt}</b>. Kỳ hiện tại giữ nguyên gói, tính năng và hạn mức; thanh toán sớm không mở hạn mức trước ngày này.
      </div>
      {preview.upcomingPaid && (
        <Alert showIcon type="success" message={`Kỳ ${formatDateVN(preview.upcomingPaid.startsAt)} – ${formatDateVN(preview.upcomingPaid.endsAt)} đã thanh toán: gói ${preview.upcomingPaid.plan.name}, ${preview.upcomingPaid.branchLimit} chi nhánh, ${preview.upcomingPaid.accountLimit} tài khoản — chỉ có hiệu lực từ ${formatDateVN(preview.upcomingPaid.startsAt)}. Đăng ký dưới đây áp dụng cho kỳ sau đó.`} />
      )}
      {preview.registered && preview.registeredByRole && preview.registeredByRole !== "BRAND_MANAGER" && (
        <Alert showIcon type="info" message="Nền tảng đã đổi đăng ký kỳ tới theo yêu cầu của bạn." />
      )}
      <Alert
        showIcon
        type={preview.registered ? "info" : "warning"}
        data-testid="next-registered"
        message={`${preview.registered ? "Đã đăng ký" : "Chưa đăng ký thay đổi"} — kỳ tới: ${preview.plan.name}, ${preview.branchLimit} chi nhánh, ${preview.accountLimit} tài khoản, ${formatVnd(preview.total)}/tháng, từ ${startsAt}`}
        description={preview.violation ? `Đăng ký hiện có không còn hợp lệ với giá mới (${preview.violation.message}); vẫn được giữ, chỉ chặn đăng ký mới.` : undefined}
      />

      <label>Gói kỳ tới</label>
      <Select
        value={selection.planId}
        onChange={(value) => void changePlan(value)}
        options={paidPlans.map((item) => ({ value: item.id, label: `${item.name} · ${formatVnd(Number(item.monthlyPrice))}/tháng · ${item.maxBranches} chi nhánh · ${item.maxAccounts} tài khoản` }))}
        data-testid="next-plan-select"
      />
      <label>Thêm chi nhánh cho kỳ tới (mỗi chi nhánh kèm {plan.extraBranchAccounts} tài khoản, {formatVnd(plan.extraBranchPrice)}/chi nhánh)</label>
      <InputNumber
        min={0}
        max={Math.max(0, MAX_TOTAL_BRANCHES - plan.maxBranches)}
        disabled={!plan.extraBranchEnabled}
        value={selection.extraBranches}
        onChange={(value) => setSelection((current) => ({ ...current, extraBranches: value ?? 0 }))}
        style={{ width: "100%" }}
        data-testid="next-extra-branches"
      />
      <label>Gói thêm 5 tài khoản ({formatVnd(plan.extraAccountPackPrice)}/gói, tối đa {MAX_ACCOUNT_PACKS})</label>
      <InputNumber min={0} max={MAX_ACCOUNT_PACKS} value={selection.accountPacks} onChange={(value) => setSelection((current) => ({ ...current, accountPacks: value ?? 0 }))} style={{ width: "100%" }} data-testid="next-account-packs" />

      <div style={{ border: `1px solid ${palette.line}`, borderRadius: 10, padding: 12 }} data-testid="next-lines">
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Hoá đơn kỳ tới (tạm tính)</div>
        {lines.map((line) => (
          <div key={line.kind} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
            <span>{line.label} × {line.qty} · {formatVnd(line.unit)}</span>
            <span>{formatVnd(line.qty * line.unit)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 6 }}>
          <span>Tổng · {limits.branchLimit} chi nhánh · {limits.accountLimit} tài khoản</span>
          <span data-testid="next-total">{formatVnd(total)}</span>
        </div>
      </div>
      {warnings.map((text) => <Alert key={text} type="warning" showIcon message={text} />)}
      {violation && (
        <Alert
          type="error"
          showIcon
          data-testid="next-violation"
          message={violation.message}
          action={"suggestedPlan" in violation ? (
            <Button size="small" onClick={() => setSelection((current) => ({ ...current, planId: violation.suggestedPlan.id, extraBranches: 0 }))}>
              Chọn gói {violation.suggestedPlan.name}
            </Button>
          ) : undefined}
        />
      )}
      {requireNote && (
        <Input.TextArea placeholder="Ghi chú yêu cầu của khách (bắt buộc)" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={1000} data-testid="next-note" />
      )}
      <Button type="primary" loading={busy} disabled={!!violation || unchanged || !noteOk} onClick={() => void register()} data-testid="next-save">
        Đăng ký cho kỳ tới
      </Button>
      {preview.registered && (
        <Button loading={busy} disabled={!noteOk} onClick={() => void submit({ clear: true })} data-testid="next-clear">
          Huỷ đăng ký kỳ tới
        </Button>
      )}

      <Modal
        title="Chọn phần được giữ cho kỳ tới"
        open={keepOpen}
        onCancel={() => setKeepOpen(false)}
        okText="Xác nhận đăng ký"
        okButtonProps={{ disabled: !keep || !keep.branchOk || !keep.accountOk || !noteOk, loading: busy, "data-testid": "keep-confirm" } as never}
        onOk={() => void submit({ planId: selection.planId, extraBranches: selection.extraBranches, accountPacks: selection.accountPacks, keepBranchIds: keep?.branchNeeded ? keepBranchIds : undefined, keepAccountIds: keep?.accountNeeded ? keepAccountIds.filter((id) => keep.pool.some((a) => a.id === id)) : undefined })}
        destroyOnHidden
      >
        {candidates && keep && (
          <div style={{ display: "grid", gap: 12 }} data-testid="keep-modal">
            <div style={{ fontSize: 13.5 }}>Hạn mức kỳ tới: <b>{limits.branchLimit} chi nhánh, {limits.accountLimit} tài khoản</b> (gồm {candidates.owners} Brand Manager, luôn được giữ).</div>
            {keep.branchNeeded && (
              <div>
                <b>Chi nhánh được giữ: {keepBranchIds.length}/{limits.branchLimit}</b>
                {keepBranchIds.length > limits.branchLimit && <Tag color="red" style={{ marginLeft: 8 }}>Bỏ bớt {keepBranchIds.length - limits.branchLimit}</Tag>}
                <Checkbox.Group style={{ display: "grid", marginTop: 6 }} value={keepBranchIds} onChange={(values) => setKeepBranchIds(values as string[])} options={candidates.branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))} />
              </div>
            )}
            {keep.accountNeeded && (
              <div>
                <b>Tài khoản nhân viên được giữ: {keepAccountIds.filter((id) => keep.pool.some((a) => a.id === id)).length}/{keep.capacity}</b>
                <Checkbox.Group style={{ display: "grid", marginTop: 6, maxHeight: 260, overflow: "auto" }} value={keepAccountIds} onChange={(values) => setKeepAccountIds(values as string[])} options={keep.pool.map((a) => ({ value: a.id, label: `${a.name} · ${a.role} · ${a.branchName}` }))} />
              </div>
            )}
            <Alert
              type="warning"
              showIcon
              data-testid="keep-summary"
              message={`Từ ${startsAt}: ${keep.suspendedBranches.length ? `chi nhánh ${keep.suspendedBranches.map((b) => b.name).join(", ")} tạm ngưng` : "không chi nhánh nào tạm ngưng"}, ${keep.lockedAccounts.length} tài khoản bị khoá${keep.followers.length ? ` (gồm ${keep.followers.length} tài khoản thuộc chi nhánh tạm ngưng)` : ""}. Dữ liệu giữ nguyên; mở lại được khi còn hạn mức.`}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
