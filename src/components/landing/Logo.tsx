import { UtensilsCrossed } from "lucide-react";

type LogoProps = {
  inverted?: boolean;
  className?: string;
};

export default function Logo({ inverted = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
        style={{ backgroundColor: inverted ? "#ffffff" : "var(--brand-primary)" }}
      >
        <UtensilsCrossed size={22} color={inverted ? "var(--brand-primary)" : "#ffffff"} strokeWidth={1.75} />
      </div>
      <span
        className="text-lg font-bold"
        style={{ color: inverted ? "#ffffff" : "var(--brand-ink)" }}
      >
        Smart F&amp;B
      </span>
    </div>
  );
}
