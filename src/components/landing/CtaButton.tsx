type CtaButtonProps = {
  className?: string;
  variant?: "default" | "inverted";
};

export default function CtaButton({ className = "", variant = "default" }: CtaButtonProps) {
  const scrollToForm = () => {
    document.getElementById("signup-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const style =
    variant === "inverted"
      ? { backgroundColor: "#ffffff", color: "var(--brand-primary)" }
      : { backgroundColor: "var(--brand-primary)", color: "#ffffff" };

  return (
    <button
      type="button"
      onClick={scrollToForm}
      className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 ${className}`}
      style={style}
    >
      Nộp hồ sơ đăng ký
    </button>
  );
}
