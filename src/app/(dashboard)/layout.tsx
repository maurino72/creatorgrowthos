import { Suspense } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { AtmosphericBackground } from "@/components/shared/atmospheric-background";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <AtmosphericBackground intensity="subtle" />
      <Suspense>
        <Sidebar />
      </Suspense>
      <main className="relative z-10 flex-1 overflow-y-auto px-6 py-8 lg:px-12 lg:py-10">
        {children}
      </main>
    </div>
  );
}
