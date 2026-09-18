import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitRegistration } from "../../services";

type FormValues = {
  businessName: string;
  taxCode: string;
  address: string;
  branchCount: string;
  representativeName: string;
  email: string;
  phone: string;
};

const initialValues: FormValues = {
  businessName: "",
  taxCode: "",
  address: "",
  branchCount: "",
  representativeName: "",
  email: "",
  phone: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^0\d{9,10}$/;

export default function SignupForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field: keyof FormValues) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.businessName.trim()) nextErrors.businessName = "Vui lòng nhập tên doanh nghiệp";
    if (!values.taxCode.trim()) nextErrors.taxCode = "Vui lòng nhập mã số thuế";
    if (!values.address.trim()) nextErrors.address = "Vui lòng nhập địa chỉ";
    if (!values.branchCount.trim() || Number(values.branchCount) <= 0) {
      nextErrors.branchCount = "Vui lòng nhập số chi nhánh dự kiến lớn hơn 0";
    }
    if (!values.representativeName.trim()) {
      nextErrors.representativeName = "Vui lòng nhập họ tên người đại diện";
    }
    if (!emailPattern.test(values.email.trim())) nextErrors.email = "Email không hợp lệ";
    if (!phonePattern.test(values.phone.trim())) nextErrors.phone = "Số điện thoại không hợp lệ";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await submitRegistration({
        businessName: values.businessName.trim(),
        taxCode: values.taxCode.trim(),
        address: values.address.trim(),
        estimatedBranches: Number(values.branchCount),
        contactName: values.representativeName.trim(),
        contactEmail: values.email.trim(),
        contactPhone: values.phone.trim(),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="signup-form" className="py-20 md:py-28" style={{ backgroundColor: "#fafafa" }}>
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <CheckCircle2 className="h-6 w-6 text-white" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-bold md:text-3xl" style={{ color: "var(--brand-ink)" }}>
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
    <section id="signup-form" className="py-20 md:py-28" style={{ backgroundColor: "#fafafa" }}>
      <div className="mx-auto max-w-2xl px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Bắt đầu</span>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: "var(--brand-ink)" }}>
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
            id="address"
            label="Địa chỉ"
            value={values.address}
            onChange={updateField("address")}
            error={errors.address}
          />
          <Field
            id="branchCount"
            label="Số chi nhánh dự kiến"
            type="number"
            value={values.branchCount}
            onChange={updateField("branchCount")}
            error={errors.branchCount}
          />
          <Field
            id="representativeName"
            label="Họ tên người đại diện"
            value={values.representativeName}
            onChange={updateField("representativeName")}
            error={errors.representativeName}
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={values.email}
            onChange={updateField("email")}
            error={errors.email}
          />
          <Field
            id="phone"
            label="Số điện thoại"
            type="tel"
            value={values.phone}
            onChange={updateField("phone")}
            error={errors.phone}
          />

          <button
            type="submit"
            disabled={submitting}
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
        style={{ color: "var(--brand-ink)" }}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
