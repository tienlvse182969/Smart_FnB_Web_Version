import PlatformLogo from "../brand/PlatformLogo";

type LogoProps = {
  /** true = đặt trên nền tối (logo trắng). */
  inverted?: boolean;
  className?: string;
};

export default function Logo({ inverted = false, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <PlatformLogo variant="wordmark" tone={inverted ? "light" : "dark"} height={44} />
    </div>
  );
}
