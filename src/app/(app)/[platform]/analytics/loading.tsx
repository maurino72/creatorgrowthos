import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="w-full" data-testid="analytics-loading">
      {/* Masthead */}
      <div className="flex items-end justify-between">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/40 bg-card/30 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-7 rounded-md" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-28 mt-2" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <div className="rounded-lg border border-border/40 bg-card/30 p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="rounded-lg border border-border/40 bg-card/30 p-5">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>

      {/* Table placeholder */}
      <div className="rounded-lg border border-border/40 bg-card/30 p-5">
        <Skeleton className="h-4 w-48 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
