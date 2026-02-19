import { AtmosphericBackground } from "@/components/shared/atmospheric-background";

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen justify-center overflow-hidden bg-background py-16 sm:py-20">
      <AtmosphericBackground intensity="subtle" />
      <div className="relative z-10 w-full max-w-5xl px-6">{children}</div>
    </div>
  );
}
