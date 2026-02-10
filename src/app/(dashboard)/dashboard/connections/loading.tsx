import { Skeleton } from "@/components/ui/skeleton";

export default function ConnectionsLoading() {
  return (
    <div className="mx-auto max-w-3xl" data-testid="connections-loading">
      <Skeleton className="h-8 w-40" />
      <div className="h-px bg-editorial-rule mt-4 mb-8" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-5">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}
