import Hero from "./Hero";
import Logo from "./Logo";
import CtaButton from "./CtaButton";
import ProblemSection from "./ProblemSection";
import HowItWorks from "./HowItWorks";
import Differentiators from "./Differentiators";
import RoleCards from "./RoleCards";
import MultiBranchDashboard from "./MultiBranchDashboard";
import FitSection from "./FitSection";
import PricingSection from "./PricingSection";
import FaqSection from "./FaqSection";
import SignupForm from "./SignupForm";
import Footer from "./Footer";

type LandingPageProps = {
  onGoToLogin: () => void;
};

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onGoToLogin}
              className="hidden text-sm text-zinc-500 transition-colors hover:text-zinc-900 sm:inline"
            >
              Đã có tài khoản? Đăng nhập
            </button>
            <CtaButton className="px-4 py-2" />
          </div>
        </div>
      </header>

      <Hero />
      <ProblemSection />
      <HowItWorks />
      <Differentiators />
      <RoleCards />
      <MultiBranchDashboard />
      <FitSection />
      <PricingSection />
      <FaqSection />
      <SignupForm />
      <Footer />
    </div>
  );
}
