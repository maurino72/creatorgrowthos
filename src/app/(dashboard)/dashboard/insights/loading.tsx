import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="mx-auto max-w-3xl" data-testid="insights-loading">
      <Skeleton className="h-8 w-32" />
      <div className="h-px bg-editorial-rule mt-4 mb-8" />
      <div className="flex items-center gap-6 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="py-4 space-y-2">
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
