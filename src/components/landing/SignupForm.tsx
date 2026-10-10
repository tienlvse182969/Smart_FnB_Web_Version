import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { adminApi, loadPublicPlans, showApiError, type PublicPlan } from "../../api";
import { palette } from "../../theme";

type FormValues = {
  businessName: string;
  taxCode: string;
  headquartersAddress: string;
  representativeName: string;
  representativeEmail: string;
  representativePhone: string;
  requestedPlanId: string;
};

const initialValues: FormValues = {
  businessName: "",
  taxCode: "",
  headquartersAddress: "",
  representativeName: "",
  representativeEmail: "",
  representativePhone: "",
  requestedPlanId: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^0\d{9,10}$/;

export default function SignupForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const loadPlans = useCallback(async (force = false) => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      setPlans(await loadPublicPlans(force));
    } catch (err) {
      showApiError(setPlansError, err, "Không tải được danh sách gói");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const updateField = (field: keyof FormValues) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.businessName.trim()) nextErrors.businessName = "Vui lòng nhập tên doanh nghiệp";
    if (!values.taxCode.trim()) nextErrors.taxCode = "Vui lòng nhập mã số thuế";
    if (!values.headquartersAddress.trim()) nextErrors.headquartersAddress = "Vui lòng nhập địa chỉ trụ sở";
    if (!values.representativeName.trim()) {
      nextErrors.representativeName = "Vui lòng nhập họ tên người đại diện";
    }
    if (!emailPattern.test(values.representativeEmail.trim())) nextErrors.representativeEmail = "Email không hợp lệ";
    if (!phonePattern.test(values.representativePhone.trim())) nextErrors.representativePhone = "Số điện thoại không hợp lệ";
    if (!values.requestedPlanId) nextErrors.requestedPlanId = "Vui lòng chọn gói mong muốn";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      // TODO(BE): BE chưa nhận "số chi nhánh dự kiến" (đặc tả GU-01) — web bỏ ô này, không thu dữ liệu mà không gửi.
      await adminApi.submitRegistration({
        businessName: values.businessName.trim(),
        taxCode: values.taxCode.trim() || undefined,
        representativeName: values.representativeName.trim(),
        representativeEmail: values.representativeEmail.trim(),
        representativePhone: values.representativePhone.trim(),
        headquartersAddress: values.headquartersAddress.trim() || undefined,
        requestedPlanId: values.requestedPlanId,
      });
      setSubmitted(true);
    } catch (err) {
      showApiError(setSubmitError, err, "Không gửi được hồ sơ");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="signup-form" className="py-20 md:py-28" style={{ backgroundColor: palette.paperSubtle }}>
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <CheckCircle2 className="h-6 w-6 text-white" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-bold md:text-3xl" style={{ color: "var(--fnb-ink)" }}>
            Hồ sơ của bạn đang chờ duyệt
          </h2>
          <p className="mt-4 text-sm text-zinc-600 md:text-base">
            Đội ngũ sẽ liên hệ trong 1–2 ngày làm việc để xác nhận gói và kích hoạt tài khoản.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="signup-form" className="py-20 md:py-28" style={{ backgroundColor: palette.paperSubtle }}>
      <div className="mx-auto max-w-2xl px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Bắt đầu</span>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: "var(--fnb-ink)" }}>
          Nộp hồ sơ đăng ký
        </h2>
        <p className="mt-3 text-sm text-zinc-600">
          Sau khi nhận hồ sơ, đội ngũ liên hệ trong 1–2 ngày làm việc để xác nhận gói và kích hoạt
          tài khoản.
        </p>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-[14px] border border-zinc-200 bg-white p-6 sm:p-8"
        >
          <Field
            id="businessName"
            label="Tên doanh nghiệp"
            value={values.businessName}
            onChange={updateField("businessName")}
            error={errors.businessName}
          />
          <Field
            id="taxCode"
            label="Mã số thuế"
            value={values.taxCode}
            onChange={updateField("taxCode")}
            error={errors.taxCode}
          />
          <Field
            id="headquartersAddress"
            label="Địa chỉ trụ sở"
            value={values.headquartersAddress}
            onChange={updateField("headquartersAddress")}
            error={errors.headquartersAddress}
          />
          <Field
            id="representativeName"
            label="Họ tên người đại diện"
            value={values.representativeName}
            onChange={updateField("representativeName")}
            error={errors.representativeName}
          />
          <Field
            id="representativeEmail"
            label="Email người đại diện"
            type="email"
            value={values.representativeEmail}
            onChange={updateField("representativeEmail")}
            error={errors.representativeEmail}
          />
          <Field
            id="representativePhone"
            label="Số điện thoại người đại diện"
            type="tel"
            value={values.representativePhone}
            onChange={updateField("representativePhone")}
            error={errors.representativePhone}
          />

          <div>
            <label htmlFor="requestedPlanId" className="block text-sm font-medium text-zinc-700">
              Gói dịch vụ mong muốn
            </label>
            <select
              id="requestedPlanId"
              name="requestedPlanId"
              value={values.requestedPlanId}
              onChange={(event) => setValues((prev) => ({ ...prev, requestedPlanId: event.target.value }))}
              disabled={plansLoading || plans.length === 0}
              aria-invalid={Boolean(errors.requestedPlanId)}
              aria-describedby={errors.requestedPlanId ? "requestedPlanId-error" : "requestedPlanId-help"}
              className="mt-1.5 block min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base focus:border-zinc-400 focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500 sm:text-sm"
              style={{ color: "var(--fnb-ink)" }}
            >
              <option value="">{plansLoading ? "Đang tải danh sách gói…" : "Chọn gói dịch vụ"}</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {plan.maxBranches} chi nhánh · {plan.maxAccounts} tài khoản
                </option>
              ))}
            </select>
            {errors.requestedPlanId ? (
              <p id="requestedPlanId-error" className="mt-1.5 text-xs text-red-600">
                {errors.requestedPlanId}
              </p>
            ) : (
              <p id="requestedPlanId-help" className="mt-1.5 text-xs text-zinc-500">
                Admin sẽ xác nhận lại gói và thời hạn khi duyệt hồ sơ.
              </p>
            )}
            {plansError && (
              <div role="alert" className="mt-2 text-sm text-red-600">
                {plansError}{" "}
                <button type="button" className="min-h-11 font-medium underline" onClick={() => void loadPlans(true)}>
                  Thử lại
                </button>
              </div>
            )}
          </div>

          {submitError && (
            <p role="alert" className="text-sm" style={{ color: palette.error.text }}>
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || plansLoading || plans.length === 0}
            className="w-full rounded-lg px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {submitting ? "Đang gửi…" : "Nộp hồ sơ đăng ký"}
          </button>
        </form>
      </div>
    </section>
  );
}

type FieldProps = {
  id: keyof FormValues;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
};

function Field({ id, label, value, onChange, error, type = "text" }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-1.5 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
        style={{ color: "var(--fnb-ink)" }}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
