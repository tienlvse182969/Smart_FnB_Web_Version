type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export default function SectionHeading({ eyebrow, title, description, align = "left" }: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{eyebrow}</span>
      )}
      <h2 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: "var(--brand-ink)", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {description && <p className="mt-3 text-sm text-zinc-600 md:text-base">{description}</p>}
    </div>
  );
}
