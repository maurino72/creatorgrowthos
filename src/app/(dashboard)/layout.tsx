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
      <main className="relative z-10 flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
