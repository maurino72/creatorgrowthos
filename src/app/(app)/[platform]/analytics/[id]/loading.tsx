import { Skeleton } from "@/components/ui/skeleton";

export default function PostAnalyticsLoading() {
  return (
    <div className="w-full" data-testid="post-analytics-loading">
      <Skeleton className="h-4 w-32 mb-6" />
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-5 w-full mb-8" />
      <div className="h-px bg-editorial-rule mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/40 bg-card/30 p-4"
          >
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border/40 bg-card/30 p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-52 w-full" />
      </div>
    </div>
  );
}
