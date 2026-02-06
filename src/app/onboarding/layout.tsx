import { AtmosphericBackground } from "@/components/shared/atmospheric-background";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <AtmosphericBackground intensity="full" />
      <div className="relative z-10 w-full max-w-lg px-6">{children}</div>
    </div>
  );
}
