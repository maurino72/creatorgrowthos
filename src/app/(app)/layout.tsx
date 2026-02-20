import { Suspense } from "react";
import { Sidebar } from "@/components/shared/sidebar";
import { AtmosphericBackground } from "@/components/shared/atmospheric-background";

function SidebarSkeleton() {
  return (
    <aside
      data-testid="sidebar-skeleton"
      className="relative z-20 hidden w-56 flex-shrink-0 flex-col border-r border-editorial-rule-subtle lg:flex bg-sidebar/60 backdrop-blur-sm"
    >
      {/* Logo placeholder */}
      <div className="px-5 pt-6 pb-4">
        <div className="h-6 w-28 rounded bg-muted/40 animate-pulse" />
      </div>
      <div className="mx-5 h-px bg-editorial-rule-subtle" />
      {/* Platform selector placeholder */}
      <div className="px-3 py-3">
        <div className="h-9 w-full rounded-md bg-muted/30 animate-pulse" />
      </div>
      <div className="mx-5 h-px bg-editorial-rule-subtle" />
      {/* Nav placeholders */}
      <div className="flex-1 px-3 pt-4">
        <div className="px-2.5 pb-2">
          <div className="h-2 w-14 rounded bg-muted/20 animate-pulse" />
        </div>
        <div className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
              <div className="size-4 rounded bg-muted/30 animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted/25 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* User placeholder */}
      <div className="px-3 py-3">
        <div className="mx-2 mb-3 h-px bg-editorial-rule-subtle" />
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div className="h-6 w-6 rounded-full bg-muted/40 animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
    </aside>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <AtmosphericBackground intensity="subtle" />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-8 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
